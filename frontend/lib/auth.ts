// Lightweight client-side auth helpers that prefer Web Storage and fall back to a cookie named 'auth_token'.
// These are intentionally framework-agnostic and synchronous for simple guards.

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const ss = window.sessionStorage?.getItem('auth_token');
    if (ss) return ss;
  } catch {}
  try {
    const ls = window.localStorage?.getItem('auth_token');
    if (ls) return ls;
  } catch {}
  try {
    const match = document.cookie.match(/(?:^|; )auth_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
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
  if (typeof window === 'undefined') return;
  const { persistent = false, setCookie = false, days = 1 } = opts || {};
  try {
    if (persistent) window.localStorage?.setItem('auth_token', token);
    else window.sessionStorage?.setItem('auth_token', token);
  } catch {}
  try { window.dispatchEvent(new Event('auth_token_changed')); } catch {}
  if (setCookie) {
    try {
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `auth_token=${encodeURIComponent(token)}; Path=/; Expires=${expires}; SameSite=Lax`;
    } catch {}
  }
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage?.removeItem('auth_token'); } catch {}
  try { window.localStorage?.removeItem('auth_token'); } catch {}
  try {
    // Expire cookie immediately
    document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  } catch {}
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
