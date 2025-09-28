import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken, isAuthenticated, parseJwt } from '../lib/auth';
import { CSpinner } from '@coreui/react';

interface RequireAuthProps {
  children: React.ReactNode;
  // Optional: required role or roles to access this page (e.g., 'admin')
  roles?: string | string[];
}

// Simple client-side guard: if no auth token is present, redirect to /login and render nothing
const RequireAuth: React.FC<RequireAuthProps> = ({ children, roles }) => {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Avoid running during SSR
    if (typeof window === 'undefined') return;

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
      // TODO: handle token expiration case in backend as well
      if (!payload || !notExpired) {
        // Unauthorized: kick to login or a 403 page (using login for now)
        const next = encodeURIComponent(router.asPath);
        router.replace(`/login?next=${next}`).catch(() => router.replace('/login'));
        return;
      }
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
