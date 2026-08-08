"""
Hand Gesture Detector using MediaPipe Hands / Holistic with smart fallback.
"""

import numpy as np
import logging
from typing import Optional, Dict, Any, List, Tuple
from .hand_classifier import HandGestureClassifier
from .gesture_mapping import get_hand_gesture_info

logger = logging.getLogger(__name__)

# Attempt to import MediaPipe
try:
    import mediapipe as mp
    MP_AVAILABLE = True
except ImportError:
    mp = None
    MP_AVAILABLE = False
    logger.info("MediaPipe not installed. HandDetector running in fallback simulation mode.")

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    CV2_AVAILABLE = False


class HandDetector:
    """
    Detects hand landmarks from video frame bytes and classifies hand gestures.
    Supports real MediaPipe Hands processing and mock scenario simulation.
    """

    def __init__(self, static_image_mode: bool = False, max_num_hands: int = 2):
        self.classifier = HandGestureClassifier()
        self.mock_mode = not MP_AVAILABLE or cv2 is None

        if MP_AVAILABLE and cv2 is not None:
            try:
                self.mp_hands = mp.solutions.hands
                self.hands = self.mp_hands.Hands(
                    static_image_mode=static_image_mode,
                    max_num_hands=max_num_hands,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
                self.mock_mode = False
                logger.info("Loaded MediaPipe Hands detector in Real Mode.")
            except Exception as e:
                logger.error(f"Error initializing MediaPipe Hands: {e}. Falling back to Mock Mode.")
                self.mock_mode = True

    # ── Mock scenario simulation counter ─────────────────────────────
    _mock_counter: int = 0
    _MOCK_HAND_GESTURES = [
        ("open_palm", 0.95),
        (None, 0.0),
        ("thumbs_up", 0.92),
        (None, 0.0),
        ("index_finger", 0.90),
        (None, 0.0),
        ("closed_fist", 0.96),
        (None, 0.0),
    ]

    def detect_hand_gesture(self, frame_bytes: bytes) -> Optional[Dict[str, Any]]:
        """
        Processes JPEG frame bytes and returns detected hand gesture details.
        Returns dict or None:
            {
                "gesture_type": "open_palm",
                "need_type": "nurse",
                "confidence": 0.95,
                "label": "Call Nurse",
                "icon": "✋",
                "priority": "medium",
                "landmarks_count": 21
            }
        """
        if self.mock_mode:
            # Cycle through mock scenarios every 25 frames
            self.__class__._mock_counter += 1
            idx = (self.__class__._mock_counter // 25) % len(self.__class__._MOCK_HAND_GESTURES)
            gesture_type, confidence = self.__class__._MOCK_HAND_GESTURES[idx]

            if gesture_type is None:
                return None

            info = get_hand_gesture_info(gesture_type)
            return {
                "gesture_type": gesture_type,
                "need_type": info["need"],
                "confidence": confidence,
                "label": info["label"],
                "icon": info["icon"],
                "priority": info["priority"],
                "landmarks_count": 21,
                "is_mock": True
            }

        # Real Mode with OpenCV + MediaPipe
        try:
            nparr = np.frombuffer(frame_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return None

            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            results = self.hands.process(img_rgb)

            if not results.multi_hand_landmarks:
                return None

            # Process primary hand
            first_hand = results.multi_hand_landmarks[0]
            landmarks = [(lm.x, lm.y, lm.z) for lm in first_hand.landmark]

            res = self.classifier.classify_landmarks(landmarks)
            if not res:
                return None

            gesture_type, confidence = res
            info = get_hand_gesture_info(gesture_type)

            return {
                "gesture_type": gesture_type,
                "need_type": info["need"],
                "confidence": confidence,
                "label": info["label"],
                "icon": info["icon"],
                "priority": info["priority"],
                "landmarks_count": len(landmarks),
                "is_mock": False
            }

        except Exception as e:
            logger.error(f"Error in detect_hand_gesture: {e}")
            return None
