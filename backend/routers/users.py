from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
try:
    from ..database import get_db
    from .. import schemas, services
    from .auth import get_current_user
except ImportError:
    from database import get_db
    import schemas
    import services
    from auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user (Doctor, Patient, or Engineer)"""
    db_user = services.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return services.create_user(db=db, user=user)

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user = Depends(get_current_user)):
    """Get active user profile"""
    return current_user

@router.get("/patients", response_model=list[schemas.UserResponse])
def read_patients(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get all registered patients (Doctor/Engineer view)"""
    if current_user.role not in ["doctor", "engineer"]:
        raise HTTPException(status_code=403, detail="Not authorized to view patients list")
    return services.get_users_by_role(db, role="patient")
