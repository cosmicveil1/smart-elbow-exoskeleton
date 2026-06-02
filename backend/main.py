from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

try:
    from . import models, schemas, services, database
except ImportError:
    import models
    import schemas
    import services
    import database

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Elbow Exoskeleton API")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/data/", response_model=schemas.ElbowDataResponse)
def add_elbow_data(data: schemas.ElbowDataCreate, db: Session = Depends(database.get_db)):
    """Send data from Arduino/Collector"""
    return services.create_elbow_data(db=db, data=data)


@app.get("/data/", response_model=list[schemas.ElbowDataResponse])
def read_elbow_data(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """Get all stored data"""
    return services.get_elbow_data(db, skip=skip, limit=limit)


@app.get("/")
def home():
    return {"message": "Elbow Exoskeleton Backend is Running! 🚀"}