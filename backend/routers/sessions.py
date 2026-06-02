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

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/", response_model=schemas.PatientSessionResponse)
def create_session(session: schemas.PatientSessionCreate, db: Session = Depends(get_db)):
    """Create a new patient session (used by telemetry collector)"""
    patient = services.get_user_by_id(db, user_id=session.patient_id)
    if not patient or patient.role != "patient":
        raise HTTPException(status_code=400, detail="Invalid patient_id. Patient user does not exist.")
    return services.create_patient_session(db=db, session=session)

@router.get("/", response_model=list[schemas.PatientSessionResponse])
def read_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get list of all sessions"""
    return services.get_patient_sessions(db=db, skip=skip, limit=limit)

@router.get("/{session_id}/", response_model=schemas.PatientSessionResponse)
def read_session(session_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a specific session"""
    db_session = services.get_session_by_id(db=db, session_id=session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    return db_session

@router.get("/{session_id}/data/", response_model=list[schemas.ElbowDataResponse])
def read_session_data(session_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all telemetry data for a specific session"""
    db_session = services.get_session_by_id(db=db, session_id=session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    return services.get_elbow_data(db=db, session_id=session_id, skip=skip, limit=limit)

@router.get("/patient/{patient_id}", response_model=list[schemas.PatientSessionResponse])
def read_patient_sessions(patient_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all sessions for a specific patient"""
    return services.get_sessions_by_patient(db=db, patient_id=patient_id, skip=skip, limit=limit)
