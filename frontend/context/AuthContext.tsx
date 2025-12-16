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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, request profile from server (cookie-based auth). Server returns 401 if unauthenticated.
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const resp = await fetch('/api/auth/me', { credentials: 'include' });
        if (!mounted) return;
        if (!resp.ok) {
          setUser(null);
          setToken(null);
          setLoading(false);
          return;
        }
        const data = await resp.json();
        setUser(data.user || null);
        // Provide a non-sensitive token placeholder so legacy callers (getAuthToken/token checks)
        // that expect a `token` field continue to work. This is NOT the real JWT.
        if (data.user) setToken('present');
      } catch (e) {
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    const handler = () => {
      // Storage event or manual dispatch indicates auth change; refetch profile
      void run();
    };
    window.addEventListener('auth_token_changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      mounted = false;
      window.removeEventListener('auth_token_changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const logout = async (redirect?: string) => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    clearAuthToken();
    setToken(null);
    if (typeof window !== 'undefined') {
      window.location.href = redirect || '/login';
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
