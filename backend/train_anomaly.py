import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import IsolationForest
import joblib
import os

def engineer_features(df):
    """Calculates time-series features needed for anomaly detection."""
    df = df.copy()
    # delta_angle: change in angle since the last reading
    df['delta_angle'] = df['current_angle'].diff().fillna(0)
    # rolling_variance: how much the angle is changing over a 1-second window (10 rows)
    df['rolling_variance'] = df['current_angle'].rolling(window=10).var().fillna(0)
    return df

def train_and_visualize():
    print("Loading baseline data...")
    try:
        df_normal = pd.read_csv("ml_normal_baseline.csv")
    except FileNotFoundError:
        print("Error: ml_normal_baseline.csv not found!")
        return

    # 1. Train on the entire clean baseline
    train_data = df_normal.copy()
    print(f"Loaded {len(train_data)} clean rows for training.")

    # 2. Feature Engineering on Training Data
    print("Engineering features for training data...")
    train_data = engineer_features(train_data)
    features = ['error', 'delta_angle', 'rolling_variance']
    X_train = train_data[features]

    # 3. Train the Isolation Forest
    print("Training Isolation Forest on clean baseline...")
    # contamination=0.01 means we assume 1% of our "clean" training data might be noise
    model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
    model.fit(X_train)
    
    # Save the model
    os.makedirs("ml_models", exist_ok=True)
    model_path = "ml_models/anomaly_detector_v1.pkl"
    joblib.dump(model, model_path)
    print(f"✅ Model saved to {model_path}")

    # 4. Load Test Data (Real Anomalies)
    print("Loading anomaly test data...")
    test_frames = []
    
    # The physically generated anomalies
    try:
        df_anomaly = pd.read_csv("ml_anomaly.csv")
        print(f"Loaded {len(df_anomaly)} rows from ml_anomaly.csv")
        test_frames.append(df_anomaly)
    except FileNotFoundError:
        print("Notice: ml_anomaly.csv not found yet. Please run the collector!")
        return

    test_data = pd.concat(test_frames, ignore_index=True)
    
    # Feature Engineering on Test Data
    test_data = engineer_features(test_data)
    X_test = test_data[features]

    # 5. Predict Anomalies (-1 = Anomaly, 1 = Normal)
    print("Predicting anomalies on the test set...")
    test_data['anomaly_score'] = model.decision_function(X_test)
    test_data['is_anomaly'] = model.predict(X_test)

    # 6. Visualization (Only plotting the test set to clearly see anomalies)
    print("Generating Visualization Plot...")
    plt.figure(figsize=(15, 6))
    
    normal = test_data[test_data['is_anomaly'] == 1]
    anomalies = test_data[test_data['is_anomaly'] == -1]
    
    plt.scatter(normal.index, normal['current_angle'], color='blue', s=2, label='Normal Readings', alpha=0.5)
    plt.scatter(anomalies.index, anomalies['current_angle'], color='red', s=15, label='Anomaly Detected!', zorder=5)
    
    plt.title('Exoskeleton Kinematics - Test Set Anomalies')
    plt.xlabel('Time (Rows)')
    plt.ylabel('Current Angle (Degrees)')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()

    plot_path = "anomaly_results.png"
    plt.savefig(plot_path, dpi=300)
    print(f"✅ Saved test visualization graph to {plot_path}!")

if __name__ == "__main__":
    train_and_visualize()
