from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
try:
    from .. import models, schemas
except ImportError:
    import models
    import schemas

def create_command(db: Session, data: schemas.CommandCreate):
    db_cmd = models.CommandQueue(
        patient_id=data.patient_id,
        command_type=data.command_type,
        value=data.value,
        status="pending"
    )
    db.add(db_cmd)
    db.commit()
    db.refresh(db_cmd)
    return db_cmd

def get_pending_commands(db: Session):
    return db.query(models.CommandQueue).filter(models.CommandQueue.status == "pending").order_by(models.CommandQueue.created_at.asc()).all()

def execute_command(db: Session, command_id: int):
    db_cmd = db.query(models.CommandQueue).filter(models.CommandQueue.id == command_id).first()
    if db_cmd:
        db_cmd.status = "executed"
        db_cmd.executed_at = datetime.utcnow()
        db.commit()
        db.refresh(db_cmd)
    return db_cmd
