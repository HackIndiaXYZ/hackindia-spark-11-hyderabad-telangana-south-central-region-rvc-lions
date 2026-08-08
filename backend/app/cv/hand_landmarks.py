"""
Hand Landmark Utilities & Feature Extraction for MediaPipe Hands.

Hand Landmark Indices (21 Points):
    0:  WRIST
    1:  THUMB_CMC, 2: THUMB_MCP, 3: THUMB_IP, 4: THUMB_TIP
    5:  INDEX_FINGER_MCP, 6: INDEX_FINGER_PIP, 7: INDEX_FINGER_DIP, 8: INDEX_FINGER_TIP
    9:  MIDDLE_FINGER_MCP, 10: MIDDLE_FINGER_PIP, 11: MIDDLE_FINGER_DIP, 12: MIDDLE_FINGER_TIP
    13: RING_FINGER_MCP, 14: RING_FINGER_PIP, 15: RING_FINGER_DIP, 16: RING_FINGER_TIP
    17: PINKY_MCP, 18: PINKY_PIP, 19: PINKY_DIP, 20: PINKY_TIP
"""

import math
from typing import List, Dict, Any, Tuple

# Landmark Index Constants
WRIST = 0
THUMB_TIP = 4
INDEX_TIP = 8
MIDDLE_TIP = 12
RING_TIP = 16
PINKY_TIP = 20

THUMB_IP = 3
INDEX_PIP = 6
MIDDLE_PIP = 10
RING_PIP = 14
PINKY_PIP = 18

INDEX_MCP = 5
MIDDLE_MCP = 9
RING_MCP = 13
PINKY_MCP = 17


def distance_3d(p1: Tuple[float, float, float], p2: Tuple[float, float, float]) -> float:
    """Calculate 3D Euclidean distance between two points."""
    return math.sqrt(
        (p1[0] - p2[0]) ** 2 +
        (p1[1] - p2[1]) ** 2 +
        (p1[2] - p2[2]) ** 2
    )


def extract_finger_states(landmarks: List[Tuple[float, float, float]]) -> Dict[str, bool]:
    """
    Determines whether each of the 5 fingers is extended or curled.
    Returns dict: {'thumb': bool, 'index': bool, 'middle': bool, 'ring': bool, 'pinky': bool}
    """
    if not landmarks or len(landmarks) < 21:
        return {'thumb': False, 'index': False, 'middle': False, 'ring': False, 'pinky': False}

    wrist = landmarks[WRIST]

    # Thumb: compare tip distance to wrist vs IP joint distance to wrist
    thumb_extended = distance_3d(landmarks[THUMB_TIP], wrist) > distance_3d(landmarks[THUMB_IP], wrist)

    # Other 4 fingers: compare tip y to PIP joint y (in normalized image coords, smaller y = higher/extended)
    index_extended  = landmarks[INDEX_TIP][1] < landmarks[INDEX_PIP][1]
    middle_extended = landmarks[MIDDLE_TIP][1] < landmarks[MIDDLE_PIP][1]
    ring_extended   = landmarks[RING_TIP][1] < landmarks[RING_PIP][1]
    pinky_extended  = landmarks[PINKY_TIP][1] < landmarks[PINKY_PIP][1]

    return {
        'thumb': thumb_extended,
        'index': index_extended,
        'middle': middle_extended,
        'ring': ring_extended,
        'pinky': pinky_extended,
    }
