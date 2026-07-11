from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
# pyrefly: ignore [missing-import]
from sqlalchemy.sql import func

try:
    from ..database import Base
except ImportError:
    from database import Base

class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    joint = Column(String, default="Elbow") # Wrist, Shoulder, Elbow
    mode = Column(String, nullable=False) # "position", "force", "torque"
    target_angle = Column(Float, nullable=False) # degrees
    target_value = Column(Float, nullable=False) # target force/torque/etc
    duration_seconds = Column(Integer, nullable=False) 

class PatientExercise(Base):
    __tablename__ = "patient_exercises"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="assigned") # "assigned", "in_progress", "completed"
    completion_percentage = Column(Float, default=0.0)
    target_cycles = Column(Integer, nullable=False, default=1)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="prescribed_exercises")
    doctor = relationship("User", foreign_keys=[assigned_by], back_populates="assigned_exercises")
    exercise = relationship("Exercise")
    sessions = relationship("PatientSession", back_populates="patient_exercise")
