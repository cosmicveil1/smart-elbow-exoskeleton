from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

try:
    from ..database import Base
except ImportError:
    from database import Base

class PatientSession(Base):
    __tablename__ = "patient_sessions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    patient_exercise_id = Column(Integer, ForeignKey("patient_exercises.id", ondelete="SET NULL"), nullable=True)
    session_name = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(String, nullable=True)

    # Relationships
    patient = relationship("User", back_populates="sessions")
    patient_exercise = relationship("PatientExercise", back_populates="sessions")
    telemetry_data = relationship("ElbowData", back_populates="session", cascade="all, delete-orphan")
