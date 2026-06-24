from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
try:
    from ..database import Base
except ImportError:
    from database import Base

class CommandQueue(Base):
    __tablename__ = "commands"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    command_type = Column(String, nullable=False)  # 'TARGET_ANGLE' or 'STOP'
    value = Column(Float, nullable=True)           # Only used for TARGET_ANGLE
    status = Column(String, default='pending', index=True) # 'pending' or 'executed'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    executed_at = Column(DateTime(timezone=True), nullable=True)
