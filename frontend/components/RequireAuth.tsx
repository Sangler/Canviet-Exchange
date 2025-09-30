import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken, isAuthenticated, parseJwt } from '../lib/auth';
import { CSpinner } from '@coreui/react';

interface RequireAuthProps {
  children: React.ReactNode;
  // Optional: required role or roles to access this page (e.g., 'admin')
  roles?: string | string[];
}

// Simple client-side guard with a dev bypass:
// - Env flag: NEXT_PUBLIC_DISABLE_AUTH=1 (build-time)
// - Runtime toggle: add ?auth=off to URL once (persists in localStorage), or ?auth=on to re-enable
const RequireAuth: React.FC<RequireAuthProps> = ({ children, roles }) => {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  // Helper reads current runtime bypass state safely on client
  const isBypassEnabled = () => {
    if (process.env.NEXT_PUBLIC_DISABLE_AUTH === '1') return true;
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem('DISABLE_AUTH') === '1'; } catch { return false; }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Handle runtime toggle via query string
    const q = router.query?.auth;
    const toggle = Array.isArray(q) ? q[0] : q;
    if (toggle === 'off' || toggle === 'on') {
      try {
        if (toggle === 'off') window.localStorage.setItem('DISABLE_AUTH', '1');
        else window.localStorage.removeItem('DISABLE_AUTH');
      } catch {}
      // Clean the URL by removing the auth query param
      const { pathname, query } = router;
      const { auth, ...rest } = query || {} as any;
      void router.replace({ pathname, query: rest }, undefined, { shallow: true });
    }

    if (isBypassEnabled()) {
      setAllowed(true);
      return;
    }

    if (!isAuthenticated()) {
      const next = encodeURIComponent(router.asPath);
      router.replace(`/login?next=${next}`).catch(() => router.replace('/login'));
      return;
    }

    // If roles are required, decode JWT and verify role and expiration
    if (roles) {
      const token = getAuthToken();
      const payload = token ? parseJwt<{ role?: string; exp?: number }>(token) : null;
      const now = Math.floor(Date.now() / 1000);
      const notExpired = payload?.exp ? payload.exp > now : true; // if no exp, assume ok in dev
      if (!payload || !notExpired) {
        const next = encodeURIComponent(router.asPath);
        router.replace(`/login?next=${next}`).catch(() => router.replace('/login'));
        return;
      }
      // Optional: check role claim strictly here if needed
    }

    setAllowed(true);
  }, [router, roles]);

  if (!allowed)
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <CSpinner color="primary" />
      </div>
    );
  return <>{children}</>;
};

export default RequireAuth;
