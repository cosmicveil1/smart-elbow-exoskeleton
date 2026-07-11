from sqlalchemy.orm import Session
try:
    from .. import models, schemas
except ImportError:
    import models
    import schemas

def create_exercise(db: Session, exercise: schemas.ExerciseCreate):
    """Create a new exercise profile"""
    db_exercise = models.Exercise(
        name=exercise.name,
        description=exercise.description,
        joint=exercise.joint,
        mode=exercise.mode,
        target_angle=exercise.target_angle,
        target_value=exercise.target_value,
        duration_seconds=exercise.duration_seconds
    )
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    return db_exercise

def get_exercises(db: Session, skip: int = 0, limit: int = 100):
    """Get all exercises"""
    return db.query(models.Exercise).offset(skip).limit(limit).all()

def get_exercise_by_id(db: Session, exercise_id: int):
    """Get single exercise profile by ID"""
    return db.query(models.Exercise).filter(models.Exercise.id == exercise_id).first()

def assign_exercise_to_patient(db: Session, doctor_id: int, assignment: schemas.PatientExerciseCreate):
    """Assign an exercise to a patient"""
    db_assignment = models.PatientExercise(
        patient_id=assignment.patient_id,
        exercise_id=assignment.exercise_id,
        assigned_by=doctor_id,
        target_cycles=assignment.target_cycles,
        status="assigned",
        completion_percentage=0.0
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    # Eagerly load exercise details
    db_assignment.exercise = get_exercise_by_id(db, assignment.exercise_id)
    return db_assignment

def get_patient_exercises(db: Session, patient_id: int):
    """Retrieve all exercises prescribed to a specific patient"""
    return db.query(models.PatientExercise).filter(models.PatientExercise.patient_id == patient_id).all()

def update_patient_exercise(db: Session, patient_exercise_id: int, updates: schemas.PatientExerciseUpdate):
    """Update progress percentage or completion status of an exercise"""
    db_assignment = db.query(models.PatientExercise).filter(models.PatientExercise.id == patient_exercise_id).first()
    if not db_assignment:
        return None
    if updates.status is not None:
        db_assignment.status = updates.status
    if updates.completion_percentage is not None:
        db_assignment.completion_percentage = updates.completion_percentage
    db.commit()
    db.refresh(db_assignment)
    return db_assignment
