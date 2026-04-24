import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AUTH_TOKEN_UPDATED_EVENT,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  TOKEN_KEY,
  clearPersistedAuthTokens,
  persistTokenBundle,
  refreshAuthToken,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(REFRESH_TOKEN_KEY) || '');
  const [tokenExpiresAt, setTokenExpiresAt] = useState(() => Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY) || 0));
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    const handleTokenUpdate = (event) => {
      const detail = event?.detail || {};
      setToken(detail.token || localStorage.getItem(TOKEN_KEY) || '');
      setRefreshToken(detail.refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY) || '');
      setTokenExpiresAt(Number(detail.tokenExpiresAt || localStorage.getItem(TOKEN_EXPIRES_AT_KEY) || 0));
    };

    window.addEventListener(AUTH_TOKEN_UPDATED_EVENT, handleTokenUpdate);
    return () => {
      window.removeEventListener(AUTH_TOKEN_UPDATED_EVENT, handleTokenUpdate);
    };
  }, []);

  useEffect(() => {
    if (!token || !refreshToken || !tokenExpiresAt) return undefined;

    const msUntilRefresh = Math.max(5000, tokenExpiresAt - Date.now() - 60 * 1000);
    const timer = setTimeout(() => {
      refreshAuthToken(refreshToken).catch(() => {});
    }, msUntilRefresh);

    return () => clearTimeout(timer);
  }, [token, refreshToken, tokenExpiresAt]);

  const login = ({ token: newToken, user: userData = null, refreshToken: newRefreshToken = '', expiresIn = 0 }) => {
    persistTokenBundle({
      idToken: newToken || '',
      refreshToken: newRefreshToken || '',
      expiresIn,
    });
    setToken(newToken || '');
    setRefreshToken(newRefreshToken || '');
    setTokenExpiresAt(expiresIn ? Date.now() + Number(expiresIn) * 1000 : 0);
    setUser(userData);
  };

  const updateUser = (updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const logout = () => {
    clearPersistedAuthTokens();
    setToken('');
    setRefreshToken('');
    setTokenExpiresAt(0);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      updateUser,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
