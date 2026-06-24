import streamlit as st
import pandas as pd
from sqlalchemy import create_engine
import plotly.express as px
from datetime import datetime, timedelta, timezone
import
import requests

# ===================== CONFIG =====================
st.set_page_config(page_title="BIRD Lab Elbow Exoskeleton", layout="wide")

API_BASE = "http://127.0.0.1:8001"

# Database Connection (keep caching for read-heavy operations)
@st.cache_resource
def get_db_engine():
    DATABASE_URL = "postgresql://postgres:saum12389@localhost:5432/elbow_db"
    return create_engine(DATABASE_URL)

try:
    engine = get_db_engine()
except Exception:
    engine = None

# ===================== SESSION STATE INITIALIZATION =====================
if "logged_in" not in st.session_state:
    st.session_state["logged_in"] = False
if "token" not in st.session_state:
    st.session_state["token"] = ""
if "user_role" not in st.session_state:
    st.session_state["user_role"] = ""
if "user_id" not in st.session_state:
    st.session_state["user_id"] = None
if "full_name" not in st.session_state:
    st.session_state["full_name"] = ""
if "username" not in st.session_state:
    st.session_state["username"] = ""

# ===================== API HELPER FUNCTIONS =====================
def get_headers():
    headers = {}
    if st.session_state["token"]:
        headers["Authorization"] = f"Bearer {st.session_state['token']}"
    return headers

def api_get(endpoint):
    response = requests.get(f"{API_BASE}{endpoint}", headers=get_headers())
    if response.status_code == 200:
        return response.json()
    else:
        st.error(f"Error {response.status_code}: {response.text}")
        return []

def api_post(endpoint, payload):
    response = requests.post(f"{API_BASE}{endpoint}", json=payload, headers=get_headers())
    if response.status_code in [200, 201]:
        return response.json()
    else:
        st.error(f"Error {response.status_code}: {response.text}")
        return None

def api_put(endpoint, payload):
    response = requests.put(f"{API_BASE}{endpoint}", json=payload, headers=get_headers())
    if response.status_code == 200:
        return response.json()
    else:
        st.error(f"Error {response.status_code}: {response.text}")
        return None

# ===================== LOGIN AND LOGOUT =====================
def attempt_login(username, password):
    try:
        response = requests.post(f"{API_BASE}/auth/login", json={"username": username, "password": password})
        if response.status_code == 200:
            data = response.json()
            st.session_state["logged_in"] = True
            st.session_state["token"] = data["access_token"]
            st.session_state["user_role"] = data["role"]
            st.session_state["user_id"] = data["user_id"]
            st.session_state["username"] = data["username"]
            st.session_state["full_name"] = data["username"].capitalize()
            st.success("Login Successful!")
            st.rerun()
        else:
            st.error("Authentication failed. Invalid username or password.")
    except requests.exceptions.ConnectionError:
        st.error("Connection failed. Is the FastAPI backend running on port 8001?")

def logout():
    st.session_state["logged_in"] = False
    st.session_state["token"] = ""
    st.session_state["user_role"] = ""
    st.session_state["user_id"] = None
    st.session_state["username"] = ""
    st.session_state["full_name"] = ""
    st.rerun()

