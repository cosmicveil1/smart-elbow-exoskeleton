from sqlalchemy.orm import Session

try:
    from . import models, schemas
except ImportError:
    import models
    import schemas

# ================== SERVICES LAYER ==================

def create_elbow_data(db: Session, data: schemas.ElbowDataCreate):
    """Create new elbow data record"""
    db_data = models.ElbowData(
        count=data.count,
        angle_degrees=data.angle_degrees,
        rotations=data.rotations,
        raw_data=data.raw_data
    )
    db.add(db_data)
    db.commit()
    db.refresh(db_data)
    return db_data


def get_elbow_data(db: Session, skip: int = 0, limit: int = 100):
    """Get list of elbow data records"""
    return db.query(models.ElbowData)\
             .order_by(models.ElbowData.timestamp.desc())\
             .offset(skip)\
             .limit(limit)\
             .all()