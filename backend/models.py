# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
# pyrefly: ignore [missing-import]
from sqlalchemy.sql import func

try:
    from .database import Base
except ImportError:
    from database import Base

class PatientSession(Base):
    __tablename__ = "patient_sessions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    session_name = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(String, nullable=True)

    # Relationship to ElbowData records
    telemetry_data = relationship("ElbowData", back_populates="session", cascade="all, delete-orphan")

class ElbowData(Base):
    __tablename__ = "elbow_data"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("patient_sessions.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    count = Column(Integer)
    angle_degrees = Column(Float)
    rotations = Column(Integer, default=0)
    raw_data = Column(String, nullable=True)

    # Relationship back to PatientSession
    session = relationship("PatientSession", back_populates="telemetry_data")