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

router = APIRouter(prefix="/exercises", tags=["exercises"])

@router.post("/", response_model=schemas.ExerciseResponse)
def add_exercise(exercise: schemas.ExerciseCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Create a new exercise profile (Doctor/Engineer only)"""
    if current_user.role not in ["doctor", "engineer"]:
        raise HTTPException(status_code=403, detail="Not authorized to create exercises")
    return services.create_exercise(db=db, exercise=exercise)

@router.get("/", response_model=list[schemas.ExerciseResponse])
def read_exercises(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get list of all predefined exercises"""
    return services.get_exercises(db=db, skip=skip, limit=limit)

@router.post("/prescriptions", response_model=schemas.PatientExerciseResponse)
def prescribe_exercise(assignment: schemas.PatientExerciseCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Prescribe an exercise to a patient (Doctor only)"""
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can prescribe exercises")
    
    # Check if patient exists and is indeed a patient
    patient = services.get_user_by_id(db, user_id=assignment.patient_id)
    if not patient or patient.role != "patient":
        raise HTTPException(status_code=400, detail="Invalid patient ID")
        
    # Check if exercise exists
    ex = services.get_exercise_by_id(db, exercise_id=assignment.exercise_id)
    if not ex:
        raise HTTPException(status_code=400, detail="Invalid exercise ID")
        
    return services.assign_exercise_to_patient(db=db, doctor_id=current_user.id, assignment=assignment)

@router.get("/prescriptions/patient/{patient_id}", response_model=list[schemas.PatientExerciseResponse])
def read_patient_prescriptions(patient_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Read all exercises prescribed to a specific patient"""
    # Patient can see their own, doctor/engineer can see any
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return services.get_patient_exercises(db=db, patient_id=patient_id)

@router.put("/prescriptions/{patient_exercise_id}", response_model=schemas.PatientExerciseResponse)
def update_prescription(patient_exercise_id: int, updates: schemas.PatientExerciseUpdate, db: Session = Depends(get_db)):
    """Update progress percentage or completion status of an exercise assignment"""
    res = services.update_patient_exercise(db=db, patient_exercise_id=patient_exercise_id, updates=updates)
    if not res:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    # Reload details to make sure exercise object is populated
    res.exercise = services.get_exercise_by_id(db, exercise_id=res.exercise_id)
    return res
