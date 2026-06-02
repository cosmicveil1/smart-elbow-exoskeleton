# 🦾 Elbow Exoskeleton - Real-Time Rehabilitation System

A smart, sensor-driven elbow exoskeleton system designed for **rehabilitation tracking, movement analysis, and assistive control**.

Built in just **4 days** as a foundation, with plans to evolve into a complete multi-user rehabilitation platform.

---

## ✨ Features

### Current Implementation
- **Real-time Encoder Data Collection** using high-resolution rotary encoder
- **Live Data Streaming** from Arduino to backend
- **FastAPI Backend** with clean architecture (Models, Services, Schemas)
- **PostgreSQL Database** for reliable data storage
- **Interactive Live Dashboard** with:
  - Current Angle, Encoder Count, Range of Motion
  - Average Movement Speed
  - Real-time graphs (Angle & Raw Ticks)
- **High-accuracy angle calculation** (8192 ticks per revolution)

### Technical Stack
- **Hardware**: Arduino + Rotary Encoder
- **Backend**: FastAPI + SQLAlchemy
- **Database**: PostgreSQL
- **Frontend**: Streamlit (Live Dashboard with Plotly)
- **Communication**: REST API + Serial Communication

---

## 📊 Project Highlights

- Successfully built **full data pipeline**: Hardware → Backend → Database → Dashboard
- Implemented **real-time metrics** (Range of Motion, Movement Speed)
- Clean, maintainable codebase with proper separation of concerns
- High-resolution movement tracking (8192 ticks/rotation)

---

## 🎯 Future Vision (Next 2 Months)

- **Multi-role System**: Doctor, Patient, and Engineer dashboards
- **Exercise Management**: Doctors can create and assign exercises
- **Patient Progress Tracking** with completion percentage
- **Real-time WebSocket** support for multiple encoders
- **Machine Learning** for movement classification and intention prediction
- **React.js Frontend** for professional UI/UX
- **Motor Control** for active assistance (Assist-as-Needed)

---

## 🛠️ How to Run

### Backend
```bash
cd backend
uvicorn main:app --reload --port 8001