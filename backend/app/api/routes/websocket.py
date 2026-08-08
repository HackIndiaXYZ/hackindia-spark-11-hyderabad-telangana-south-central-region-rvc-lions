from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Set
import asyncio
import base64
import logging
from uuid import UUID

import numpy as np

logger = logging.getLogger(__name__)

from ...cv.detector import GestureDetector
from ...cv.gesture_classifier import PatientGestureClassifier
from ...cv.face_recognizer import FaceRecognizer
from ..dependencies import get_detector, get_patient, get_patient_classifier, get_face_recognizer
from ...services import patient_service
from ...services.notification import send_nurse_notification
from ...db.session import SessionLocal

router = APIRouter()

# Global AI semaphore: max 2 concurrent AI threads so HTTP stays responsive
_ai_semaphore = asyncio.Semaphore(2)

class ConnectionManager:
    def __init__(self):
        self.nurse_connections: Dict[str, Set[WebSocket]] = {}
        self.camera_connections: Dict[str, WebSocket] = {}

    async def connect_nurse(self, websocket: WebSocket, ward_id: str):
        await websocket.accept()
        if ward_id not in self.nurse_connections:
            self.nurse_connections[ward_id] = set()
        self.nurse_connections[ward_id].add(websocket)

    async def connect_camera(self, websocket: WebSocket, patient_id: str):
        await websocket.accept()
        self.camera_connections[patient_id] = websocket

    def disconnect_nurse(self, websocket: WebSocket, ward_id: str):
        if ward_id in self.nurse_connections:
            self.nurse_connections[ward_id].discard(websocket)

    async def broadcast_to_ward(self, ward_id: str, message: dict):
        if ward_id in self.nurse_connections:
            dead = set()
            for conn in self.nurse_connections[ward_id]:
                try:
                    await conn.send_json(message)
                except Exception:
                    dead.add(conn)
            self.nurse_connections[ward_id] -= dead

manager = ConnectionManager()

async def update_request_status(request_id: str, status: str, nurse_id: str):
    db = SessionLocal()
    try:
        return patient_service.update_request_status(db=db, request_id=UUID(request_id), status=status, nurse_id=nurse_id)
    finally:
        db.close()

