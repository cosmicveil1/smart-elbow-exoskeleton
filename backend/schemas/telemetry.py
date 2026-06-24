from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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