# ===================== LOGIN SCREEN VIEW =====================
if not st.session_state["logged_in"]:
    st.markdown("<h1 style='text-align: center;'>🦾 Elbow Exoskeleton Platform</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: gray;'>Clinical Rehabilitation & Ingestion Hub</p>", unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns([1, 1.5, 1])
    with col2:
        with st.container(border=True):
            st.subheader("🔑 Secure Access Portal")
            username_input = st.text_input("Username", key="login_username")
            password_input = st.text_input("Password", type="password", key="login_password")
            
            if st.button("Sign In", use_container_width=True):
                attempt_login(username_input, password_input)
            
            st.markdown("---")
            st.caption("Testing Quick Logins:")
            qcol1, qcol2, qcol3 = st.columns(3)
            with qcol1:
                if st.button("👨‍⚕️ Doctor", use_container_width=True):
                    attempt_login("doctor", "password")
            with qcol2:
                if st.button("🤕 Patient", use_container_width=True):
                    attempt_login("patient", "password")
            with qcol3:
                if st.button("⚙️ Engineer", use_container_width=True):
                    attempt_login("engineer", "password")
    st.stop()

# ===================== LOGGED IN LAYOUT =====================
st.sidebar.markdown(f"### 🔐 User Session")
st.sidebar.markdown(f"**Name:** {st.session_state['full_name']}")
st.sidebar.markdown(f"**Role:** `{st.session_state['user_role'].upper()}`")
if st.sidebar.button("🚪 Logout", use_container_width=True):
    logout()

st.sidebar.markdown("---")

# ===================== DOCTOR PORTAL =====================
if st.session_state["user_role"] == "doctor":
    st.title("👨‍⚕️ Welcome, Dr. John Doe")
    st.markdown("Clinical Prescription & Progress Monitoring Workspace")
    st.markdown("---")

    # Fetch Patients
    patients = api_get("/users/patients")
    
    if patients:
        patient_options = {p["full_name"]: p for p in patients}
        selected_patient_name = st.sidebar.selectbox("Select Patient Profile", list(patient_options.keys()))
        selected_patient = patient_options[selected_patient_name]
        
        # Load Patient Details
        prescriptions = api_get(f"/exercises/prescriptions/patient/{selected_patient['id']}")
        
        # Historical sessions (we can fetch via sql or api)
        sessions = api_get(f"/sessions/patient/{selected_patient['id']}")

        # Main Page details
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.subheader(f"🤕 Selected Patient: {selected_patient['full_name']}")
            st.info(f"📋 **Clinical Notes & Diagnosis:**\n\n{selected_patient['clinical_info'] or 'No clinical details provided yet.'}")
            
            st.markdown("### 📋 Therapy Progress Checklist")
            for pres in prescriptions:
                with st.container(border=True):
                    head1, head2 = st.columns([3, 1])
                    with head1:
                        st.markdown(f"#### {pres['exercise']['name']}")
                        st.markdown(f"*{pres['exercise']['description'] or 'No instructions provided.'}*")
                    with head2:
                        st.markdown(f"<span style='background-color:#5b3fa3; color:white; padding:3px 8px; border-radius:5px; font-size:11px; font-weight:bold;'>{pres['exercise']['mode'].upper()}</span>", unsafe_allow_html=True)
                    
                    st.markdown(f"**Target Angle:** {pres['exercise']['target_angle']}° | **Value:** {pres['exercise']['target_value']} | **Duration:** {pres['exercise']['duration_seconds']}s")
                    
                    # Completion Progress Bar
                    comp_rate = int(pres['completion_percentage'])
                    st.progress(comp_rate / 100.0)
                    st.caption(f"**Completion rate:** {comp_rate}% (Status: `{pres['status']}`) ")
            
            if not prescriptions:
                st.warning("No therapy routines prescribed to this patient yet.")
                
        with col2:
            st.subheader("✍️ Prescribe Exercise")
            # Load templates
            templates = api_get("/exercises/")
            if templates:
                template_options = {f"{ex['name']} ({ex['mode']} | {ex['target_angle']}°)": ex for ex in templates}
                selected_template_label = st.selectbox("Select Template", list(template_options.keys()))
                selected_template = template_options[selected_template_label]
                
                if st.button("Prescribe to Patient", use_container_width=True):
                    res = api_post("/exercises/prescriptions", {
                        "patient_id": selected_patient["id"],
                        "exercise_id": selected_template["id"]
                    })
                    if res:
                        st.success(f"Prescribed '{selected_template['name']}' to patient!")
                        st.rerun()
            else:
                st.warning("No templates found. Create a template below.")
                
            # History log
            st.markdown("---")
            st.markdown("#### ⏱️ Historical Therapy Runs")
            if sessions:
                for sess in sessions[:5]:
                    st.markdown(f"- **{sess['session_name']}** ({datetime.fromisoformat(sess['started_at'].replace('Z', '+00:00')).strftime('%m/%d %H:%M')})")
            else:
                st.caption("No historical sessions recorded.")

        # Bottom section: Exercise Definition creator
        st.markdown("---")
        st.subheader("⚙️ Create New Predefined Exercise Profile Template")
        with st.form("create_exercise_form"):
            fcol1, fcol2, fcol3 = st.columns(3)
            with fcol1:
                ex_name = st.text_input("Template Name", placeholder="e.g. Active Extension stretch")
                ex_desc = st.text_input("Instructions / Description")
            with fcol2:
                ex_mode = st.selectbox("Control Mode", ["position", "torque", "force"])
                ex_dur = st.number_input("Target Duration (sec)", min_value=1, value=60)
            with fcol3:
                ex_ang = st.number_input("Target Angle (deg)", min_value=0, max_value=180, value=90)
                ex_val = st.number_input("Target Value (Nm or N)", min_value=0.0, value=5.0)
                
            if st.form_submit_button("Save Exercise Template"):
                if ex_name:
                    res = api_post("/exercises/", {
                        "name": ex_name,
                        "description": ex_desc,
                        "mode": ex_mode,
                        "target_angle": float(ex_ang),
                        "target_value": float(ex_val),
                        "duration_seconds": int(ex_dur)
                    })
                    if res:
                        st.success(f"Created template '{ex_name}'!")
                        st.rerun()
                else:
                    st.error("Exercise Template name is required.")
    else:
        st.warning("No patients registered in database.")

# ===================== PATIENT PORTAL =====================
elif st.session_state["user_role"] == "patient":
    st.title("🤕 Patient Calibration Dashboard")
    st.markdown("Select a routine assigned by your clinician and calibrate joint movements.")
    st.markdown("---")

    # Fetch patient prescriptions
    prescriptions = api_get(f"/exercises/prescriptions/patient/{st.session_state['user_id']}")
    
    if prescriptions:
        pres_options = {f"{p['exercise']['name']} ({p['exercise']['mode']} | {p['exercise']['target_angle']}°)": p for p in prescriptions}
        selected_pres_label = st.sidebar.selectbox("Select Workout Routine", list(pres_options.keys()))
        pres = pres_options[selected_pres_label]
        
        # Display Targets
        st.subheader(f"Active Exercise: {pres['exercise']['name']}")
        st.caption(f"Instructions: {pres['exercise']['description'] or 'Perform movements up to the target parameters below.'}")
        
        # Metric cards
        mcol1, mcol2, mcol3, mcol4 = st.columns(4)
        with mcol1:
            st.metric("Target Angle", f"{pres['exercise']['target_angle']}°")
        with mcol2:
            st.metric("Mode Target", f"{pres['exercise']['target_value']} {pres['exercise']['mode']}")
        with mcol3:
            st.metric("Prescribed Duration", f"{pres['exercise']['duration_seconds']}s")
        with mcol4:
            st.metric("Completed Ratio", f"{int(pres['completion_percentage'])}%")

        st.markdown("---")
        
        # Interactive joint simulator
        sim_col, ctrl_col = st.columns([2, 1])
        
        with sim_col:
            st.subheader("🦾 Real-time Joint Simulation")
            
            # Simple SVG drawn visualizer in streamlit
            sim_angle = st.slider("Simulate Exoskeleton Joint Angle", 0, 140, 0, key="sim_angle_slider")
            
            # Target range Sector angle representation
            target_ang = pres['exercise']['target_angle']
            
            # Draw SVG in streamlit HTML component
            # Arm segments drawn with simple trigonometric rotations
            import math
            angle_rad = math.radians(sim_angle)
            arm_x = 120 + 80 * math.cos(angle_rad)
            arm_y = 100 - 80 * math.sin(angle_rad)
            
            svg_code = f"""
            <svg width="100%" height="240" viewBox="0 0 240 200" style="background:#090a10; border-radius:10px; border:1px solid #1e293b;">
              <!-- Grid lines -->
              <line x1="20" y1="100" x2="220" y2="100" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
              <line x1="120" y1="10" x2="120" y2="190" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3,3" />
              
              <!-- Target Angle Sector -->
              <path d="M 120 100 L 190 100 A 70 70 0 0 0 {120 + 70 * math.cos(math.radians(target_ang))} {100 - 70 * math.sin(math.radians(target_ang))} Z" fill="rgba(6, 182, 212, 0.1)" stroke="rgba(6, 182, 212, 0.3)" />

              <!-- Shoulder Anchor -->
              <circle cx="40" cy="100" r="10" fill="#2d3748" />
              
              <!-- Upper Arm -->
              <line x1="40" y1="100" x2="120" y2="100" stroke="#334155" stroke-width="12" stroke-linecap="round" />
              
              <!-- Elbow joint -->
              <circle cx="120" cy="100" r="16" fill="#0f172a" stroke="#8b5cf6" stroke-width="3" />
              <circle cx="120" cy="100" r="6" fill="#8b5cf6" />

              <!-- Moving forearm strut -->
              <line x1="120" y1="100" x2="{arm_x}" y2="{arm_y}" stroke="#8b5cf6" stroke-width="10" stroke-linecap="round" />
              <line x1="120" y1="100" x2="{arm_x}" y2="{arm_y}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
              <circle cx="{arm_x}" cy="{arm_y}" r="5" fill="#ec4899" />
              
              <!-- Angle Labels -->
              <text x="120" y="165" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">Flexion: {sim_angle}°</text>
              <text x="120" y="185" text-anchor="middle" fill="#06b6d4" font-size="10">Target joint: {target_ang}°</text>
            </svg>
            """
            st.components.v1.html(svg_code, height=250)

        with ctrl_col:
            st.subheader("🎛️ Session control")
            auto_play = st.checkbox("Auto-flex joint sweep", value=True)
            
            if st.button("▶️ Start Rehab Routine", use_container_width=True):
                # 1. Create session
                sess = api_post("/sessions/", {
                    "patient_id": str(st.session_state["user_id"]),
                    "session_name": f"Streamlit-Session: {pres['exercise']['name']}",
                    "notes": f"Calibrated via Streamlit Dashboard simulator. Target: {target_ang}°"
                })
                
                if sess:
                    sess_id = sess["id"]
                    duration = pres['exercise']['duration_seconds'] or 60
                    
                    progress_bar = st.progress(0)
                    status_area = st.empty()
                    
                    st.toast("Rehabilitation session initialized!")
                    
                    current_completeness = 0
                    
                    # Sweep values
                    sweep_angle = 0
                    sweep_direction = 1
                    
                    for step in range(1, duration + 1):
                        time.sleep(1.0)
                        time_left = duration - step
                        
                        # Swing sweep
                        if auto_play:
                            if sweep_direction == 1:
                                sweep_angle += 8
                                if sweep_angle >= target_ang + 10:
                                    sweep_direction = -1
                            else:
                                sweep_angle -= 8
                                if sweep_angle <= 0:
                                    sweep_direction = 1
                        else:
                            # Use manual slider value (sim_angle gets captured on reload, but inside python loops we fetch latest)
                            sweep_angle = sim_angle
                        
                        # Eval target matching
                        angle_delta = abs(sweep_angle - target_ang)
                        in_band = angle_delta <= 8
                        
                        if in_band:
                            current_completeness = min(100, current_completeness + (100 / (duration / 2.5)))
                            status_area.info(f"⏱️ **Step {step}/{duration}:** In target range ({sweep_angle}°). Completing...")
                        else:
                            status_area.warning(f"⏱️ **Step {step}/{duration}:** Adjust joint to match {target_ang}° (Current: {sweep_angle}°).")
                        
                        # Post data points
                        if step % 2 == 0:
                            api_post("/data/", {
                                "session_id": sess_id,
                                "count": int(sweep_angle * 22.75),
                                "angle_degrees": float(sweep_angle),
                                "rotations": int(sweep_angle // 360),
                                "raw_data": f"{int(sweep_angle * 22.75)}, {sweep_angle}, 0"
                            })
                            
                        # Update progress rate bar
                        progress_bar.progress(step / duration)
                        
                        # Sync database completion percentage
                        if step % 5 == 0 or step == duration:
                            api_put(f"/exercises/prescriptions/{pres['id']}", {
                                "completion_percentage": float(round(current_completeness)),
                                "status": "completed" if current_completeness >= 95 else "active"
                            })
                            
                    st.success("🎉 Calibration Session completed successfully!")
                    st.balloons()
                    st.rerun()
    else:
        st.info("No exercise profiles prescribed yet. Please check with your doctor.")

# ===================== ENGINEER PORTAL =====================
elif st.session_state["user_role"] == "engineer":
    st.title("⚙️ Exoskeleton Diagnostics Portal")
    st.markdown("Active hardware streams, raw encoder calibrations, and ingestion databases.")
    st.markdown("---")

    # Diagnostics metrics
    mcol1, mcol2, mcol3 = st.columns(3)
    with mcol1:
        st.metric("Microcontroller State", "ONLINE (COM6)", "115200 bps")
    with mcol2:
        st.metric("Database", "PostgreSQL Connected", "Port 5432")
    with mcol3:
        st.metric("FastAPI Base Ingestion", "ONLINE", "Port 8001")

    st.markdown("---")
    
    # Sessions picker
    sessions = api_get("/sessions/")
    
    if sessions:
        session_options = {f"{s['session_name']} (Patient: {s['patient_id']} | ID: {s['id']})": s for s in sessions}
        selected_sess_label = st.selectbox("Select Session Feed Log", list(session_options.keys()))
        selected_sess = session_options[selected_sess_label]
        
        # Load session data
        telemetry_logs = api_get(f"/sessions/{selected_sess['id']}/data/")
        
        st.markdown(f"### 📊 Telemetry logs for: `{selected_sess['session_name']}`")
        
        if telemetry_logs:
            # Render dataframe
            df = pd.DataFrame(telemetry_logs)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            # Simple line graph of joint angle
            fig = px.line(df, x='timestamp', y='angle_degrees', title='Joint Angle Timeline Feed', template='plotly_dark')
            st.plotly_chart(fig, use_container_width=True)
            
            # Table
            st.markdown("#### Raw Diagnostic Data Stream")
            st.dataframe(df[['timestamp', 'count', 'angle_degrees', 'rotations', 'raw_data']].tail(30), use_container_width=True)
        else:
            st.info("No telemetry packets found for this session.")
    else:
        st.warning("No sessions logged in database.")aption(f"Last updated: {datetime.now().strftime('%H:%M:%S')} | Refreshing every {refresh_rate} seconds")

# Auto Refresh
time.sleep(refresh_rate)
st.rerun()