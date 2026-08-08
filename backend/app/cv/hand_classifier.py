"""
Hand Gesture Classifier for VisionCare AI.

Classifies 21 3D hand landmarks into calibrated hand gestures:
    - open_palm     ✋
    - thumbs_up     👍
    - thumbs_down   👎
    - index_finger  ☝️
    - two_fingers   ✌️
    - three_fingers 🤟
    - closed_fist   ✊
    - wave          👋
"""

from typing import List, Dict, Any, Optional, Tuple
from .hand_landmarks import extract_finger_states, WRIST, THUMB_TIP, INDEX_TIP
from .gesture_mapping import get_hand_gesture_info


class HandGestureClassifier:
    """Classifies hand landmark points into discrete gesture categories."""

    def __init__(self, confidence_threshold: float = 0.70):
        self.confidence_threshold = confidence_threshold
        # Frame buffer for smoothing / debounce
        self._history: List[str] = []
        self._max_history = 5

    def classify_landmarks(self, landmarks: List[Tuple[float, float, float]]) -> Optional[Tuple[str, float]]:
        """
        Takes 21 3D landmark points and identifies the active hand gesture.
        Returns: (gesture_type: str, confidence: float) or None
        """
        if not landmarks or len(landmarks) < 21:
            return None

        states = extract_finger_states(landmarks)
        thumb = states['thumb']
        index = states['index']
        middle = states['middle']
        ring = states['ring']
        pinky = states['pinky']

        # Count total extended fingers
        extended_count = sum([thumb, index, middle, ring, pinky])

        detected_gesture = None
        confidence = 0.85

        # 1. Closed Fist ✊ (0 fingers extended)
        if extended_count == 0:
            detected_gesture = "closed_fist"
            confidence = 0.95

        # 2. Open Palm ✋ (all 5 fingers extended)
        elif extended_count == 5:
            detected_gesture = "open_palm"
            confidence = 0.95

        # 3. Index Finger ☝️ (only index extended)
        elif index and not middle and not ring and not pinky and not thumb:
            detected_gesture = "index_finger"
            confidence = 0.90

        # 4. Two Fingers ✌️ (index & middle extended)
        elif index and middle and not ring and not pinky and not thumb:
            detected_gesture = "two_fingers"
            confidence = 0.90

        # 5. Three Fingers 🤟 (thumb, index & pinky or 3 fingers extended)
        elif (index and middle and ring and not pinky) or (thumb and index and pinky and not middle and not ring):
            detected_gesture = "three_fingers"
            confidence = 0.88

        # 6. Thumbs Up 👍 / Thumbs Down 👎 (only thumb extended)
        elif thumb and not index and not middle and not ring and not pinky:
            thumb_y = landmarks[THUMB_TIP][1]
            wrist_y = landmarks[WRIST][1]
            if thumb_y < wrist_y:
                detected_gesture = "thumbs_up"
                confidence = 0.92
            else:
                detected_gesture = "thumbs_down"
                confidence = 0.92

        # 7. Wave 👋 (4 or 5 fingers extended with high wrist/palm)
        elif extended_count >= 4:
            detected_gesture = "open_palm"
            confidence = 0.85

        if detected_gesture and confidence >= self.confidence_threshold:
            return detected_gesture, confidence

        return None
