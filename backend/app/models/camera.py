from sqlalchemy import Column, String, Float, Integer, Uuid
import uuid

from .base import Base, TimestampMixin


class Camera(Base, TimestampMixin):
    __tablename__ = "cameras"
    __table_args__ = {'extend_existing': True}

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=True)           # e.g., "Bedside Camera 1", "Room 101 Mobile Cam"
    camera_code = Column(String(50), nullable=True, index=True) # e.g. "CAM-01", "CAM-102"
    hospital_id = Column(String(100), nullable=False, index=True)
    ward = Column(String(100), nullable=False)
    bed_number = Column(String(20), nullable=False)
    patient_id = Column(String(100), nullable=True)   # optional assignment
    patient_name = Column(String(255), nullable=True)
    ip_address = Column(String(50))
    status = Column(String(20), default="offline")   # online | offline | disconnected
    fps = Column(Float, default=0.0)
    network_latency = Column(Float, default=0.0)   # ms
    last_connected = Column(String(50))   # ISO timestamp string
    health_status = Column(String(20), default="unknown")  # healthy | degraded | critical | unknown
    is_active = Column(Integer, default=1)

    def __repr__(self):
        return f"<Camera {self.name or self.id} - Ward:{self.ward} Bed:{self.bed_number}>"
