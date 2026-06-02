# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from typing import Optional

try:
    from . import models, schemas
except ImportError:
    import models
    import schemas

# ================== Patient Session Services ==================

def create_patient_session(db: Session, session: schemas.PatientSessionCreate):
    """Create a new patient session"""
    db_session = models.PatientSession(
        patient_id=session.patient_id,
        session_name=session.session_name,
        notes=session.notes
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


def get_patient_sessions(db: Session, skip: int = 0, limit: int = 100):
    """Get a list of patient sessions"""
    return db.query(models.PatientSession)\
             .order_by(models.PatientSession.started_at.desc())\
             .offset(skip)\
             .limit(limit)\
             .all()


def get_session_by_id(db: Session, session_id: int):
    """Get a patient session by its unique ID"""
    return db.query(models.PatientSession).filter(models.PatientSession.id == session_id).first()


# ================== Telemetry Data Services ==================

def create_elbow_data(db: Session, data: schemas.ElbowDataCreate):
    """Create new elbow data record associated with a session"""
    db_data = models.ElbowData(
        session_id=data.session_id,
        count=data.count,
        angle_degrees=data.angle_degrees,
        rotations=data.rotations,
        raw_data=data.raw_data
    )
    db.add(db_data)
    db.commit()
    db.refresh(db_data)
    return db_data


def get_elbow_data(db: Session, session_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    """Get list of elbow data records, optionally filtered by session_id"""
    query = db.query(models.ElbowData)
    if session_id is not None:
        query = query.filter(models.ElbowData.session_id == session_id)
    return query.order_by(models.ElbowData.timestamp.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()