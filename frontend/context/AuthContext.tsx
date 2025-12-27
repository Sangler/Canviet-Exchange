import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearAuthToken } from '../lib/auth';

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  // Optional fields returned from server
  KYCStatus?: string;
  kycStatus?: string;
  suspended?: boolean;
  emailVerified?: boolean;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  logout: (redirect?: string) => void;
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
        const base = process.env.BACKEND_URL || ''
        const url = base ? `${base}/api/auth/me` : '/api/auth/me'
        const resp = await fetch(url, { credentials: 'include' });
        if (!mounted) return;
        if (!resp.ok) {
          setUser(null);
          setToken(null);
          setLoading(false);
          return;
        }
        const data = await resp.json();
        setUser(data.user || null);
        if (data.user) setToken('present');
      } catch (e) {
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Avoid calling the backend on every anonymous page load which returns 401 and
    // shows a noisy GET 401 message in browser DevTools. Use the local `auth_present`
    // flag (set by `setAuthToken` on login) as a heuristic to decide whether to
    // fetch the profile. We still listen for auth change events and will fetch
    // when they occur.
    const hasLocalFlag = typeof window !== 'undefined' && !!window.localStorage?.getItem('auth_present');
    if (hasLocalFlag) {
      void run();
    } else {
      // No local flag — treat as unauthenticated but keep loading false
      setUser(null);
      setToken(null);
      setLoading(false);
    }

    const handler = () => {
      // Storage event or manual dispatch indicates auth change; refetch profile
      const nowHas = typeof window !== 'undefined' && !!window.localStorage?.getItem('auth_present');
      if (nowHas) {
        void run();
      } else {
        setUser(null);
        setToken(null);
        setLoading(false);
      }
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
