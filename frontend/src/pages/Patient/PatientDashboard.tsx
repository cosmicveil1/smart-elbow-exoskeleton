import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertOctagon } from 'lucide-react';

const API_BASE = "http://localhost:8000";

interface Exercise {
  id: number;
  name: string;
  description: string | null;
  mode: string;
  joint: string;
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
  assigned_at: string;
  exercise: Exercise;
  target_cycles: number;
}

const PatientDashboard = () => {
  const { logout } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [activeJointTab, setActiveJointTab] = useState<string>('Elbow');

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
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);

  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sendCommand = async (type: string, value: number | null = null) => {
    try {
      await axios.post(`${API_BASE}/commands/`, {
        patient_id: 2,
        command_type: type,
        value: value
      });
    } catch (e) {
      console.error("Failed to send command", e);
    }
  };

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
    setTelemetryHistory([]);
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
    const exerciseName = selectedPrescription.exercise.name;
    let maxAngle = targetAngle;
    let minAngle = 0;
    
    if (exerciseName.includes("Pronation")) {
      maxAngle = 180;
      minAngle = 0;
    } else if (exerciseName.includes("Deviation")) {
      maxAngle = 30;
      minAngle = -20;
    } else if (exerciseName.includes("Rotation")) {
      maxAngle = 90;
      minAngle = -70;
    }

    const targetCycles = selectedPrescription.target_cycles || 1;
    let ticks = 0;
    let currentCompleteness = 0;
    let cycleCount = 0;
    let cyclePhase = 0; // 0 = flex to target, 1 = return to minAngle

    if (simTimerRef.current) clearInterval(simTimerRef.current);

    let sweepDirection = 1;
    let localAngle = minAngle;

    simTimerRef.current = setInterval(async () => {
      ticks += 1;
      const timeLeft = duration - ticks;
      setSimDurationLeft(timeLeft);

      // Auto-simulate angle sweep
      if (simAutoPlay) {
        if (sweepDirection === 1) {
          localAngle += 6;
          if (localAngle >= maxAngle) sweepDirection = -1;
        } else {
          localAngle -= 6;
          if (localAngle <= minAngle) sweepDirection = 1;
        }
        setSimAngle(localAngle);
      }

      // Proximity check based on phase
      const currentAngleToEvaluate = simAutoPlay ? localAngle : simAngle;
      const targetForPhase = cyclePhase === 0 ? maxAngle : minAngle;
      const angleDelta = Math.abs(currentAngleToEvaluate - targetForPhase);
      const isTargetMet = angleDelta <= 8; // tolerance band

      if (isTargetMet) {
        if (cyclePhase === 0) {
          cyclePhase = 1;
        } else {
          cycleCount += 1;
          if (cycleCount >= targetCycles) {
            currentCompleteness = 100;
          } else {
            cyclePhase = 0;
          }
        }
      }

      if (cycleCount < targetCycles) {
        setSimStatusText(`Cycle ${cycleCount + 1}/${targetCycles} | Phase: ${cyclePhase === 0 ? 'Flexing' : 'Returning'} | Angle: ${currentAngleToEvaluate.toFixed(1)}°`);
        currentCompleteness = Math.min(100, (cycleCount / targetCycles) * 100 + (cyclePhase === 1 ? (50/targetCycles) : 0));
      } else {
        setSimStatusText(`🎯 All ${targetCycles} simulated cycles complete!`);
      }

      setTelemetryHistory(prev => {
        const newHist = [...prev, { time: prev.length, current: currentAngleToEvaluate, target: targetAngle }];
        if (newHist.length > 50) newHist.shift();
        return newHist;
      });

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
    setTelemetryHistory([]);
    setSimDurationLeft(selectedPrescription.exercise.duration_seconds || 60);
    setSimStatusText("Listening to live exoskeleton feed...");

    const duration = selectedPrescription.exercise.duration_seconds || 60;
    const targetAngle = selectedPrescription.exercise.target_angle;
    const targetCycles = selectedPrescription.target_cycles || 1;
    const sessionId = parseInt(selectedSessionId);
    const exerciseName = selectedPrescription.exercise.name;
    
    let minAngle = 0;
    if (exerciseName.includes("Deviation")) minAngle = -20;
    if (exerciseName.includes("Rotation")) minAngle = -70;

    let ticks = 0;
    let currentCompleteness = 0;
    let cycleCount = 0;
    let cyclePhase = 0; // 0 = Moving to target, 1 = Returning to minAngle

    if (simTimerRef.current) clearInterval(simTimerRef.current);

    // Initial command to hardware
    try {
      await axios.post(`${API_BASE}/commands/`, { command_type: 'TARGET_ANGLE', value: targetAngle });
    } catch(e) { console.error("Initial target command failed", e) }

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

          // Proximity check for current phase
          const targetForPhase = cyclePhase === 0 ? targetAngle : minAngle;
          const angleDelta = Math.abs(currentAngle - targetForPhase);
          const isTargetMet = angleDelta <= 8; // tolerance band

          if (isTargetMet) {
            if (cyclePhase === 0) {
              // Reached max target. Now go back to minAngle.
              cyclePhase = 1;
              try {
                await axios.post(`${API_BASE}/commands/`, { command_type: 'TARGET_ANGLE', value: minAngle });
              } catch(e) {}
            } else {
              // Reached minAngle. One full cycle complete.
              cycleCount += 1;
              if (cycleCount >= targetCycles) {
                currentCompleteness = 100;
              } else {
                cyclePhase = 0;
                try {
                  await axios.post(`${API_BASE}/commands/`, { command_type: 'TARGET_ANGLE', value: targetAngle });
                } catch(e) {}
              }
            }
          }
          
          if (cycleCount < targetCycles) {
            setSimStatusText(`Cycle ${cycleCount + 1}/${targetCycles} | Phase: ${cyclePhase === 0 ? 'Flexing' : 'Returning'} | Exo Angle: ${currentAngle.toFixed(1)}°`);
            currentCompleteness = Math.min(100, (cycleCount / targetCycles) * 100 + (cyclePhase === 1 ? (50/targetCycles) : 0));
          } else {
            setSimStatusText(`All ${targetCycles} cycles complete!`);
          }

          setTelemetryHistory(prev => {
            const newHist = [...prev, { time: prev.length, current: currentAngle, target: targetAngle }];
            if (newHist.length > 50) newHist.shift();
            return newHist;
          });
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

  // Dynamic geometry based on joint type
  const jointType = selectedPrescription?.exercise.joint || 'Elbow';
  const exerciseName = selectedPrescription?.exercise.name || '';
  const movingLength = jointType === 'Wrist' ? 45 : (jointType === 'Shoulder' ? 85 : 80);
  const targetAngleVal = selectedPrescription?.exercise.target_angle || 90;
  
  let visualAngleOffset = 0;
  if (jointType === 'Shoulder') {
    if (exerciseName.includes("Rotation")) {
      visualAngleOffset = 90; // Top-Down view, neutral points UP
    } else {
      visualAngleOffset = -90; // Flexion/Abduction starts pointing DOWN
    }
  } else if (jointType === 'Wrist' && exerciseName.includes("Deviation")) {
    visualAngleOffset = -90; // Top down view starts pointing down
  }

  const angleRad = ((simAngle + visualAngleOffset) * Math.PI) / 180;
  const armX = 120 + movingLength * Math.cos(angleRad);
  const armY = 100 - movingLength * Math.sin(angleRad);

  const filteredPrescriptions = prescriptions.filter(p => p.exercise.joint === activeJointTab);

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
            
            {/* Joint Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {['Wrist', 'Elbow', 'Shoulder'].map(joint => (
                <button
                  key={joint}
                  onClick={() => {
                    setActiveJointTab(joint);
                    // Optionally clear selection if switching joints
                    // setSelectedPrescription(null); 
                  }}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                    activeJointTab === joint
                      ? 'bg-white text-indigo-600 shadow'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {joint}
                </button>
              ))}
            </div>

            <div className="space-y-3 mt-2">
              {filteredPrescriptions.map(pres => (
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
              {filteredPrescriptions.length === 0 && (
                <p className="text-gray-400 text-xs text-center py-4">No routines for {activeJointTab}.</p>
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
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Target Cycles</div>
                    <div className="text-xl font-extrabold text-indigo-600 mt-1">
                      {selectedPrescription.target_cycles}
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
                          const startRad = (visualAngleOffset * Math.PI) / 180;
                          const targetRad = ((targetAngleVal + visualAngleOffset) * Math.PI) / 180;
                          
                          const startX = 120 + 70 * Math.cos(startRad);
                          const startY = 100 - 70 * Math.sin(startRad);
                          const endX = 120 + 70 * Math.cos(targetRad);
                          const endY = 100 - 70 * Math.sin(targetRad);
                          
                          return (
                            <path 
                              d={`M 120 100 L ${startX} ${startY} A 70 70 0 0 0 ${endX} ${endY} Z`} 
                              fill="rgba(79, 70, 229, 0.12)" 
                              stroke="rgba(79, 70, 229, 0.3)" 
                            />
                          );
                        })()}

                        {/* Viewport label */}
                        <text x="10" y="20" fill="#94a3b8" fontSize="10" fontWeight="bold">
                          {(selectedPrescription?.exercise.name.includes("Deviation") || selectedPrescription?.exercise.name.includes("Rotation")) ? "[Top-Down View]" : 
                           selectedPrescription?.exercise.name.includes("Pronation") ? "[Axial Rotation View]" :
                           selectedPrescription?.exercise.name.includes("Abduction") ? "[Frontal View]" :
                           "[Side Profile View]"}
                        </text>

                        {/* Conditionally render static parts based on joint and exercise */}
                        {jointType === 'Shoulder' ? (
                          <>
                            {selectedPrescription?.exercise.name.includes("Rotation") ? (
                              <>
                                {/* Top-Down View: Head and shoulders */}
                                <circle cx="120" cy="150" r="20" fill="#475569" />
                                <line x1="60" y1="100" x2="120" y2="100" stroke="#334155" strokeWidth="24" strokeLinecap="round" />
                                <text x="120" y="155" textAnchor="middle" fill="#0f172a" fontSize="14" fontWeight="bold">T</text>
                              </>
                            ) : selectedPrescription?.exercise.name.includes("Abduction") ? (
                              <>
                                {/* Frontal View: Draw other shoulder and head in middle */}
                                <line x1="80" y1="100" x2="120" y2="100" stroke="#334155" strokeWidth="24" strokeLinecap="round" />
                                <circle cx="100" cy="50" r="20" fill="#475569" />
                                <line x1="100" y1="70" x2="100" y2="100" stroke="#334155" strokeWidth="12" />
                                {/* Torso */}
                                <line x1="120" y1="100" x2="120" y2="190" stroke="#334155" strokeWidth="24" strokeLinecap="round" />
                              </>
                            ) : (
                              <>
                                {/* Side View: Head directly above */}
                                <circle cx="120" cy="50" r="20" fill="#475569" />
                                <line x1="120" y1="70" x2="120" y2="100" stroke="#334155" strokeWidth="12" />
                                {/* Torso */}
                                <line x1="120" y1="100" x2="120" y2="190" stroke="#334155" strokeWidth="24" strokeLinecap="round" />
                              </>
                            )}
                          </>
                        ) : jointType === 'Wrist' ? (
                          <>
                            {selectedPrescription?.exercise.name.includes("Deviation") ? (
                              <>
                                {/* Top-down view: Forearm comes from the bottom */}
                                <line x1="120" y1="200" x2="120" y2="100" stroke="#334155" strokeWidth="16" strokeLinecap="round" />
                                <circle cx="120" cy="200" r="10" fill="#475569" />
                              </>
                            ) : selectedPrescription?.exercise.name.includes("Pronation") ? (
                              <>
                                {/* Axial View: Forearm coming out of screen */}
                                <circle cx="120" cy="100" r="25" fill="#334155" />
                                <circle cx="120" cy="100" r="15" fill="#475569" />
                                {/* Rotational Arrow graphic */}
                                <path d="M 90 100 A 30 30 0 1 1 150 100" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
                                <polygon points="150,100 145,95 155,95" fill="#64748b" />
                              </>
                            ) : (
                              <>
                                {/* Side profile: Forearm horizontal */}
                                <line x1="20" y1="100" x2="120" y2="100" stroke="#334155" strokeWidth="16" strokeLinecap="round" />
                                <circle cx="20" cy="100" r="10" fill="#475569" />
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Upper Arm (Default Elbow) */}
                            <line x1="50" y1="100" x2="120" y2="100" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
                            <circle cx="50" cy="100" r="8" fill="#475569" />
                          </>
                        )}
                        
                        {/* Center joint pivot */}
                        <circle cx="120" cy="100" r="16" fill="#0f172a" stroke="#4f46e5" strokeWidth="3" />
                        <circle cx="120" cy="100" r="6" fill="#4f46e5" />

                        {/* Moving segment */}
                        <line 
                          x1="120" y1="100" x2={armX} y2={armY} 
                          stroke="#4f46e5" 
                          strokeWidth={jointType === 'Wrist' ? 14 : 10} 
                          strokeLinecap="round" 
                        />
                        <line 
                          x1="120" y1="100" x2={armX} y2={armY} 
                          stroke="#ffffff" 
                          strokeWidth="3" 
                          strokeLinecap="round" 
                        />
                        <circle cx={armX} cy={armY} r={jointType === 'Wrist' ? 7 : 5} fill="#ec4899" />

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

                {/* Live Graph & Safety Controls */}
                <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 space-y-3 relative overflow-hidden shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                      <h4 className="text-white font-bold text-sm tracking-wide">Live Performance Telemetry</h4>
                    </div>
                    
                    <button 
                      onClick={() => sendCommand('STOP')}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-4 rounded-lg flex items-center gap-2 shadow-lg transition transform hover:scale-105 active:scale-95 border border-red-400 text-xs"
                    >
                      <AlertOctagon size={16} />
                      EMERGENCY STOP
                    </button>
                  </div>

                  <div className="h-48 w-full bg-gray-800/50 rounded-lg p-2 border border-gray-700">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={telemetryHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis 
                          domain={[-30, Math.max(150, targetAngleVal + 20)]} 
                          stroke="#94a3b8" 
                          tick={{ fill: '#94a3b8', fontSize: 10 }} 
                          width={40} 
                          label={{ value: 'Angle (°)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                          itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Line 
                          type="monotone" 
                          dataKey="current" 
                          name="Current Angle" 
                          stroke="#8b5cf6" 
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4, fill: "#8b5cf6", stroke: "#fff" }} 
                          isAnimationActive={false}
                        />
                        <Line 
                          type="stepAfter" 
                          dataKey="target" 
                          name="Target Angle" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
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
