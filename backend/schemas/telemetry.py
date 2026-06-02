from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ElbowDataBase(BaseModel):
    session_id: int
    count: int
    angle_degrees: float
    rotations: Optional[int] = 0
    raw_data: Optional[str] = None

class ElbowDataCreate(ElbowDataBase):
    pass

class ElbowDataResponse(ElbowDataBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
