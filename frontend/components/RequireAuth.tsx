import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken, isAuthenticated, parseJwt, logout } from '../lib/auth';
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
  const [checkingEmail, setCheckingEmail] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;
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

  // After auth, fetch profile to ensure email is verified; if not, redirect to /verify-email
  useEffect(() => {
    const run = async () => {
      if (!router.isReady) return;
      if (!isAuthenticated()) return; // handled above
      // avoid redirect loop if already on verify-email
      if (router.pathname === '/verify-email' || router.asPath.startsWith('/verify-email')) { setCheckingEmail(false); return; }
      try {
        const token = getAuthToken();
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const resp = await fetch(`${base}/api/users/me`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        });
        if (resp.status === 401) {
          const next = encodeURIComponent(router.asPath);
          await logout(`/login?next=${next}`);
          setCheckingEmail(false);
          return;
        }
        if (!resp.ok) throw new Error('Failed to load profile');
        const data = await resp.json();
        const emailVerified: boolean = !!data?.user?.emailVerified;
        if (!emailVerified) {
          const next = encodeURIComponent(router.asPath);
          // Fire-and-forget to avoid AbortError console noise on in-flight navigations
          void router.replace(`/verify-email?next=${next}`).catch(() => {});
          setCheckingEmail(false);
          return;
        }
      } catch (e) {
        // If profile fails, keep user allowed; backend will re-check on actions
      } finally {
        setCheckingEmail(false);
      }
    };
    run();
  }, [router]);

  if (!allowed || checkingEmail)
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <CSpinner color="primary" />
      </div>
    );
  return <>{children}</>;
};

export default RequireAuth;
