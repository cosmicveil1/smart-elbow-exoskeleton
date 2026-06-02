from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExerciseBase(BaseModel):
    name: str
    description: Optional[str] = None
    mode: str # "position", "force", "torque"
    target_angle: float
    target_value: float
    duration_seconds: Optional[int] = 60

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseResponse(ExerciseBase):
    id: int

    class Config:
        from_attributes = True

class PatientExerciseBase(BaseModel):
    patient_id: int
    exercise_id: int
    status: Optional[str] = "assigned"
    completion_percentage: Optional[float] = 0.0

class PatientExerciseCreate(BaseModel):
    patient_id: int
    exercise_id: int

class PatientExerciseUpdate(BaseModel):
    status: Optional[str] = None
    completion_percentage: Optional[float] = None

class PatientExerciseResponse(PatientExerciseBase):
    id: int
    assigned_by: int
    assigned_at: datetime
    exercise: ExerciseResponse

    class Config:
        from_attributes = True
