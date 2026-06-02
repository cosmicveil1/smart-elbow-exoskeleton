import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE = "http://localhost:8001";

interface Session {
  id: number;
  patient_id: string;
  session_name: string | null;
  started_at: string;
  notes: string | null;
}

interface Telemetry {
  id: number;
  session_id: number;
  timestamp: string;
  count: number;
  angle_degrees: number;
  rotations: number;
  raw_data: string;
}

const EngineerDashboard = () => {
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessionsList = async () => {
    try {
      const res = await axios.get(`${API_BASE}/sessions/`);
      setSessions(res.data);
      if (res.data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(res.data[0].id.toString());
      }
    } catch (err) {
      console.warn("Could not load sessions.");
    }
  };

  const loadTelemetry = async () => {
    if (!selectedSessionId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/sessions/${selectedSessionId}/data/`);
      setTelemetry(res.data);
    } catch (err) {
      console.warn("Could not load telemetry feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionsList();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadTelemetry();
    }
  }, [selectedSessionId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🦾</div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Elbow Rehab Platform</h1>
              <p className="text-sm text-gray-500">Engineer Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-sm">
              Role: <span className="font-semibold text-indigo-600 capitalize">System Engineer</span>
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

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <h2 className="text-3xl font-bold text-gray-800">Diagnostics Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl shadow text-xs border">
            <div className="text-gray-400 font-semibold uppercase">MCU Port</div>
            <div className="text-sm font-bold text-green-600 mt-1">ONLINE (COM6)</div>
          </div>
          <div className="p-4 bg-white rounded-xl shadow text-xs border">
            <div className="text-gray-400 font-semibold uppercase">Ingestion Baud Rate</div>
            <div className="text-sm font-bold text-gray-800 mt-1 font-mono">115200 bps</div>
          </div>
          <div className="p-4 bg-white rounded-xl shadow text-xs border">
            <div className="text-gray-400 font-semibold uppercase">Postgres Database</div>
            <div className="text-sm font-bold text-gray-800 mt-1">Connected</div>
          </div>
          <div className="p-4 bg-white rounded-xl shadow text-xs border">
            <div className="text-gray-400 font-semibold uppercase">Logged Session Runs</div>
            <div className="text-sm font-bold text-gray-800 mt-1">{sessions.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Active Sessions list */}
          <div className="bg-white p-5 rounded-2xl shadow flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-3">Active Session Feeds</h3>
            <div className="space-y-2 overflow-y-auto max-h-[420px]">
              {sessions.map(s => (
                <div 
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id.toString())}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col gap-1 ${
                    selectedSessionId === s.id.toString() 
                      ? 'bg-indigo-50 border-indigo-600 text-gray-800' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="font-semibold text-xs truncate">{s.session_name || 'Run'}</div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
                    <span>Patient: {s.patient_id}</span>
                    <span className="font-mono">{new Date(s.started_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-gray-400 text-xs text-center py-4">No sessions logged.</p>
              )}
            </div>
          </div>

          {/* Telemetry data table */}
          <div className="md:col-span-3 bg-white p-5 rounded-2xl shadow flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Raw Telemetry diagnostics</h3>
              <button 
                onClick={loadTelemetry}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border rounded-lg text-[10px] uppercase font-semibold cursor-pointer"
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh Logs'}
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border max-h-[380px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 border-b">
                    <th className="px-4 py-3 font-semibold uppercase">Timestamp</th>
                    <th className="px-4 py-3 font-semibold uppercase">Encoder Ticks</th>
                    <th className="px-4 py-3 font-semibold uppercase">Angle</th>
                    <th className="px-4 py-3 font-semibold uppercase">Rotations</th>
                    <th className="px-4 py-3 font-semibold uppercase">Payload string</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-600">
                  {telemetry.map(tel => (
                    <tr key={tel.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-gray-400">{new Date(tel.timestamp).toLocaleTimeString()}</td>
                      <td className="px-4 py-3">{tel.count}</td>
                      <td className="px-4 py-3 font-bold text-indigo-600">{tel.angle_degrees}°</td>
                      <td className="px-4 py-3">{tel.rotations}</td>
                      <td className="px-4 py-3 font-mono text-gray-400 text-[10px]">{tel.raw_data}</td>
                    </tr>
                  ))}
                  {telemetry.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 py-12">
                        No telemetry logs recorded. Launch the Patient Simulator to stream live telemetry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EngineerDashboard;
