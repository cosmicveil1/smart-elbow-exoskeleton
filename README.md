# 🦾 Elbow Rehab Platform

An intelligent **real-time elbow exoskeleton system** for rehabilitation tracking, exercise guidance, and assistive control. Built with a focus on clinical usability and future AI integration.

---

##  Project Vision

A complete rehabilitation platform that enables **Doctors** to prescribe exercises, **Patients** to perform guided therapy, and **Engineers** to monitor and optimize the system — all in real-time.

---

##  Current Features

### Hardware & Data Acquisition
- High-resolution rotary encoder (8192 ticks per revolution)
- Real-time angle, count, and rotation tracking
- Robust serial communication with Arduino

### Backend & Data Pipeline
- **FastAPI** backend with clean layered architecture
- **PostgreSQL** database for reliable session storage
- REST API for data ingestion and retrieval

### Live Analytics Dashboard
- Current angle, encoder count, and rotations
- **Range of Motion** (Last 60 seconds)
- **Average Movement Speed**
- Real-time interactive graphs (Angle & Encoder Count)
- Built with Streamlit (React frontend in progress)

---

##  Tech Stack

- **Hardware**: Arduino Uno + Rotary Encoder
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Dashboard**: Streamlit (migrating to React.js)
- **Data Collection**: Python + PySerial
- **Visualization**: Plotly

---

##  User Roles & Planned Features

### Doctor Dashboard
- Create and assign customized exercises
- Monitor patient progress with % completion
- View Range of Motion trends and session history
- AI-powered clinical insights (planned)

### Patient Dashboard
- Guided exercise sessions with real-time feedback
- Live angle and movement visualization
- Progress tracking and motivational metrics
- Pain reporting and session summary

### Engineer Dashboard
- Real-time system monitoring
- Raw sensor data and diagnostics
- Parameter tuning (future motor control)
- Device calibration and firmware management

---

##  Future Roadmap

### Near Term (Next 4–6 Weeks)
- Full **React.js** frontend with role-based authentication
- WebSocket support for true real-time updates
- Exercise prescription & tracking system
- Multi-encoder support

### Medium Term
- Motor control for **Assist-as-Needed** functionality
- Machine Learning models for movement quality assessment
- EMG sensor integration
- Cloud synchronization

### Long Term
- Multi-joint support (shoulder + elbow)
- Predictive recovery analytics
- Tele-rehabilitation capabilities
- Clinical trial readiness

---

##  How to Run (Development)

```bash
# 1. Backend
cd backend
uvicorn main:app --reload --port 8001

# 2. Data Collector
cd collector
python elbow_encoder.py

# 3. Dashboard (Current)
streamlit run dashboard.py