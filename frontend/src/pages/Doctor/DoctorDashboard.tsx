import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertOctagon, Crosshair } from 'lucide-react';

const API_BASE = "http://localhost:8000";

interface Patient {
  id: number;
  username: string;
  full_name: string;
  role: string;
  clinical_info: string | null;
}

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
  exercise: Exercise;
}

const DoctorDashboard = () => {
  const { logout } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [prescribeTargetCycles, setPrescribeTargetCycles] = useState('5');

  // Create exercise states
  const [newExName, setNewExName] = useState('');
  const [newExDesc, setNewExDesc] = useState('');
  const [newExJoint, setNewExJoint] = useState('Elbow');
  const [newExMode, setNewExMode] = useState('position');
  const [newExTargetAngle, setNewExTargetAngle] = useState('90');
  const [newExTargetValue, setNewExTargetValue] = useState('9.0');
  const [newExDuration, setNewExDuration] = useState('60');

  // Live Telemetry & Control State
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [manualTarget, setManualTarget] = useState('90');
  const [manualCycles, setManualCycles] = useState('1');
  const [cycleStatus, setCycleStatus] = useState('');
  const manualControlRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    try {
      // Get Patients
      const patientsRes = await axios.get(`${API_BASE}/users/patients`);
      setPatients(patientsRes.data);
      if (patientsRes.data.length > 0) {
        setSelectedPatient(patientsRes.data[0]);
      }

      // Get templates
      const exRes = await axios.get(`${API_BASE}/exercises/`);
      setExercises(exRes.data);
      if (exRes.data.length > 0) {
        setSelectedExerciseId(exRes.data[0].id.toString());
      }
    } catch (err) {
      console.warn("Could not fetch from backend. Running with mock fallback data.");
      // Fallback
      setPatients([
        { id: 2, username: "patient", full_name: "John Doe", role: "patient", clinical_info: "Rehab post tendon surgery." },
        { id: 10, username: "rahul", full_name: "Rahul Sharma", role: "patient", clinical_info: "Elbow flexion-extension." }
      ]);
    }
  };

  const loadPatientDetails = async () => {
    if (!selectedPatient) return;
    try {
      const presRes = await axios.get(`${API_BASE}/exercises/prescriptions/patient/${selectedPatient.id}`);
      setPrescriptions(presRes.data);
    } catch (err) {
      // Mock prescriptions on failure
      setPrescriptions([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientDetails();
    }
  }, [selectedPatient]);

  // Poll live telemetry every second
  useEffect(() => {
    if (!selectedPatient) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/data/?limit=30`);
        // Reverse so chronological order is left to right
        setTelemetry(res.data.reverse());
      } catch (e) {}
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedPatient]);

  const sendCommand = async (type: string, value: number | null = null) => {
    if (!selectedPatient) return;
    
    // If user clicked Emergency Stop or Zero, cancel any running manual cycles
    if (type === 'STOP' || type === 'ZERO') {
      if (manualControlRef.current) clearInterval(manualControlRef.current);
      setCycleStatus('');
    }

    try {
      await axios.post(`${API_BASE}/commands/`, {
        patient_id: selectedPatient.id,
        command_type: type,
        value: value
      });
      // Silent success for UI fluidity
    } catch (e) {
      console.error("Failed to send command");
    }
  };

  const executeManualCycles = async () => {
    if (!selectedPatient) return;
    
    const targetAngle = parseFloat(manualTarget);
    const targetCycles = parseInt(manualCycles);
    let cycleCount = 0;
    let cyclePhase = 0; // 0 = flex to target, 1 = return to 0
    let minAngle = 0;

    if (manualControlRef.current) clearInterval(manualControlRef.current);
    
    setCycleStatus(`Cycle 1/${targetCycles} | Phase: Flexing`);
    sendCommand('TARGET_ANGLE', targetAngle);

    manualControlRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/data/?limit=1`);
        if (res.data && res.data.length > 0) {
          const currentAngle = res.data[0].angle_degrees;
          const targetForPhase = cyclePhase === 0 ? targetAngle : minAngle;
          const isTargetMet = Math.abs(currentAngle - targetForPhase) <= 8;

          if (isTargetMet) {
            if (cyclePhase === 0) {
              cyclePhase = 1;
              sendCommand('TARGET_ANGLE', minAngle);
            } else {
              cycleCount += 1;
              if (cycleCount >= targetCycles) {
                if (manualControlRef.current) clearInterval(manualControlRef.current);
                setCycleStatus(`All ${targetCycles} cycles completed!`);
                return;
              } else {
                cyclePhase = 0;
                sendCommand('TARGET_ANGLE', targetAngle);
              }
            }
          }
          
          if (cycleCount < targetCycles) {
            setCycleStatus(`Cycle ${cycleCount + 1}/${targetCycles} | Phase: ${cyclePhase === 0 ? 'Flexing' : 'Returning'} | Angle: ${currentAngle.toFixed(1)}°`);
          }
        }
      } catch (e) {
        console.warn("Failed to poll for cycle data");
      }
    }, 1000);
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/exercises/`, {
        name: newExName,
        description: newExDesc,
        joint: newExJoint,
        mode: newExMode,
        target_angle: parseFloat(newExTargetAngle),
        target_value: parseFloat(newExTargetValue),
        duration_seconds: parseInt(newExDuration)
      });
      setMsg("Exercise template created!");
      setNewExName('');
      setNewExDesc('');
      loadData();
    } catch (err) {
      setMsg("Failed to create template.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrescribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedExerciseId) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/exercises/prescriptions`, {
        patient_id: selectedPatient.id,
        exercise_id: parseInt(selectedExerciseId),
        target_cycles: parseInt(prescribeTargetCycles)
      });
      setMsg("Prescribed successfully!");
      loadPatientDetails();
    } catch (err) {
      setMsg("Failed to prescribe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🦾</div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Elbow Rehab Platform</h1>
              <p className="text-sm text-gray-500">Doctor Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-sm">
              Logged in as: <span className="font-semibold text-indigo-600 capitalize">Dr. John Doe</span>
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
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Doctor Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Patients Listing */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="text-lg font-semibold mb-4">My Patients</h3>
            <div className="space-y-3">
              {patients.map(p => (
                <div 
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    selectedPatient?.id === p.id 
                      ? 'border-indigo-600 bg-indigo-50/50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-800 text-sm">{p.full_name}</div>
                  <div className="text-xs text-gray-500">ID: {p.username}</div>
                </div>
              ))}
              {patients.length === 0 && (
                <div className="text-xs text-gray-400">No patients assigned.</div>
              )}
            </div>
          </div>

          {/* Active Patient Details and Checklist */}
          <div className="md:col-span-2 space-y-6">
            {selectedPatient ? (
              <div className="bg-white p-6 rounded-2xl shadow space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-lg font-bold text-gray-800">{selectedPatient.full_name}</h3>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Active Rehab</span>
                </div>
                
                {/* LIVE TELEMETRY & HARDWARE CONTROL */}
                <div className="bg-gray-900 rounded-xl p-5 text-white shadow-inner my-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                      Live Hardware Control
                    </h4>
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => sendCommand('ZERO')}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg transition"
                      >
                        <Crosshair size={20} />
                        Zero Sensor
                      </button>
                      <button 
                        onClick={() => sendCommand('STOP')}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 shadow-lg transition transform hover:scale-105 active:scale-95 border border-red-400"
                      >
                        <AlertOctagon size={20} />
                        EMERGENCY STOP
                      </button>
                    </div>
                  </div>

                  <div className="h-64 w-full bg-gray-800 rounded-lg p-2 mb-4 border border-gray-700">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={telemetry} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" vertical={false} />
                        <XAxis dataKey="id" stroke="#9CA3AF" tick={false} axisLine={false} />
                        <YAxis stroke="#9CA3AF" domain={[0, 150]} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} 
                          itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="target_angle" stroke="#10B981" strokeWidth={3} dot={false} name="Target Angle" />
                        <Line type="monotone" dataKey="angle_degrees" stroke="#6366F1" strokeWidth={3} dot={false} name="Current Angle" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <div className="relative">
                        <input 
                          type="number" 
                          className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-32 font-mono"
                          value={manualTarget}
                          onChange={(e) => setManualTarget(e.target.value)}
                          placeholder="Angle"
                        />
                        <span className="absolute right-4 top-2 text-gray-400">°</span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-32 font-mono"
                          value={manualCycles}
                          onChange={(e) => setManualCycles(e.target.value)}
                          placeholder="Cycles"
                        />
                        <span className="absolute right-4 top-2 text-gray-400">x</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => sendCommand('TARGET_ANGLE', parseFloat(manualTarget))}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-xl transition shadow-lg flex-1"
                      >
                        Set Angle Once
                      </button>
                      <button 
                        onClick={executeManualCycles}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl transition shadow-lg flex-1"
                      >
                        Execute Cycles
                      </button>
                    </div>
                    {cycleStatus && (
                      <div className="text-sm font-semibold text-indigo-400 mt-2 bg-gray-800/50 p-2 rounded-lg border border-gray-700 text-center">
                        {cycleStatus}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-600">
                  <strong>Notes:</strong> {selectedPatient.clinical_info || "No diagnostic details provided."}
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-gray-700">Prescribed Workouts & Completion Rates</h4>
                  {prescriptions.map(pres => (
                    <div key={pres.id} className="p-3 bg-gray-50 border rounded-xl flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{pres.exercise.name} ({pres.exercise.mode})</span>
                        <span>{Math.round(pres.completion_percentage)}% Complete</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full" style={{ width: `${pres.completion_percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                  {prescriptions.length === 0 && (
                    <p className="text-xs text-gray-400">No active prescriptions.</p>
                  )}
                </div>

                {/* Prescribe Form */}
                <form onSubmit={handlePrescribe} className="pt-4 border-t space-y-3">
                  <h4 className="font-semibold text-sm text-gray-700">Prescribe Exercise</h4>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      value={selectedExerciseId}
                      onChange={(e) => setSelectedExerciseId(e.target.value)}
                    >
                      {exercises.map(ex => (
                        <option key={ex.id} value={ex.id}>
                          [{ex.joint}] {ex.name} ({ex.mode})
                        </option>
                      ))}
                    </select>
                    <input 
                      type="number"
                      className="w-20 px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                      value={prescribeTargetCycles}
                      onChange={(e) => setPrescribeTargetCycles(e.target.value)}
                      placeholder="Cycles"
                    />
                    <button 
                      type="submit" 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Prescribe
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow text-center text-gray-400 text-sm">
                Select a patient profile to view diagnosis and progress metrics.
              </div>
            )}
          </div>

        </div>

        {/* Create Predefined Exercise Definition form */}
        <div className="mt-8 bg-white p-6 rounded-2xl shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Create Predefined Exercise Definition Template</h3>
          
          <form onSubmit={handleCreateExercise} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Exercise Name</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                placeholder="Active Flexion"
                value={newExName} 
                onChange={(e) => setNewExName(e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                placeholder="Details..."
                value={newExDesc} 
                onChange={(e) => setNewExDesc(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Duration (s)</label>
              <input 
                type="number"
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                value={newExDuration}
                onChange={(e) => setNewExDuration(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Joint</label>
              <select 
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                value={newExJoint}
                onChange={(e) => setNewExJoint(e.target.value)}
              >
                <option value="Wrist">Wrist</option>
                <option value="Elbow">Elbow</option>
                <option value="Shoulder">Shoulder</option>
                <option value="Combined">Combined</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Mode</label>
              <select 
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                value={newExMode}
                onChange={(e) => setNewExMode(e.target.value)}
              >
                <option value="position">Position</option>
                <option value="torque">Torque</option>
                <option value="force">Force</option>
              </select>
            </div>

            <div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-xl text-xs transition cursor-pointer"
                disabled={loading}
              >
                Create Template
              </button>
            </div>
          </form>
          
          {msg && (
            <div className="mt-3 text-xs text-indigo-600 font-semibold text-center">{msg}</div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DoctorDashboard;
