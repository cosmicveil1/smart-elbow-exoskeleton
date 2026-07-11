import csv
import sys
from database import SessionLocal
try:
    from models import ElbowData, PatientSession
except ImportError:
    from models.models import ElbowData, PatientSession

def export_to_csv():
    db = SessionLocal()
    
    # Query all telemetry data, ordered by time
    query = db.query(
        ElbowData.id,
        PatientSession.session_name,
        ElbowData.timestamp,
        ElbowData.target_angle,
        ElbowData.angle_degrees,
        ElbowData.error,
        ElbowData.motor_status
    ).join(PatientSession).order_by(ElbowData.timestamp.asc()).all()
    
    if not query:
        print("⚠️ No data found in the database. Run the exoskeleton first!")
        return

    # Use command line argument if provided, otherwise default to anomaly
    csv_filename = sys.argv[1] if len(sys.argv) > 1 else "ml_anomaly.csv"
    
    with open(csv_filename, mode='w', newline='') as file:
        writer = csv.writer(file)
        
        # Write the Header row
        writer.writerow([
            "id", 
            "session_name", 
            "timestamp", 
            "target_angle", 
            "current_angle", 
            "error", 
            "motor_status"
        ])
        
        # Write the Data rows
        for row in query:
            writer.writerow([
                row.id,
                row.session_name,
                row.timestamp,
                row.target_angle,
                row.angle_degrees,
                row.error,
                row.motor_status
            ])
            
    print(f"✅ Successfully exported {len(query)} rows of telemetry to {csv_filename}!")
    db.close()

if __name__ == "__main__":
    export_to_csv()
