"""
DroidCam / IP Camera connector.

Pulls JPEG snapshots from a DroidCam (or any MJPEG/snapshot IP camera)
at a configurable interval, runs each frame through the gesture-detection
and face-recognition pipeline, and broadcasts alerts to the nurse dashboard.

Endpoints:
    POST /api/droidcam/connect     – start pulling from a DroidCam feed
    POST /api/droidcam/disconnect  – stop pulling
    GET  /api/droidcam/active      – list active DroidCam feeds
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
import asyncio
import logging
import urllib.request
import time

from uuid import UUID

from ...cv.detector import GestureDetector
from ...cv.gesture_classifier import PatientGestureClassifier
from ...cv.face_recognizer import FaceRecognizer
from ..dependencies import get_detector, get_patient, get_patient_classifier, get_face_recognizer
from ...services import patient_service
from ...services.notification import send_nurse_notification
from ...db.session import SessionLocal

# Re-use the nurse broadcast manager from websocket module
from .websocket import manager as ws_manager

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Active DroidCam tasks ─────────────────────────────────────────────────────
# patient_id -> { task, stream_url, started_at, frames_processed }
_active_feeds: Dict[str, dict] = {}


# ── Request / Response schemas ────────────────────────────────────────────────

class DroidCamConnectRequest(BaseModel):
    patient_id: str
    stream_url: str                      # e.g. http://192.168.1.50:4747/video
    frame_interval_ms: Optional[int] = 500  # pull a frame every N ms

class DroidCamStatus(BaseModel):
    patient_id: str
    stream_url: str
    started_at: float
    frames_processed: int
    status: str  # "running" | "stopped" | "error"


# ── Core: pull frames from DroidCam and run the AI pipeline ───────────────────

async def _pull_droidcam_frames(
    patient_id: str,
    stream_url: str,
    interval_s: float,
):
    """
    Background coroutine that repeatedly fetches a JPEG snapshot from the
    DroidCam HTTP endpoint and feeds it through the AI pipeline.
    """
    import numpy as np

    # Resolve snapshot URL from DroidCam
    # DroidCam exposes:
    #   /video      – MJPEG stream (can't easily fetch single frames)
    #   /shot.jpg   – single JPEG snapshot (ideal for us)
    #   /mjpegfeed  – another MJPEG alias
    # We normalise to /shot.jpg for reliable single-frame capture.
    snapshot_url = stream_url.rstrip("/")
    if snapshot_url.endswith("/video") or snapshot_url.endswith("/mjpegfeed"):
        snapshot_url = snapshot_url.rsplit("/", 1)[0] + "/shot.jpg"
    elif not snapshot_url.endswith(".jpg"):
        snapshot_url = snapshot_url + "/shot.jpg"

    # ── Load AI components ────────────────────────────────────────────
    detector = GestureDetector()
    recognizer = FaceRecognizer()

    try:
        patient_uuid = UUID(patient_id)
    except ValueError:
        logger.error(f"DroidCam: invalid patient UUID {patient_id}")
        return

    try:
        patient = await get_patient(patient_uuid)
    except Exception:
        patient = None

    classifier = await get_patient_classifier(patient_uuid) if patient else None

    # Face embedding
    stored_embedding = None
    face_threshold = 0.75
    face_calibrated = False

    if patient and patient.face_calibrated and patient.face_embedding:
        stored_embedding = FaceRecognizer.embedding_from_list(patient.face_embedding)
        face_threshold = patient.face_similarity_threshold or 0.75
        face_calibrated = True

    logger.info(
        f"DroidCam feed started: patient={patient.name if patient else patient_id}, "
        f"url={snapshot_url}, interval={interval_s}s"
    )

    frame_count = 0
    IDENTITY_LOG_EVERY = 10

    while patient_id in _active_feeds:
        try:
            # ── Fetch JPEG snapshot from DroidCam ─────────────────────
            req = urllib.request.Request(snapshot_url)
            req.add_header("User-Agent", "VisionCare-AI/1.0")
            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: urllib.request.urlopen(req, timeout=5)
            )
            frame_data = response.read()
            frame_count += 1
            _active_feeds[patient_id]["frames_processed"] = frame_count

            # ── ① Face Recognition ────────────────────────────────────
            identity_matched = True
            similarity = 1.0

            if face_calibrated and stored_embedding is not None:
                live_embedding = await asyncio.to_thread(recognizer.extract_embedding, frame_data)
                identity_matched, similarity = recognizer.is_match(
                    live_embedding, stored_embedding, threshold=face_threshold
                )
                if not identity_matched:
                    if frame_count % IDENTITY_LOG_EVERY == 0:
                        logger.info(f"DroidCam [{patient_id}]: unknown person (sim={similarity:.2f})")
                    await asyncio.sleep(interval_s)
                    continue

            # ── ② Gesture Recognition ─────────────────────────────────
            metrics = await asyncio.to_thread(detector.extract_metrics, frame_data)
            if metrics and classifier and patient:
                result = classifier.process_frame(metrics)

                if result:
                    gesture_type, need_type, confidence = result

                    db = SessionLocal()
                    try:
                        detection = patient_service.create_detection(
                            db=db,
                            patient_id=patient_uuid,
                            gesture_type=gesture_type,
                            need_type=need_type,
                            confidence=confidence,
                        )

                        # Determine camera_id
                        camera_id = None
                        try:
                            from ...models.camera import Camera
                            cam = db.query(Camera).filter(Camera.patient_id == patient_id).first()
                            if cam:
                                camera_id = str(cam.id)
                        except Exception:
                            pass

                        priority = (
                            "high" if need_type.value in ["pain", "emergency"]
                            else "medium" if need_type.value in ["water", "nurse", "washroom"]
                            else "low"
                        )

                        await ws_manager.broadcast_to_ward(
                            patient.ward_id,
                            {
                                "type": "new_request",
                                "patient_id": patient_id,
                                "patient_name": patient.name,
                                "bed_number": patient.bed_number,
                                "camera_id": camera_id or f"DROIDCAM-{patient.bed_number}",
                                "need": need_type.value,
                                "gesture_type": gesture_type.value,
                                "confidence": confidence,
                                "priority": priority,
                                "face_similarity": round(similarity, 3),
                                "timestamp": detection.created_at.isoformat(),
                                "request_id": str(detection.id),
                                "source": "droidcam",
                            },
                        )

                        await send_nurse_notification(patient.ward_id, detection)
                        logger.info(
                            f"DroidCam [{patient_id}] ALERT: {gesture_type.value} → {need_type.value} "
                            f"(confidence={confidence:.2f})"
                        )
                    except Exception as exc:
                        logger.error(f"DroidCam [{patient_id}] detection save error: {exc}")
                    finally:
                        db.close()

        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning(f"DroidCam [{patient_id}] frame error: {exc}")
            _active_feeds.get(patient_id, {}).get("status", "error")
            if patient_id in _active_feeds:
                _active_feeds[patient_id]["status"] = "error"
            # Wait longer on error to avoid tight error loops
            await asyncio.sleep(max(interval_s, 2.0))
            continue

        await asyncio.sleep(interval_s)

    logger.info(f"DroidCam feed stopped: patient={patient_id}, frames={frame_count}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/connect", response_model=DroidCamStatus)
async def connect_droidcam(req: DroidCamConnectRequest):
    """Start pulling frames from a DroidCam feed for a specific patient."""

    # Validate patient ID
    try:
        UUID(req.patient_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid patient_id UUID")

    # Disconnect existing feed for this patient
    if req.patient_id in _active_feeds:
        old = _active_feeds.pop(req.patient_id)
        task = old.get("task")
        if task and not task.done():
            task.cancel()

    # Test connectivity first
    snapshot_test_url = req.stream_url.rstrip("/")
    if snapshot_test_url.endswith("/video") or snapshot_test_url.endswith("/mjpegfeed"):
        snapshot_test_url = snapshot_test_url.rsplit("/", 1)[0] + "/shot.jpg"
    elif not snapshot_test_url.endswith(".jpg"):
        snapshot_test_url = snapshot_test_url + "/shot.jpg"

    try:
        test_req = urllib.request.Request(snapshot_test_url)
        test_req.add_header("User-Agent", "VisionCare-AI/1.0")
        test_resp = await asyncio.get_event_loop().run_in_executor(
            None, lambda: urllib.request.urlopen(test_req, timeout=5)
        )
        if test_resp.status != 200:
            raise HTTPException(status_code=502, detail=f"DroidCam returned status {test_resp.status}")
        logger.info(f"DroidCam connectivity OK: {snapshot_test_url}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Cannot reach DroidCam at {snapshot_test_url}: {exc}. "
                   f"Make sure DroidCam is running and your phone is on the same Wi-Fi network."
        )

    interval_s = max(req.frame_interval_ms / 1000.0, 0.1)  # minimum 100ms

    # Register and start background task
    feed_info = {
        "stream_url": req.stream_url,
        "started_at": time.time(),
        "frames_processed": 0,
        "status": "running",
        "task": None,
    }
    _active_feeds[req.patient_id] = feed_info

    task = asyncio.create_task(
        _pull_droidcam_frames(req.patient_id, req.stream_url, interval_s)
    )
    feed_info["task"] = task

    # Update camera record in DB
    db = SessionLocal()
    try:
        from ...models.camera import Camera
        cam = db.query(Camera).filter(Camera.patient_id == req.patient_id).first()
        if cam:
            cam.ip_address = req.stream_url
            cam.status = "online"
            db.commit()
    except Exception:
        pass
    finally:
        db.close()

    return DroidCamStatus(
        patient_id=req.patient_id,
        stream_url=req.stream_url,
        started_at=feed_info["started_at"],
        frames_processed=0,
        status="running",
    )


@router.post("/disconnect")
async def disconnect_droidcam(patient_id: str):
    """Stop pulling frames for a patient."""
    if patient_id not in _active_feeds:
        raise HTTPException(status_code=404, detail="No active DroidCam feed for this patient")

    feed = _active_feeds.pop(patient_id)
    task = feed.get("task")
    if task and not task.done():
        task.cancel()

    # Update camera record
    db = SessionLocal()
    try:
        from ...models.camera import Camera
        cam = db.query(Camera).filter(Camera.patient_id == patient_id).first()
        if cam:
            cam.status = "offline"
            db.commit()
    except Exception:
        pass
    finally:
        db.close()

    return {"status": "disconnected", "patient_id": patient_id, "frames_processed": feed["frames_processed"]}


@router.get("/active", response_model=list[DroidCamStatus])
async def list_active_feeds():
    """List all currently active DroidCam feeds."""
    result = []
    for pid, info in _active_feeds.items():
        result.append(DroidCamStatus(
            patient_id=pid,
            stream_url=info["stream_url"],
            started_at=info["started_at"],
            frames_processed=info["frames_processed"],
            status=info.get("status", "running"),
        ))
    return result
