from sqlalchemy.orm import Session
try:
    from .. import models, schemas
    from .auth import get_password_hash
except ImportError:
    import models
    import schemas
    from .auth import get_password_hash

def get_user_by_id(db: Session, user_id: int):
    """Retrieve user by database ID"""
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    """Retrieve user by unique username"""
    return db.query(models.User).filter(models.User.username == username).first()

def get_users_by_role(db: Session, role: str):
    """Retrieve all users matching a specific role"""
    return db.query(models.User).filter(models.User.role == role).all()

def create_user(db: Session, user: schemas.UserCreate):
    """Create a new user with secure password hashing"""
    db_user = models.User(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        role=user.role,
        full_name=user.full_name,
        clinical_info=user.clinical_info
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
