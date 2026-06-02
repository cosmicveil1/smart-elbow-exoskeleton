import os
import serial
import time
import csv
import requests
from datetime import datetime

# ================== CONFIGURATION ==================
SERIAL_PORT = 'COM6'          
BAUD_RATE = 115200

# FastAPI Backend URLs
BASE_URL = "http://127.0.0.1:8001"
FASTAPI_URL = f"{BASE_URL}/data/"   
FASTAPI_SESSIONS_URL = f"{BASE_URL}/sessions/"

# Create a persistent session for high-speed streaming
session = requests.Session()
# ==================================================

# ================== 🌟 AUTOMATED SESSION SCRIPTING 🌟 ==================
# 1. Ask for Patient ID and Session Name at the start of the test
patient_id = input("👤 Enter Patient ID (e.g., P101, saumya): ").strip()
if not patient_id:
    patient_id = "unknown_patient"

session_name = input("📝 Enter Session Name (optional): ").strip()
if not session_name:
    session_name = f"Session_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}"

# 2. Get today's date and time strings
today_date = datetime.now().strftime("%Y_%m_%d")
time_str = datetime.now().strftime("%H-%M-%S")

# 3. Create an organized directory path: data/patient_id/
session_dir = os.path.join("data", patient_id)
os.makedirs(session_dir, exist_ok=True)  # Automatically creates folders if they don't exist

# 4. Generate dynamic filenames inside that patient's folder
csv_filename = os.path.join(session_dir, f"session_{today_date}_{time_str}_parsed.csv")
raw_filename = os.path.join(session_dir, f"session_{today_date}_{time_str}_raw.csv")

print(f"📁 Session localized! Saving parsed telemetry to: {csv_filename}")
print(f"📁 Saving raw stream logs to: {raw_filename}")

# 5. Connect to FastAPI backend to register the session
session_id = None
try:
    print(f"📡 Registering session for Patient '{patient_id}' on backend: {FASTAPI_SESSIONS_URL} ...")
    session_payload = {
        "patient_id": patient_id,
        "session_name": session_name,
        "notes": f"Local CSV directory: {session_dir}"
    }
    response = requests.post(FASTAPI_SESSIONS_URL, json=session_payload, timeout=5)
    if response.status_code == 200:
        session_id = response.json().get("id")
        print(f"✅ Session registered successfully! Database Session ID: {session_id}")
    else:
        print(f"❌ Failed to register session: {response.status_code} - {response.text}")
        print("💡 Make sure FastAPI backend is running and the database is configured.")
        raise RuntimeError("Session registration failed.")
except requests.exceptions.ConnectionError:
    print("❌ Cannot connect to backend. Is FastAPI still running on http://127.0.0.1:8001?")
    print("💡 Please start the backend before running the data collector.")
    raise SystemExit(1)
except Exception as e:
    print(f"❌ Error during session creation: {e}")
    raise SystemExit(1)
# =======================================================================

# Open the files globally using your dynamic paths
csv_file = open(csv_filename, 'w', newline='', encoding="utf-8")
raw_file = open(raw_filename, 'w', newline='', encoding="utf-8")

csv_writer = csv.writer(csv_file)
raw_writer = csv.writer(raw_file)

csv_writer.writerow(["Timestamp", "Count", "Angle_Degrees", "Rotations"])
raw_writer.writerow(["Timestamp", "Raw_Data"])

print(f"✅ Trying to connect to Arduino on {SERIAL_PORT}...")
print(f"📡 Sending data to FastAPI: {FASTAPI_URL}")

try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    time.sleep(2)

    print("✅ Successfully connected to Arduino!")
    print("📡 Live data is being sent to backend...\n")
    print("Move the elbow joint...\n")

    while True:
        line = ser.readline()
        
        if line:
            try:
                data = line.decode('utf-8').strip()
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
                
                print(f"📥 Received: {data}")

                # Save raw data to CSV (Uses the same writer variable!)
                raw_writer.writerow([timestamp, data])

                # Parse and send to FastAPI
                if "," in data:
                    try:
                        parts = data.split(",")
                        count = int(parts[0].strip())
                        angle = float(parts[1].strip())
                        rotations = int(parts[2].strip()) if len(parts) > 2 else 0

                        # Save to local CSV (Uses the same writer variable!)
                        csv_writer.writerow([timestamp, count, angle, rotations])

                        # ================== SEND TO BACKEND ==================
                        payload = {
                            "session_id": session_id,
                            "count": count,
                            "angle_degrees": angle,
                            "rotations": rotations,
                            "raw_data": data
                        }

                        try:
                            response = session.post(FASTAPI_URL, json=payload, timeout=3)
                            
                            if response.status_code == 200:
                                print("✅ Sent to backend successfully")
                            else:
                                print(f"⚠️ Backend Error: {response.status_code} - {response.text}")
                        except requests.exceptions.ConnectionError:
                            print("❌ Cannot connect to backend. Is FastAPI still running?")
                        except requests.exceptions.Timeout:
                            print("❌ Request timeout - Backend is slow or not responding")
                        except Exception as e:
                            print(f"❌ Request failed: {e}")
                        # ====================================================

                    except ValueError:
                        print("⚠️ Could not parse data (wrong format)")
                    except Exception as e:
                        print(f"⚠️ Error parsing data: {e}")

                # Flush data every 5 seconds to guarantee disk writes
                if int(time.time()) % 5 == 0:
                    csv_file.flush()
                    raw_file.flush()

            except Exception as e:
                print(f"Error processing line: {e}")

        time.sleep(0.01)

except serial.SerialException as e:
    print(f"❌ Could not open port {SERIAL_PORT}")
    print("   → Make sure Arduino Serial Monitor is CLOSED")
    print(f"   Error: {e}")
except KeyboardInterrupt:
    print("\n\n🛑 Stopped by user. Data saved!")
except Exception as e:
    print(f"Unexpected Error: {e}")
finally:
    csv_file.close()
    raw_file.close()
    if 'ser' in locals() and ser.is_open:
        ser.close()
    print("✅ Files closed. Goodbye!")