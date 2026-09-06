import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchMe, login as apiLogin, register as apiRegister, logout as apiLogout } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking, null = logged out
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMe()
      .then((r) => setUser(r.username))
      .catch(() => setUser(null));
  }, []);

  // Bounce back to the login screen if a session cookie expires or is rejected mid-use.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    setError(null);
    try {
      const r = await apiLogin(username, password);
      setUser(r.username);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, []);

  const register = useCallback(async (username, password) => {
    setError(null);
    try {
      const r = await apiRegister(username, password);
      setUser(r.username);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading: user === undefined, error, login, register, logout, clearError: () => setError(null) }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
