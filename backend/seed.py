import os
from sqlalchemy.orm import Session
try:
    from .database.connection import engine, Base, SessionLocal
    from . import models, services, schemas
except (ImportError, ValueError):
    try:
        from database.connection import engine, Base, SessionLocal
        import models
        import services
        import schemas
    except ImportError:
        from database import engine, Base, SessionLocal
        import models
        import services
        import schemas

def seed_database():
    print("Recreating database tables...")
    # Drop existing tables to ensure clean state with new relationships
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("\n--- Seeding Users ---")
        users_to_seed = [
            {
                "username": "doctor",
                "password": "password",
                "role": "doctor",
                "full_name": "Dr. Sarah Connor",
                "clinical_info": None
            },
            {
                "username": "patient",
                "password": "password",
                "role": "patient",
                "full_name": "John Doe",
                "clinical_info": "Elbow flexion-extension rehabilitation post-tendon surgery."
            },
            {
                "username": "engineer",
                "password": "password",
                "role": "engineer",
                "full_name": "Miles Dyson",
                "clinical_info": None
            }
        ]
        
        seeded_users = {}
        for user_data in users_to_seed:
            existing = services.get_user_by_username(db, username=user_data["username"])
            if not existing:
                user = services.create_user(db, user=schemas.UserCreate(**user_data))
                print(f"Created {user.role}: {user.username} (ID: {user.id})")
                seeded_users[user.username] = user
            else:
                print(f"User {user_data['username']} already exists.")
                seeded_users[user_data["username"]] = existing
                
        print("\n--- Seeding Exercises ---")
        exercises_to_seed = [
            {
                "name": "Active Flexion Extension",
                "description": "Actively flex and extend your elbow joint to a target angle of 90 degrees.",
                "mode": "position",
                "target_angle": 90.0,
                "target_value": 90.0,
                "duration_seconds": 60
            },
            {
                "name": "Isometric Strength Hold",
                "description": "Hold the joint at 45 degrees while exerting a target motor torque of 5.0 Nm.",
                "mode": "torque",
                "target_angle": 45.0,
                "target_value": 5.0,
                "duration_seconds": 45
            },
            {
                "name": "Passive ROM Stretching",
                "description": "Relax your muscles and let the exoskeleton guide your joint up to 120 degrees.",
                "mode": "position",
                "target_angle": 120.0,
                "target_value": 120.0,
                "duration_seconds": 90
            }
        ]
        
        seeded_exercises = []
        for ex_data in exercises_to_seed:
            ex = services.create_exercise(db, exercise=schemas.ExerciseCreate(**ex_data))
            print(f"Created exercise: {ex.name} (ID: {ex.id})")
            seeded_exercises.append(ex)
            
        print("\n--- Prescribing Exercises to Patient ---")
        # Assign all three exercises to the patient by the doctor
        doctor = seeded_users["doctor"]
        patient = seeded_users["patient"]
        
        for ex in seeded_exercises:
            assignment = services.assign_exercise_to_patient(
                db, 
                doctor_id=doctor.id, 
                assignment=schemas.PatientExerciseCreate(
                    patient_id=patient.id,
                    exercise_id=ex.id
                )
            )
            print(f"Prescribed exercise '{ex.name}' to Patient '{patient.full_name}'")
            
        print("\nDatabase seeding completed successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
