import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

type Role = 'doctor' | 'patient' | 'engineer' | null;

interface AuthContextType {
  isLoggedIn: boolean;
  role: Role;
  login: (role: Role, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem('role') as Role;
    const savedLogin = localStorage.getItem('isLoggedIn') === 'true';
    const savedToken = localStorage.getItem('token');

    if (savedLogin && savedRole) {
      setIsLoggedIn(true);
      setRole(savedRole);
      if (savedToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      }
    }
  }, []);

  const login = (userRole: Role, token: string) => {
    setIsLoggedIn(true);
    setRole(userRole);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('role', userRole || '');
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setRole(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
