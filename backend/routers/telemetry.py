from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
try:
    from ..database import get_db
    from .. import schemas, services
except ImportError:
    from database import get_db
    import schemas
    import services

router = APIRouter(prefix="/data", tags=["telemetry"])

@router.post("/", response_model=schemas.ElbowDataResponse)
def add_elbow_data(data: schemas.ElbowDataCreate, db: Session = Depends(get_db)):
    """Send telemetry data from Arduino/Collector"""
    db_session = services.get_session_by_id(db=db, session_id=data.session_id)
    if not db_session:
        raise HTTPException(status_code=400, detail="Invalid session_id. The specified session does not exist.")
    return services.create_elbow_data(db=db, data=data)

@router.get("/", response_model=list[schemas.ElbowDataResponse])
def read_elbow_data(session_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get telemetry data (optionally filtered by session_id)"""
    return services.get_elbow_data(db=db, session_id=session_id, skip=skip, limit=limit)
