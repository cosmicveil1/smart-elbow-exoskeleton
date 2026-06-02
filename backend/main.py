from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .database import engine, Base
    from .routers import auth_router, users_router, sessions_router, telemetry_router, exercises_router
except ImportError:
    from database import engine, Base
    from routers import auth_router, users_router, sessions_router, telemetry_router, exercises_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Elbow Exoskeleton API", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(sessions_router)
app.include_router(telemetry_router)
app.include_router(exercises_router)

@app.get("/")
def home():
    return {"message": "Elbow Exoskeleton Backend is Running! 🚀"}