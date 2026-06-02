from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    username: str
    full_name: str
    role: str # "doctor", "patient", "engineer"
    clinical_info: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    user_id: int
