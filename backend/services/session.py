from sqlalchemy.orm import Session
try:
    from .. import models, schemas
except ImportError:
    import models
    import schemas

def create_patient_session(db: Session, session: schemas.PatientSessionCreate):
    """Create a new session associated with a patient and optional exercise"""
    db_session = models.PatientSession(
        patient_id=session.patient_id,
        patient_exercise_id=session.patient_exercise_id,
        session_name=session.session_name,
        notes=session.notes
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_patient_sessions(db: Session, skip: int = 0, limit: int = 100):
    """Get all stored sessions"""
    return db.query(models.PatientSession)\
             .order_by(models.PatientSession.started_at.desc())\
             .offset(skip)\
             .limit(limit)\
             .all()

def get_session_by_id(db: Session, session_id: int):
    """Retrieve session by ID"""
    return db.query(models.PatientSession).filter(models.PatientSession.id == session_id).first()

def get_sessions_by_patient(db: Session, patient_id: int, skip: int = 0, limit: int = 100):
    """Get all sessions for a specific patient"""
    return db.query(models.PatientSession)\
             .filter(models.PatientSession.patient_id == patient_id)\
             .order_by(models.PatientSession.started_at.desc())\
             .offset(skip)\
             .limit(limit)\
             .all()
