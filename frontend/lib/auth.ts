// Lightweight client-side auth helpers that prefer Web Storage and fall back to a cookie named 'auth_token'.
// These are intentionally framework-agnostic and synchronous for simple guards.

export function getAuthToken(): string | null {
  // With HttpOnly cookies, the JWT is not accessible to JS. Return null to force
  // the app to rely on the `/api/auth/me` endpoint for authoritative auth state.
  if (typeof window === 'undefined') return null;
  return null;
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

// Optional: decode a JWT to inspect claims client-side (no verification)
export function parseJwt<T = any>(token: string): T | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as T;
  } catch {
    return null;
  }
}

// Store token in sessionStorage (default) or localStorage (when persistent=true). Also updates cookie if requested.
export function setAuthToken(token: string, opts?: { persistent?: boolean; setCookie?: boolean; days?: number }) {
  // No-op for actual token storage (HttpOnly cookie set by server). Store a small
  // presence flag so legacy UI checks can detect auth changes.
  if (typeof window === 'undefined') return;
  try {
    const present = token ? '1' : '';
    window.localStorage?.setItem('auth_present', present);
  } catch {}
  try { window.dispatchEvent(new Event('auth_token_changed')); } catch {}
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage?.removeItem('auth_token'); } catch {}
  try { window.localStorage?.removeItem('auth_token'); } catch {}
  try { window.localStorage?.removeItem('auth_present'); } catch {}
  try { window.dispatchEvent(new Event('auth_token_changed')); } catch {}
}

export async function logout(redirectTo?: string) {
  try {
    clearAuthToken();
  } finally {
    if (typeof window !== 'undefined') {
      const target = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/login';
      window.location.href = target;
    }
  }
}