@router.websocket("/ws/nurse/{ward_id}")
async def nurse_dashboard_websocket(websocket: WebSocket, ward_id: str):
    await manager.connect_nurse(websocket, ward_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "acknowledge":
                await update_request_status(request_id=data["request_id"], status=data["status"], nurse_id=data["nurse_id"])
    except (WebSocketDisconnect, Exception):
        manager.disconnect_nurse(websocket, ward_id)

@router.websocket("/ws/camera/{patient_id}")
async def camera_feed_websocket(
    websocket: WebSocket,
    patient_id: str,
    detector: GestureDetector = Depends(get_detector),
    recognizer: FaceRecognizer = Depends(get_face_recognizer),
):
    await manager.connect_camera(websocket, patient_id)

    try:
        patient_uuid = UUID(patient_id)
    except ValueError:
        try:
            await websocket.send_json({"type": "error", "detail": "Invalid patient UUID"})
            await websocket.close()
        except Exception:
            pass
        manager.camera_connections.pop(patient_id, None)
        return

    try:
        patient = await get_patient(patient_uuid)
    except Exception:
        patient = None

    classifier = await get_patient_classifier(patient_uuid) if patient else None

    stored_embedding = None
    face_threshold = 0.75
    face_calibrated = False

    if patient:
        if patient.face_calibrated and patient.face_embedding:
            stored_embedding = FaceRecognizer.embedding_from_list(patient.face_embedding)
            face_threshold = getattr(patient, "face_similarity_threshold", 0.75) or 0.75
            face_calibrated = True
            logger.info(f"Patient {patient.name}: face embedding loaded (threshold={face_threshold})")
        else:
            logger.warning(f"Patient {patient.name}: no face embedding - identity verification DISABLED")

    IDENTITY_REPORT_EVERY = 10
    AI_PROCESS_EVERY = 5
    frame_count = 0

    from ...cv.hand_detector import HandDetector as _HandDetector
    hand_det = _HandDetector()
    can_use_hands = bool(patient and getattr(patient, "can_use_hand_gestures", True))

    try:
        while True:
            raw = None
            raw_bytes = None
            try:
                raw = await websocket.receive_text()
            except WebSocketDisconnect:
                break
            except Exception:
                try:
                    raw_bytes = await websocket.receive_bytes()
                except WebSocketDisconnect:
                    break
                except Exception:
                    continue

            if raw is not None:
                try:
                    if "," in raw:
                        raw = raw.split(",", 1)[1]
                    frame_data = base64.b64decode(raw)
                except Exception:
                    continue
            elif raw_bytes is not None:
                frame_data = raw_bytes
            else:
                continue

            frame_count += 1
            if frame_count % AI_PROCESS_EVERY != 0:
                continue
            if _ai_semaphore.locked():
                continue

            async with _ai_semaphore:
                identity_matched = True
                similarity = 1.0

                if face_calibrated and stored_embedding is not None:
                    try:
                        live_embedding = await asyncio.to_thread(recognizer.extract_embedding, frame_data)
                        identity_matched, similarity = recognizer.is_match(live_embedding, stored_embedding, threshold=face_threshold)
                    except Exception as exc:
                        logger.debug(f"Face recognition error: {exc}")

                    if frame_count % IDENTITY_REPORT_EVERY == 0:
                        try:
                            await websocket.send_json({"type": "identity", "status": "matched" if identity_matched else "unknown", "similarity": round(similarity, 3), "threshold": face_threshold})
                        except Exception:
                            pass

                    if not identity_matched:
                        continue

                try:
                    metrics = await asyncio.to_thread(detector.extract_metrics, frame_data)
                except Exception:
                    metrics = None

                if metrics and classifier and patient:
                    result = classifier.process_frame(metrics)
                    if result:
                        gesture_type, need_type, confidence = result
                        gesture_str = gesture_type.value if hasattr(gesture_type, "value") else str(gesture_type)
                        need_str = need_type.value if hasattr(need_type, "value") else str(need_type)

                        def _save_facial():
                            db = SessionLocal()
                            try:
                                return patient_service.create_detection(db=db, patient_id=patient_uuid, gesture_type=gesture_str, need_type=need_str, confidence=confidence)
                            finally:
                                db.close()

                        try:
                            detection = await asyncio.to_thread(_save_facial)
                            priority = "high" if need_str in ["pain", "emergency"] else "medium" if need_str in ["water", "nurse", "washroom"] else "low"
                            await manager.broadcast_to_ward(patient.ward_id, {"type": "new_request", "patient_id": patient_id, "patient_name": patient.name, "bed_number": patient.bed_number, "camera_id": f"CAM-{patient.bed_number}", "need": need_str, "gesture_type": gesture_str, "confidence": confidence, "priority": priority, "face_similarity": round(similarity, 3), "timestamp": detection.created_at.isoformat(), "request_id": str(detection.id), "source": "facial_gesture"})
                            await send_nurse_notification(patient.ward_id, detection)
                        except Exception as exc:
                            logger.error(f"Error saving facial detection: {exc}")

                if can_use_hands:
                    try:
                        hand_res = await asyncio.to_thread(hand_det.detect_hand_gesture, frame_data)
                        if hand_res and patient:
                            hg = str(hand_res["gesture_type"])
                            hn = str(hand_res["need_type"])

                            def _save_hand():
                                db = SessionLocal()
                                try:
                                    return patient_service.create_detection(db=db, patient_id=patient_uuid, gesture_type=hg, need_type=hn, confidence=hand_res["confidence"])
                                finally:
                                    db.close()

                            hdet = await asyncio.to_thread(_save_hand)
                            await manager.broadcast_to_ward(patient.ward_id, {"type": "new_request", "patient_id": patient_id, "patient_name": patient.name, "bed_number": patient.bed_number, "camera_id": f"HAND-CAM-{patient.bed_number}", "need": hn, "gesture_type": hg, "label": hand_res.get("label", ""), "icon": hand_res.get("icon", "✋"), "confidence": hand_res["confidence"], "priority": hand_res.get("priority", "medium"), "timestamp": hdet.created_at.isoformat(), "request_id": str(hdet.id), "source": "hand_gesture"})
                    except Exception as exc:
                        logger.debug(f"Hand detection error: {exc}")

    except Exception as exc:
        logger.error(f"Camera WebSocket unexpected error for {patient_id}: {exc}")
    finally:
        manager.camera_connections.pop(patient_id, None)
        logger.info(f"Camera WebSocket closed for patient {patient_id}")
