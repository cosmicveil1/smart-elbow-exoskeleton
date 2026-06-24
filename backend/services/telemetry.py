from sqlalchemy.orm import Session
from typing import Optional
try:
    from .. import models, schemas
except ImportError:
    import models
    import schemas

def create_elbow_data(db: Session, data: schemas.ElbowDataCreate):
    """Store a single telemetry reading associated with a session"""
    db_data = models.ElbowData(
        session_id=data.session_id,
        target_angle=data.target_angle,
        angle_degrees=data.angle_degrees,
        error=data.error,
        motor_status=data.motor_status,
        raw_data=data.raw_data
    )
    db.add(db_data)
    db.commit()
    db.refresh(db_data)
    return db_data

def get_elbow_data(db: Session, session_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    """Retrieve telemetry data, optionally filtered by session ID"""
    query = db.query(models.ElbowData)
    if session_id is not None:
        query = query.filter(models.ElbowData.session_id == session_id)
    return query.order_by(models.ElbowData.timestamp.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()
