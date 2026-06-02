from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ElbowDataBase(BaseModel):
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
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ElbowDataBase(BaseModel):
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