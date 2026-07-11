import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = "http://localhost:8000";

const Login = () => {
  const [username, setUsername] = useState('patient');
  const [password, setPassword] = useState('password');
  const [role, setRole] = useState<'doctor' | 'patient' | 'engineer'>('patient');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Pre-fill credentials based on selected role tab for seamless demoing
  useEffect(() => {
    setUsername(role);
    setPassword('password');
    setErrorMsg('');
  }, [role]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username: username,
        password: password
      });

      const { access_token, role: serverRole } = response.data;
      
      // Update global context with real role and JWT token
      login(serverRole, access_token);

      if (serverRole === 'doctor') navigate('/doctor');
      else if (serverRole === 'patient') navigate('/patient');
      else if (serverRole === 'engineer') navigate('/engineer');
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMsg(err.response.data.detail);
      } else {
        setErrorMsg("Incorrect credentials or server offline.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">🦾 Elbow Rehab</h1>
          <p className="text-gray-600 mt-2">Rehabilitation Platform</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Quick Selector</label>
            <div className="grid grid-cols-3 gap-2">
              {(['patient', 'doctor', 'engineer'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    role === r 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter password"
              required
            />
          </div>

          {errorMsg && (
            <div className="text-red-500 text-xs font-semibold text-center mt-2">
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
