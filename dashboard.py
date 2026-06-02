import streamlit as st
import pandas as pd
from sqlalchemy import create_engine
import plotly.express as px
from datetime import datetime, timedelta, timezone
import time

# ===================== CONFIG =====================
st.set_page_config(page_title="BIRD Lab Elbow Exoskeleton", layout="wide")
st.title("🦾 Elbow Exoskeleton - Live Analytics Dashboard")
st.markdown("---")

# Database Connection
@st.cache_resource
def get_db_engine():
    DATABASE_URL = "postgresql://postgres:saum12389@localhost:5432/elbow_db"
    return create_engine(DATABASE_URL)

engine = get_db_engine()

# ===================== LOAD DATA =====================
def load_sessions():
    query = """
        SELECT id, patient_id, session_name, started_at 
        FROM patient_sessions 
        ORDER BY started_at DESC
    """
    try:
        return pd.read_sql(query, engine)
    except Exception:
        return pd.DataFrame()

def load_data(session_id, limit=500):
    if session_id is None:
        return pd.DataFrame()
    query = f"""
        SELECT * FROM elbow_data 
        WHERE session_id = {session_id}
        ORDER BY timestamp DESC 
        LIMIT {limit}
    """
    try:
        df = pd.read_sql(query, engine)
        if not df.empty:
            df = df.sort_values('timestamp')
        return df
    except Exception:
        return pd.DataFrame()

# ===================== SIDEBAR =====================
st.sidebar.header("Dashboard Controls")
refresh_rate = st.sidebar.slider("Refresh Rate (seconds)", 1, 5, 2)
show_last_n = st.sidebar.slider("Show Last N Records", 100, 1000, 500)

st.sidebar.markdown("---")
st.sidebar.header("Patient Session Filter")

sessions_df = load_sessions()
selected_session_id = None

if not sessions_df.empty:
    session_options = []
    session_id_map = {}
    for idx, row in sessions_df.iterrows():
        label = f"👤 {row['patient_id']} | 📝 {row['session_name'] or 'Unnamed'} ({row['started_at'].strftime('%Y-%m-%d %H:%M')})"
        session_options.append(label)
        session_id_map[label] = row['id']
        
    selected_option = st.sidebar.selectbox("Select Session", session_options)
    selected_session_id = session_id_map[selected_option]
else:
    st.sidebar.warning("No sessions found in the database. Start the collector to create one.")

df = load_data(selected_session_id, show_last_n)

if df.empty:
    if selected_session_id is None:
        st.warning("No sessions found. Start your collector script to create a session!")
    else:
        st.warning("No telemetry data yet for this session. Start your collector script!")
    st.stop()

latest = df.iloc[-1]

# ===================== TIME FILTER (Last 60 seconds) =====================
# Make current time timezone-aware to match database
now = datetime.now(timezone.utc)
one_minute_ago = now - timedelta(seconds=60)

# Filter recent data (last 60 seconds)
recent_df = df[df['timestamp'] >= one_minute_ago] 

# ===================== CALCULATIONS =====================
current_angle = latest['angle_degrees']
encoder_count = int(latest['count'])
rotations = int(latest['rotations'])

# Range of Motion (Last 60 seconds)
if not recent_df.empty:
    max_angle = recent_df['angle_degrees'].max()
    min_angle = recent_df['angle_degrees'].min()
    range_of_motion = max_angle - min_angle
else:
    range_of_motion = 0

# Average Movement Speed (Last 60 seconds)
if len(recent_df) > 1:
    time_diff = (recent_df['timestamp'].iloc[-1] - recent_df['timestamp'].iloc[0]).total_seconds()
    angle_diff = recent_df['angle_degrees'].iloc[-1] - recent_df['angle_degrees'].iloc[0]
    avg_speed = abs(angle_diff / time_diff) if time_diff > 0 else 0
else:
    avg_speed = 0

# ===================== METRICS =====================
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("Current Angle", f"{current_angle:.2f}°")
with col2:
    st.metric("Encoder Count", f"{encoder_count:,}")
with col3:
    st.metric("Range of Motion (Last 60s)", f"{range_of_motion:.2f}°")
with col4:
    st.metric("Avg Speed (Last 60s)", f"{avg_speed:.2f} °/s")

# Extra Row
col5, col6 = st.columns(2)
with col5:
    st.metric("Total Rotations", rotations)
with col6:
    st.metric("Total Records", len(df))

# ===================== GRAPHS =====================
st.subheader("📈 Elbow Angle Over Time")
fig1 = px.line(df, x='timestamp', y='angle_degrees',
               title="Angle Movement Over Time",
               labels={'timestamp': 'Time', 'angle_degrees': 'Angle (Degrees)'},
               template="plotly_dark")
fig1.update_layout(height=420)
st.plotly_chart(fig1, use_container_width=True)

st.subheader("📊 Raw Encoder Count Over Time")
fig2 = px.line(df, x='timestamp', y='count',
               title="Raw Encoder Ticks",
               labels={'timestamp': 'Time', 'count': 'Encoder Count'},
               template="plotly_dark")
fig2.update_layout(height=420)
st.plotly_chart(fig2, use_container_width=True)

# Recent Data
st.subheader("📋 Recent Data")
display_df = df[['timestamp', 'count', 'angle_degrees', 'rotations']].copy()
display_df['timestamp'] = display_df['timestamp'].dt.strftime('%H:%M:%S')
st.dataframe(display_df.tail(15), use_container_width=True, hide_index=True)

# Footer
st.caption(f"Last updated: {datetime.now().strftime('%H:%M:%S')} | Refreshing every {refresh_rate} seconds")

# Auto Refresh
time.sleep(refresh_rate)
st.rerun()