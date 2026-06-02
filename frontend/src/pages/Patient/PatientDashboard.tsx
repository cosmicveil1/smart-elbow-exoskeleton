import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE = "http://localhost:8001";

interface Exercise {
  id: number;
  name: string;
  description: string | null;
  mode: string;
  target_angle: number;
  target_value: number;
  duration_seconds: number;
}

interface Prescription {
  id: number;
  patient_id: number;
  exercise_id: number;
  status: string;
  completion_percentage: number;
  exercise: Exercise;
}

const PatientDashboard = () => {
  const { logout } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  // Connection mode selection: 'simulator' | 'live'
  const [demoMode, setDemoMode] = useState<'simulator' | 'live'>('simulator');
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Calibration simulator states
  const [simulating, setSimulating] = useState(false);
  const [simAngle, setSimAngle] = useState(0);
  const [simProgress, setSimProgress] = useState(0);
  const [simDurationLeft, setSimDurationLeft] = useState(0);
  const [simStatusText, setSimStatusText] = useState('Idle');
  const [simAutoPlay, setSimAutoPlay] = useState(true);
  const [simSessionId, setSimSessionId] = useState<number | null>(null);

  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadPatientData = async () => {
    try {
      // Seed user "patient" has ID 2
      const response = await axios.get(`${API_BASE}/exercises/prescriptions/patient/2`);
      setPrescriptions(response.data);
      if (response.data.length > 0 && !selectedPrescription) {
        setSelectedPrescription(response.data[0]);
      }
    } catch (err) {
      console.warn("Could not fetch prescriptions.");
    }
  };

  const loadSessionsList = async () => {
    try {
      const res = await axios.get(`${API_BASE}/sessions/patient/2`);
      setSessions(res.data);
      if (res.data.length > 0) {
        setSelectedSessionId(res.data[0].id.toString());
      }
    } catch (err) {
      console.warn("Could not load sessions list.");
    }
  };

  useEffect(() => {
    loadPatientData();
    loadSessionsList();
  }, []);

  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  const startExerciseSimulation = async () => {
    if (!selectedPrescription) return;
    setSimulating(true);
    setSimProgress(0);
    setSimAngle(0);
    setSimDurationLeft(selectedPrescription.exercise.duration_seconds || 60);
    setSimStatusText("Starting calibration session...");

    let newSessionId: number | null = null;

    // 1. Create a dynamic session in database
    try {
      const sessionRes = await axios.post(`${API_BASE}/sessions/`, {
        patient_id: "2", // Seed patient John Doe is ID 2
        session_name: `React-TS-Sim: ${selectedPrescription.exercise.name}`,
        notes: `Simulated rehabilitation session. Mode: ${selectedPrescription.exercise.mode}`
      });
      newSessionId = sessionRes.data.id;
      setSimSessionId(newSessionId);
      setSimStatusText("Session logged. Start moving!");
    } catch (err) {
      console.warn("Could not register session in backend. Running locally.");
    }

    const duration = selectedPrescription.exercise.duration_seconds || 60;
    const targetAngle = selectedPrescription.exercise.target_angle;
    
    let ticks = 0;
    let currentCompleteness = 0;

    if (simTimerRef.current) clearInterval(simTimerRef.current);

    let sweepDirection = 1;
    let localAngle = 0;

    simTimerRef.current = setInterval(async () => {
      ticks += 1;
      const timeLeft = duration - ticks;
      setSimDurationLeft(timeLeft);

      // Auto-simulate angle sweep
      if (simAutoPlay) {
        if (sweepDirection === 1) {
          localAngle += 6;
          if (localAngle >= targetAngle + 10) sweepDirection = -1;
        } else {
          localAngle -= 6;
          if (localAngle <= 0) sweepDirection = 1;
        }
        setSimAngle(localAngle);
      }

      // Proximity check
      const currentAngleToEvaluate = simAutoPlay ? localAngle : simAngle;
      const angleDelta = Math.abs(currentAngleToEvaluate - targetAngle);
      const isTargetMet = angleDelta <= 8; // tolerance band

      if (isTargetMet) {
        currentCompleteness = Math.min(100, currentCompleteness + (100 / (duration / 2.5))); 
        setSimStatusText(`🎯 Target matched! Angle: ${currentAngleToEvaluate.toFixed(1)}°`);
      } else {
        setSimStatusText(`Flex elbow to target: ${targetAngle}° (Current: ${currentAngleToEvaluate.toFixed(1)}°)`);
      }

      const formattedProgress = Math.round(currentCompleteness);
      setSimProgress(formattedProgress);

      // Post telemetry
      if (newSessionId && ticks % 2 === 0) {
        try {
          await axios.post(`${API_BASE}/data/`, {
            session_id: newSessionId,
            count: Math.round(currentAngleToEvaluate * 22.75), 
            angle_degrees: parseFloat(currentAngleToEvaluate.toFixed(2)),
            rotations: Math.floor(currentAngleToEvaluate / 360),
            raw_data: `${Math.round(currentAngleToEvaluate * 22.75)}, ${currentAngleToEvaluate.toFixed(2)}, 0`
          });
        } catch (e) {
          console.error("Failed to stream telemetry:", e);
        }
      }

      // Sync database completion percentage
      if (ticks % 5 === 0 || timeLeft <= 0) {
        try {
          await axios.put(`${API_BASE}/exercises/prescriptions/${selectedPrescription.id}`, {
            completion_percentage: parseFloat(formattedProgress.toFixed(1)),
            status: formattedProgress >= 95 ? "completed" : "active"
          });
        } catch (e) {
          console.error("Failed to sync progress:", e);
        }
      }

      if (timeLeft <= 0) {
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        setSimulating(false);
        setSimStatusText("Session complete! Great job.");
        loadPatientData(); 
      }

    }, 1000);
  };

  const stopExerciseSimulation = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    setSimulating(false);
    setSimStatusText("Calibration aborted.");
    loadPatientData();
  };

  const startLiveFeed = async () => {
    if (!selectedPrescription || !selectedSessionId) return;
    setSimulating(true);
    setSimProgress(0);
    setSimAngle(0);
    setSimDurationLeft(selectedPrescription.exercise.duration_seconds || 60);
    setSimStatusText("Listening to live exoskeleton feed...");

    const duration = selectedPrescription.exercise.duration_seconds || 60;
    const targetAngle = selectedPrescription.exercise.target_angle;
    const sessionId = parseInt(selectedSessionId);

    let ticks = 0;
    let currentCompleteness = 0;

    if (simTimerRef.current) clearInterval(simTimerRef.current);

    simTimerRef.current = setInterval(async () => {
      ticks += 1;
      const timeLeft = duration - ticks;
      setSimDurationLeft(timeLeft);

      // Poll latest telemetry for this session from DB
      try {
        const res = await axios.get(`${API_BASE}/data/?session_id=${sessionId}&limit=1`);
        if (res.data && res.data.length > 0) {
          const latestPoint = res.data[0];
          const currentAngle = latestPoint.angle_degrees;
          setSimAngle(currentAngle);

          // Proximity check
          const angleDelta = Math.abs(currentAngle - targetAngle);
          const isTargetMet = angleDelta <= 8; // tolerance band

          if (isTargetMet) {
            currentCompleteness = Math.min(100, currentCompleteness + (100 / (duration / 2.5)));
            setSimStatusText(`🎯 Target matched! Exo Angle: ${currentAngle.toFixed(1)}°`);
          } else {
            setSimStatusText(`Move exo to target: ${targetAngle}° (Current: ${currentAngle.toFixed(1)}°)`);
          }
        } else {
          setSimStatusText("Waiting for serial packets from Arduino...");
        }
      } catch (err) {
        console.warn("Failed to fetch live telemetry packet.");
      }

      const formattedProgress = Math.round(currentCompleteness);
      setSimProgress(formattedProgress);

      // Sync progress to DB
      if (ticks % 5 === 0 || timeLeft <= 0) {
        try {
          await axios.put(`${API_BASE}/exercises/prescriptions/${selectedPrescription.id}`, {
            completion_percentage: parseFloat(formattedProgress.toFixed(1)),
            status: formattedProgress >= 95 ? "completed" : "active"
          });
        } catch (e) {
          console.error("Failed to sync progress:", e);
        }
      }

      if (timeLeft <= 0) {
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        setSimulating(false);
        setSimStatusText("Session complete! Great job.");
        loadPatientData();
      }

    }, 1000);
  };

  const stopLiveFeed = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    setSimulating(false);
    setSimStatusText("Live stream stopped.");
    loadPatientData();
  };

  const handleStart = () => {
    if (demoMode === 'live') {
      startLiveFeed();
    } else {
      startExerciseSimulation();
    }
  };

  const handleStop = () => {
    if (demoMode === 'live') {
      stopLiveFeed();
    } else {
      stopExerciseSimulation();
    }
  };

  // SVGArm dynamic geometry
  const targetAngleVal = selectedPrescription?.exercise.target_angle || 90;
  const angleRad = (simAngle * Math.PI) / 180;
  const armX = 120 + 80 * Math.cos(angleRad);
  const armY = 100 - 80 * Math.sin(angleRad);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🦾</div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Elbow Rehab Platform</h1>
              <p className="text-sm text-gray-500">Patient Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-sm">
              Patient Profile: <span className="font-semibold text-indigo-600 capitalize">John Doe</span>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Exercises Sidebar list */}
          <div className="bg-white p-5 rounded-2xl shadow flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-3">My Routines</h3>
            <div className="space-y-3">
              {prescriptions.map(pres => (
                <div 
                  key={pres.id}
                  onClick={() => {
                    if (!simulating) setSelectedPrescription(pres);
                  }}
                  className={`p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                    simulating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    selectedPrescription?.id === pres.id 
                      ? 'bg-indigo-50 border-indigo-600 text-gray-800' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-gray-800">{pres.exercise.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">Mode: {pres.exercise.mode}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full" style={{ width: `${pres.completion_percentage}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold">{Math.round(pres.completion_percentage)}%</span>
                  </div>
                </div>
              ))}
              {prescriptions.length === 0 && (
                <p className="text-gray-400 text-xs text-center py-4">No exercises prescribed.</p>
              )}
            </div>
          </div>

          {/* Simulator Panel */}
          <div className="md:col-span-3">
            {selectedPrescription ? (
              <div className="bg-white p-6 rounded-2xl shadow space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedPrescription.exercise.name}</h2>
                  <p className="text-xs text-gray-500 mt-1">{selectedPrescription.exercise.description}</p>
                </div>

                {/* Target Parameters Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Target Angle</div>
                    <div className="text-xl font-extrabold text-indigo-600 mt-1">{selectedPrescription.exercise.target_angle}°</div>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Target Value</div>
                    <div className="text-xl font-extrabold text-indigo-600 mt-1">
                      {selectedPrescription.exercise.target_value} ({selectedPrescription.exercise.mode})
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Workout Time</div>
                    <div className="text-xl font-extrabold text-indigo-600 mt-1">{selectedPrescription.exercise.duration_seconds}s</div>
                  </div>
                </div>

                {/* Visual simulator arm */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                  <div className="lg:col-span-2 space-y-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">Live Joint Skeletal Arm Feedback</h4>
                    <div className="visualizer-bg h-[240px] rounded-xl flex items-center justify-center border">
                      <svg width="240" height="200" viewBox="0 0 240 200">
                        {/* Sector target arc */}
                        {(() => {
                          const targetRad = (targetAngleVal * Math.PI) / 180;
                          return (
                            <path 
                              d={`M 120 100 L 190 100 A 70 70 0 0 0 ${120 + 70 * Math.cos(targetRad)} ${100 - 70 * Math.sin(targetRad)} Z`} 
                              fill="rgba(79, 70, 229, 0.12)" 
                              stroke="rgba(79, 70, 229, 0.3)" 
                            />
                          );
                        })()}

                        {/* Static upper arm segments */}
                        <line x1="50" y1="100" x2="120" y2="100" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
                        <circle cx="50" cy="100" r="8" fill="#475569" />
                        
                        {/* Center joint pivot */}
                        <circle cx="120" cy="100" r="16" fill="#0f172a" stroke="#4f46e5" strokeWidth="3" />
                        <circle cx="120" cy="100" r="6" fill="#4f46e5" />

                        {/* Moving forearm */}
                        <line x1="120" y1="100" x2={armX} y2={armY} stroke="#4f46e5" strokeWidth="10" strokeLinecap="round" />
                        <line x1="120" y1="100" x2={armX} y2={armY} stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                        <circle cx={armX} cy={armY} r="5" fill="#ec4899" />

                        {/* Labels */}
                        <text x="120" y="165" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                          Angle: {simAngle.toFixed(1)}°
                        </text>
                      </svg>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 text-center">
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Completeness Index</div>
                      <div className="text-3xl font-extrabold text-indigo-600 mt-2">{simProgress}%</div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mt-3">
                        <div className="bg-indigo-600 h-full" style={{ width: `${simProgress}%` }}></div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1 text-left bg-gray-50 p-4 border rounded-xl">
                      <div>Time Remaining: <strong>{simDurationLeft}s</strong></div>
                      <div>Ingestion Port: <strong>COM6 ({demoMode === 'live' ? 'Live Exoskeleton' : 'Virtual'})</strong></div>
                      {demoMode === 'simulator' && simSessionId && (
                        <div>Sim Session ID: <strong>#{simSessionId}</strong></div>
                      )}
                      {demoMode === 'live' && selectedSessionId && (
                        <div>Live Session ID: <strong>#{selectedSessionId}</strong></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Control adjustments */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                  {/* Mode Selector Group */}
                  <div className="flex bg-gray-200/65 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => !simulating && setDemoMode('simulator')}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                        demoMode === 'simulator'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      } ${simulating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      💻 Simulator Mode (Offline)
                    </button>
                    <button
                      type="button"
                      onClick={() => !simulating && setDemoMode('live')}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                        demoMode === 'live'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      } ${simulating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      🔌 Exoskeleton COM6 Mode (Live)
                    </button>
                  </div>

                  {demoMode === 'simulator' ? (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-500">EXOSKELETON SIMULATOR CONTROLS</span>
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-600">
                          <input 
                            type="checkbox" 
                            checked={simAutoPlay}
                            onChange={(e) => setSimAutoPlay(e.target.checked)}
                            disabled={!simulating}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Enable Auto Sweep
                        </label>
                      </div>

                      <input 
                        type="range" 
                        min="0" 
                        max="140" 
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        value={simAngle}
                        onChange={(e) => {
                          if (simulating) {
                            setSimAngle(parseInt(e.target.value));
                            setSimAutoPlay(false);
                          }
                        }}
                        disabled={!simulating}
                      />
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-500">HARDWARE COM6 TELEMETRY LINK</span>
                        <button
                          type="button"
                          onClick={loadSessionsList}
                          disabled={simulating}
                          className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer disabled:opacity-50"
                        >
                          Refresh Sessions
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <select
                          className="flex-1 px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                          value={selectedSessionId}
                          onChange={(e) => setSelectedSessionId(e.target.value)}
                          disabled={simulating}
                        >
                          {sessions.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.session_name || `Session #${s.id}`} (ID: {s.id})
                            </option>
                          ))}
                          {sessions.length === 0 && (
                            <option value="">No hardware sessions found</option>
                          )}
                        </select>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Instructions: Start the Python collector first: <code>python collector/elbow_encoder.py</code>. Then select your session and click connect below.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    {!simulating ? (
                      <button 
                        onClick={handleStart}
                        disabled={demoMode === 'live' && !selectedSessionId}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {demoMode === 'live' ? 'Connect Live Exoskeleton Feed' : 'Start Rehab Simulator'}
                      </button>
                    ) : (
                      <button 
                        onClick={handleStop}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-xs transition cursor-pointer"
                      >
                        {demoMode === 'live' ? 'Disconnect Feed' : 'Stop Calibration & Save'}
                      </button>
                    )}
                  </div>

                  <div className="text-[10px] text-gray-500 uppercase text-center tracking-wider">
                    Status: <strong className="text-indigo-600">{simStatusText}</strong>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow text-center text-gray-400 text-sm">
                Select an exercise from the routines list to launch the calibration simulator.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
