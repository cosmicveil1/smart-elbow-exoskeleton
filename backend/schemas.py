from datetime import datetime
from typing import Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

# --- Patient Session Schemas ---
class PatientSessionBase(BaseModel):
    patient_id: str
    session_name: Optional[str] = None
    notes: Optional[str] = None

class PatientSessionCreate(PatientSessionBase):
    pass

class PatientSessionResponse(PatientSessionBase):
    id: int
    started_at: datetime

    class Config:
        from_attributes = True

# --- Elbow Data Schemas ---
class ElbowDataBase(BaseModel):
    session_id: int
    target_angle: float
    angle_degrees: float
    error: float
    motor_status: int
    raw_data: Optional[str] = None

class ElbowDataCreate(ElbowDataBase):
    pass

class ElbowDataResponse(ElbowDataBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True