from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func

try:
    from .database import Base
except ImportError:
    from database import Base

class ElbowData(Base):
    __tablename__ = "elbow_data"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    count = Column(Integer)
    angle_degrees = Column(Float)
    rotations = Column(Integer, default=0)
    raw_data = Column(String, nullable=True)