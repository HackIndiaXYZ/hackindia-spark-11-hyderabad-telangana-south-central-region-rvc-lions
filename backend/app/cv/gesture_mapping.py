"""
Hand Gesture to Need Type Mapping for VisionCare AI.

Supported Hand Gestures:
    open_palm     -> Call Nurse
    thumbs_up     -> I'm OK
    thumbs_down   -> Need Assistance
    index_finger  -> Need Water
    two_fingers   -> Need Food
    three_fingers -> Need Medicine
    closed_fist   -> Emergency
    wave          -> Attention Needed
"""

from typing import Dict, Any

HAND_GESTURE_MAPPINGS: Dict[str, Dict[str, Any]] = {
    "open_palm": {
        "need": "nurse",
        "label": "Call Nurse",
        "icon": "✋",
        "priority": "medium",
        "description": "Patient opened full palm to request nurse attendance."
    },
    "thumbs_up": {
        "need": "ok",
        "label": "I'm OK",
        "icon": "👍",
        "priority": "low",
        "description": "Patient gave thumbs up indicating they are comfortable."
    },
    "thumbs_down": {
        "need": "assistance",
        "label": "Need Assistance",
        "icon": "👎",
        "priority": "medium",
        "description": "Patient gave thumbs down requesting assistance."
    },
    "index_finger": {
        "need": "water",
        "label": "Need Water",
        "icon": "☝️",
        "priority": "medium",
        "description": "Patient raised index finger to request water."
    },
    "two_fingers": {
        "need": "food",
        "label": "Need Food",
        "icon": "✌️",
        "priority": "medium",
        "description": "Patient raised two fingers to request food."
    },
    "three_fingers": {
        "need": "medicine",
        "label": "Need Medicine",
        "icon": "🤟",
        "priority": "high",
        "description": "Patient raised three fingers to request medicine."
    },
    "closed_fist": {
        "need": "emergency",
        "label": "Emergency",
        "icon": "✊",
        "priority": "high",
        "description": "Patient formed closed fist signalling an urgent emergency!"
    },
    "wave": {
        "need": "attention",
        "label": "Attention Needed",
        "icon": "👋",
        "priority": "medium",
        "description": "Patient waved hand for immediate attention."
    },
}

def get_hand_gesture_info(gesture_type: str) -> Dict[str, Any]:
    """Retrieve metadata and care need mapping for a hand gesture."""
    return HAND_GESTURE_MAPPINGS.get(gesture_type, {
        "need": "other",
        "label": gesture_type.replace("_", " ").title(),
        "icon": "🖐️",
        "priority": "medium",
        "description": f"Hand gesture {gesture_type} detected."
    })
