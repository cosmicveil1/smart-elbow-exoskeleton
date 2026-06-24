from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CommandBase(BaseModel):
    patient_id: int
    command_type: str
    value: Optional[float] = None

class CommandCreate(CommandBase):
    pass

class CommandResponse(CommandBase):
    id: int
    status: str
    created_at: datetime
    executed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
