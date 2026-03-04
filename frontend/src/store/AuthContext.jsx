import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('managex_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('managex_token') || null);

  const login = useCallback((userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('managex_user', JSON.stringify(userData));
    localStorage.setItem('managex_token', accessToken);
  }, []);

  const logout = useCallback(async () => {
    // Best-effort server logout (clears httpOnly cookie + DB token)
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore — still clear local state
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem('managex_user');
    localStorage.removeItem('managex_token');
  }, []);

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
