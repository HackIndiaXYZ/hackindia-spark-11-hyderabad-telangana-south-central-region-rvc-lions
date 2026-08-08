from typing import Optional, Tuple, Dict, Any, List
import time
from ..models.gesture import GestureType, NeedType, GestureMapping

class PatientGestureClassifier:
    def __init__(self, mappings: List[GestureMapping], thresholds: Dict[str, float] = None, consecutive_frames: int = 15):
        self.mappings = mappings
        self.thresholds = thresholds or {}
        self.consecutive_frames = consecutive_frames
        
        # State tracking per gesture
        self.close_frames = 0
        self.open_mouth_frames = 0
        self.head_left_frames = 0
        self.head_right_frames = 0
        self.nod_frames = 0
        self.shake_frames = 0
        self.finger_frames: Dict[str, int] = {}
        
        # Double blink tracking
        self.blink_state = "open"  # "open", "closed"
        self.blink_frames = 0
        self.blinks_times: List[int] = []
        self.frame_counter = 0
        
        # Alert cooldown deduplication (avoid spamming the same alert within 15 seconds)
        self.last_triggered_gesture: Optional[str] = None
        self.last_triggered_time: float = 0.0
        self.cooldown_seconds: float = 12.0

    def process_frame(self, metrics: Dict[str, Any]) -> Optional[Tuple[GestureType, NeedType, float]]:
        self.frame_counter += 1
        ear = metrics.get("ear", 0.3)
        mar = metrics.get("mar", 0.2)
        yaw_ratio = metrics.get("yaw_ratio", 1.0)
        roll_angle = metrics.get("roll_angle", 0.0)
        finger_count = metrics.get("finger_count", None)
        nod_detected = metrics.get("nod_detected", False)
        shake_detected = metrics.get("shake_detected", False)
        
        # Get threshold overrides or use defaults
        ear_thresh = self.thresholds.get("ear_threshold", 0.21)
        mar_thresh = self.thresholds.get("mar_threshold", 0.6)
        
        detected_gesture: Optional[str] = None
        confidence = 0.95
        
        # 1. Check Finger Gestures if present
        if finger_count is not None and 1 <= finger_count <= 5:
            finger_key = f"finger_{['one','two','three','four','five'][finger_count - 1]}"
            self.finger_frames[finger_key] = self.finger_frames.get(finger_key, 0) + 1
            if self.finger_frames[finger_key] >= 8:
                detected_gesture = finger_key
        else:
            self.finger_frames = {}
            
        # 2. Check Nod (Yes) & Shake (No)
        if nod_detected:
            self.nod_frames += 1
            if self.nod_frames >= 5:
                detected_gesture = "nod_yes"
        else:
            self.nod_frames = 0
            
        if shake_detected:
            self.shake_frames += 1
            if self.shake_frames >= 5:
                detected_gesture = "shake_no"
        else:
            self.shake_frames = 0

        # 3. Check SUSTAINED_CLOSE
        if not detected_gesture:
            if ear < ear_thresh:
                self.close_frames += 1
                if self.close_frames == self.consecutive_frames:
                    detected_gesture = "sustained_close"
            else:
                self.close_frames = 0
                
        # 4. Check MOUTH_OPEN
        if not detected_gesture:
            if mar > mar_thresh:
                self.open_mouth_frames += 1
                if self.open_mouth_frames == self.consecutive_frames:
                    detected_gesture = "mouth_open"
            else:
                self.open_mouth_frames = 0
                
        # 5. Check HEAD_LEFT
        if not detected_gesture:
            if yaw_ratio > 1.35:
                self.head_left_frames += 1
                if self.head_left_frames == self.consecutive_frames:
                    detected_gesture = "head_left"
            else:
                self.head_left_frames = 0
                
        # 6. Check HEAD_RIGHT
        if not detected_gesture:
            if yaw_ratio < 0.65:
                self.head_right_frames += 1
                if self.head_right_frames == self.consecutive_frames:
                    detected_gesture = "head_right"
            else:
                self.head_right_frames = 0

        # 7. Check DOUBLE_BLINK
        if not detected_gesture:
            if ear < ear_thresh:
                if self.blink_state == "open":
                    self.blink_state = "closed"
                    self.blink_frames = 0
                self.blink_frames += 1
            else:
                if self.blink_state == "closed":
                    if 1 <= self.blink_frames <= 8:
                        self.blinks_times.append(self.frame_counter)
                        self.blinks_times = [t for t in self.blinks_times if self.frame_counter - t <= 30]
                        if len(self.blinks_times) >= 2:
                            detected_gesture = "double_blink"
                            self.blinks_times = []
                    self.blink_state = "open"
                    self.blink_frames = 0

        if detected_gesture:
            now = time.time()
            # Cooldown check to prevent spamming duplicate alerts
            if detected_gesture == self.last_triggered_gesture and (now - self.last_triggered_time) < self.cooldown_seconds:
                return None

            # Look up mapping
            for mapping in self.mappings:
                if mapping.gesture_type == detected_gesture and mapping.is_active:
                    self.last_triggered_gesture = detected_gesture
                    self.last_triggered_time = now
                    try:
                        g_type = GestureType(mapping.gesture_type)
                        n_type = NeedType(mapping.need_type)
                    except ValueError:
                        continue
                    return g_type, n_type, confidence
                    
        return None
