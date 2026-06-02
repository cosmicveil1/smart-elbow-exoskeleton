from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

try:
    from ..database import Base
except ImportError:
    from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False) # "doctor", "patient", "engineer"
    full_name = Column(String, nullable=False)
    clinical_info = Column(String, nullable=True) # specific to patients

    # Relationships
    sessions = relationship("PatientSession", back_populates="patient", cascade="all, delete-orphan")
    prescribed_exercises = relationship("PatientExercise", foreign_keys="[PatientExercise.patient_id]", back_populates="patient", cascade="all, delete-orphan")
    assigned_exercises = relationship("PatientExercise", foreign_keys="[PatientExercise.assigned_by]", back_populates="doctor", cascade="all, delete-orphan")
