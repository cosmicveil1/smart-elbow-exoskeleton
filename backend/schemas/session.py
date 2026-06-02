from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PatientSessionBase(BaseModel):
    patient_id: int
    patient_exercise_id: Optional[int] = None
    session_name: Optional[str] = None
    notes: Optional[str] = None

class PatientSessionCreate(PatientSessionBase):
    pass

class PatientSessionResponse(PatientSessionBase):
    id: int
    started_at: datetime

    class Config:
        from_attributes = True
