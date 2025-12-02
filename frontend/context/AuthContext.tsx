import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthToken, parseJwt, clearAuthToken } from '../lib/auth';

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string;
  role?: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize token from storage/cookie
  useEffect(() => {
    setToken(getAuthToken());
    setLoading(false);
  }, []);

  // Listen for token changes (login/logout) and storage updates
  useEffect(() => {
    const handler = () => setToken(getAuthToken());
    window.addEventListener('auth_token_changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('auth_token_changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // Decode user info from token
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    const payload = parseJwt<{ sub?: string; email?: string; role?: string }>(token);
    if (payload?.sub && payload?.email) {
      setUser({ id: payload.sub, email: payload.email, role: payload.role });
    } else {
      setUser(null);
    }
  }, [token]);

  const logout = () => {
    clearAuthToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const value = useMemo<AuthState>(() => ({ token, user, loading, logout }), [token, user, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
