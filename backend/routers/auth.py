from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

try:
    from ..database import get_db
    from .. import schemas, services
except ImportError:
    from database import get_db
    import schemas
    import services

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

@router.post("/login", response_model=schemas.TokenResponse)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate a user and return a JWT access token"""
    user = services.get_user_by_username(db, username=login_data.username)
    if not user or not services.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    # Generate token
    token = services.create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id}
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "user_id": user.id
    }

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Dependency helper to validate JWT token and return current authenticated user"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, services.auth.SECRET_KEY, algorithms=[services.auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token credentials")
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = services.get_user_by_username(db, username=username)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
