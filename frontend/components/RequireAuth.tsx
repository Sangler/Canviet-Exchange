import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseJwt } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
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
  const { token, user, loading: authLoading, logout: ctxLogout } = useAuth();

  useEffect(() => {
    if (!router.isReady) return;

    // Wait for auth context to finish initialization
    if (authLoading) return;

    if (!token) {
      const next = encodeURIComponent(router.asPath);
      void coordinateRedirect(router, `/login?next=${next}`);
      return;
    }

    // If roles are required, check user role from context when available
    if (roles) {
      const role = user?.role;
      if (!role) {
        const next = encodeURIComponent(router.asPath);
        router.replace(`/login?next=${next}`).catch(() => router.replace('/login'));
        return;
      }
      if (typeof roles === 'string' ? role !== roles : !Array.isArray(roles) || !roles.includes(role)) {
        const next = encodeURIComponent(router.asPath);
        router.replace(`/login?next=${next}`).catch(() => router.replace('/login'));
        return;
      }
    }

    setAllowed(true);
  }, [router, roles, authLoading, token]);

  // After auth, fetch profile to ensure email is verified; if not, redirect to /verify-email
  useEffect(() => {
    const run = async () => {
      if (!router.isReady) return;
      if (authLoading) return;
      if (!token) return; // handled above
      // avoid redirect loop if already on verify-email
      if (router.pathname === '/verify-email' || router.asPath.startsWith('/verify-email')) { setCheckingEmail(false); return; }
      try {
        const resp = await fetch(`/api/auth/me`, { credentials: 'include' });
        if (resp.status === 401) {
          const next = encodeURIComponent(router.asPath);
          await ctxLogout(`/login?next=${next}`);
          setCheckingEmail(false);
          return;
        }
        if (!resp.ok) throw new Error('Failed to load profile');
        const data = await resp.json();
        const emailVerified: boolean = !!data?.user?.emailVerified;
        const role: string | undefined = data?.user?.role;
        const profileComplete: boolean = !!data?.complete;
        // Enforce profile completeness ONLY for regular users
          if (role === 'user' && !profileComplete && router.pathname !== '/personal-info') {
            void coordinateRedirect(router, `/personal-info`);
            setCheckingEmail(false);
            return;
          }
          if (!emailVerified) {
            const next = encodeURIComponent(router.asPath);
            // Fire-and-forget to avoid AbortError console noise on in-flight navigations
            void coordinateRedirect(router, `/verify-email?next=${next}`);
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
  }, [router, authLoading, token]);

  if (!allowed || checkingEmail)
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <CSpinner color="primary" />
      </div>
    );
  return <>{children}</>;
};

export default RequireAuth;
