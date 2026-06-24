from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
try:
    from ..database import get_db
    from .. import schemas, services
except ImportError:
    from database import get_db
    import schemas
    import services
from typing import List

router = APIRouter(prefix="/commands", tags=["commands"])

@router.post("/", response_model=schemas.CommandResponse)
def create_command(data: schemas.CommandCreate, db: Session = Depends(get_db)):
    """Create a new command (e.g. TARGET_ANGLE or STOP)"""
    return services.create_command(db=db, data=data)

@router.get("/pending", response_model=List[schemas.CommandResponse])
def get_pending_commands(db: Session = Depends(get_db)):
    """Retrieve all pending commands for the hardware bridge to execute"""
    return services.get_pending_commands(db=db)

@router.put("/{command_id}/execute", response_model=schemas.CommandResponse)
def execute_command(command_id: int, db: Session = Depends(get_db)):
    """Mark a command as executed by the hardware"""
    cmd = services.execute_command(db=db, command_id=command_id)
    if not cmd:
        raise HTTPException(status_code=404, detail="Command not found")
    return cmd
