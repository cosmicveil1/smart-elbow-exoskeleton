from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

try:
    from ..database import Base
except ImportError:
    from database import Base

class ElbowData(Base):
    __tablename__ = "elbow_data"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("patient_sessions.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    count = Column(Integer)
    angle_degrees = Column(Float)
    rotations = Column(Integer, default=0)
    raw_data = Column(String, nullable=True)

    # Relationships
    session = relationship("PatientSession", back_populates="telemetry_data")
