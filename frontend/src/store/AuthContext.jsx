import { createContext, useContext, useState, useCallback, useEffect } from 'react';
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

  const [teams, setTeams] = useState(() => {
    try { return JSON.parse(localStorage.getItem('managex_teams') || '[]'); } catch { return []; }
  });

  const [activeTeam, setActiveTeamState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('managex_active_team') || 'null'); } catch { return null; }
  });

  // Fetch teams whenever token changes (after login)
  useEffect(() => {
    if (!token) return;
    const superAdmin = Boolean(user?.isSuperAdmin);

    const fetchPromise = superAdmin
      ? api.get('/teams').then(({ data }) =>
          // Normalize all teams into membership-like shape
          (data.data || []).map((t) => ({ team: t, role: 'superAdmin' }))
        )
      : api.get('/teams/my').then(({ data }) => data.data || []);

    fetchPromise
      .then((list) => {
        setTeams(list);
        localStorage.setItem('managex_teams', JSON.stringify(list));
        setActiveTeamState((current) => {
          if (!current && list.length > 0) {
            const first = list[0].team;
            localStorage.setItem('managex_active_team', JSON.stringify(first));
            return first;
          }
          return current;
        });
      })
      .catch(() => {});
  }, [token, user?.isSuperAdmin]);

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
    setTeams([]);
    setActiveTeamState(null);
    localStorage.removeItem('managex_user');
    localStorage.removeItem('managex_token');
    localStorage.removeItem('managex_teams');
    localStorage.removeItem('managex_active_team');
  }, []);

  const switchTeam = useCallback((team) => {
    setActiveTeamState(team);
    localStorage.setItem('managex_active_team', JSON.stringify(team));
  }, []);

  // isSuperAdmin comes from the stored user object (set on login)
  // Also parse from the JWT token as a fallback for sessions created before this field was added
  const isSuperAdmin = Boolean(user?.isSuperAdmin) || (() => {
    try {
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Boolean(payload?.isSuperAdmin);
    } catch { return false; }
  })();
  const isAuthenticated = Boolean(token && user);

  // Derive active team role for current user
  const activeTeamRole = activeTeam
    ? teams.find((m) => m.team?._id === activeTeam._id)?.role || null
    : null;

  return (
    <AuthContext.Provider value={{
      user, token, login, logout, isAuthenticated,
      teams, activeTeam, switchTeam, isSuperAdmin, activeTeamRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
