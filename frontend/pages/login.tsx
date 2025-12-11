import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { setAuthToken } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getSafeRedirectPath } from "../lib/routeValidation";
import { CSpinner, useColorModes } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilMoon, cilSun } from "@coreui/icons";

export default function LoginPage() {
  const router = useRouter();
  const { token, user, loading: authLoading } = useAuth();
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const { language, setLanguage, t } = useLanguage();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [errors, setErrors] = useState<{
    email?: string;
    phone?: string;
    password?: string;
  }>({});

  // Capture referral code from URL
  useEffect(() => {
    const ref = router.query.ref || router.query.referral || router.query.referralCode;
    if (ref && typeof ref === 'string') {
      const code = ref.trim().toUpperCase();
      setReferralCode(code);
      // Store in sessionStorage for OAuth flow
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingReferral', code);
      }
    }
  }, [router.query]);

  // Check for OAuth errors in query params
  useEffect(() => {
    if (router.query.error === 'oauth_failed') {
      setOauthError('Google sign-in failed. Please try again.');
    } else if (router.query.error === 'auth_processing_failed') {
      setOauthError('Authentication processing failed. Please try again.');
    }
  }, [router.query.error]);

  // If user is already authenticated, redirect away from /login
  // Uses getSafeRedirectPath to validate the 'next' parameter and prevent 404 errors
  useEffect(() => {
    if (authLoading) return;
    const isAuthed = Boolean(token) && Boolean(user);
    if (isAuthed) {
      // Validates route exists before redirecting, falls back to /transfers if invalid
      const target = getSafeRedirectPath(router.query.next, '/transfers');
      void router.replace(target);
    }
  }, [authLoading, token, user, router, router.query.next]);

  const isAuthed = Boolean(token) && Boolean(user);

  const validate = () => {
    const next: typeof errors = {};
    if (method === "email") {
      if (!email) next.email = t('validation.emailRequired');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        next.email = t('validation.emailInvalid');
    } else {
      if (!phone) next.phone = t('validation.phoneRequired');
      else if (!/^\+?[0-9\s\-()]{7,}$/.test(phone))
        next.phone = t('validation.phoneInvalid');
    }
    if (!password) next.password = t('validation.passwordRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      // Real API call to backend
  // Use same-origin proxy to avoid CORS issues across LAN IP
      const body: any = { password };
      if (method === 'email') body.email = email;
      else body.phone = phone;
      const resp = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        // Show specific error for Google-only accounts
        if (resp.status === 403 && data?.message?.includes('Google')) {
          setErrors({ email: data.message, password: '' });
          return;
        }
        throw new Error(data?.message || "Login failed");
      }
      const data = await resp.json();
      const token: string | undefined = data?.token;
      const userFromLogin = data?.user;
      if (token) {
        // Save in Web Storage: sessionStorage (default) or localStorage when Remember Me is checked
        setAuthToken(token, { persistent: remember });
        // If the server didn’t set an HttpOnly cookie, optionally mirror token to a cookie for dev parity
        const hasCookie =
          typeof document !== "undefined" &&
          document.cookie.includes("auth_token=");
        if (!hasCookie)
          setAuthToken(token, {
            persistent: remember,
            setCookie: true,
            days: remember ? 30 : 1,
          });
      }

      setSuccess(true);
      // Compute intended next page with validation
      const target = getSafeRedirectPath(router.query.next, '/transfers');

      // If email is not verified, go straight to /verify-email with the intended target
      let emailVerified: boolean | undefined = userFromLogin?.emailVerified;
      try {
        if (emailVerified === undefined && token) {
          const meResp = await fetch(`/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const me = await meResp.json().catch(() => ({} as any));
          emailVerified = !!me?.user?.emailVerified;
        }
      } catch {
        // ignore and proceed to target
      }

      if (emailVerified === false) {
        void router.push(`/verify-email?next=${encodeURIComponent(target)}`);
      } else {
        // Check profile completeness before final redirect
        let profileComplete = false;
        let role: string | undefined = userFromLogin?.role;
        try {
          if (token) {
            const meResp2 = await fetch(`/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
            const me2 = await meResp2.json().catch(() => ({} as any));
            profileComplete = !!me2?.complete;
            role = role ?? me2?.user?.role;
          }
        } catch {}
        // Enforce completeness ONLY for 'user' role
        if (role === 'user' && !profileComplete) {
          void router.push('/personal-info');
        } else {
          void router.push(target);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Avoid flashing the login form while auth status is resolving or when already authed
  if (authLoading || isAuthed) {
    return (
      <>
        <Head>
          <title>Redirecting…</title>
        </Head>
        <div className="auth-container">
          <div className="auth-card flex-center-gap-12" role="status" aria-live="polite">
            <CSpinner color="primary" />
            <span>{authLoading ? "Checking session…" : "Redirecting…"}</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>CanVIet Exchange Service Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
  <div className="auth-container bg-auth">
    <div className="auth-card">
          {/* Language switcher and theme toggle */}
          <div className="top-right">
            <span className="inline-lang">
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setLanguage('en'); }}
                className={language === 'en' ? 'lang-link active' : 'lang-link'}
              >
                EN
              </a>
              <span aria-hidden>|</span>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setLanguage('vi'); }}
                className={language === 'vi' ? 'lang-link active' : 'lang-link'}
              >
                VI
              </a>
            </span>
            <button
              type="button"
              className="mode-btn"
              onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
              aria-label={`Toggle ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
              title="Change to Dark/Light Mode"
            >
              <CIcon icon={colorMode === 'dark' ? cilSun : cilMoon} size="lg" />
            </button>
          </div>

          <div className="login-header auth-header">
            <div className="logo">
              <img src="/logo.png" alt="CanViet Exchange" className="logo-img" />
            </div>
            <h1>{t('auth.signIn')}</h1>
            <p>{t('auth.welcome')}</p>
          </div>

          {oauthError && (
            <div className="oauth-error">{oauthError}</div>
          )}

          <form
            className="login-form auth-form"
            id="loginForm"
            noValidate
            onSubmit={onSubmit}
          >
            <div
              className="method-switch"
              role="tablist"
              aria-label="Sign-in method"
            >
              <button
                type="button"
                role="tab"
                aria-selected={method === "email"}
                className={`pill ${method === "email" ? "active" : ""}`}
                onClick={() => setMethod("email")}
              >
                {t('common.email')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={method === "phone"}
                className={`pill ${method === "phone" ? "active" : ""}`}
                onClick={() => setMethod("phone")}
              >
                {t('common.phone')}
              </button>
            </div>

            {method === "email" ? (
              <div
                className={`input-group ${errors.email ? "has-error" : ""}`}
              >
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby="emailError"
                />
                <label htmlFor="email">{t('auth.emailAddress')}</label>
                <span className="input-border" />
                <span className="error-message" id="emailError">
                  {errors.email}
                </span>
              </div>
            ) : (
              <div
                className={`input-group ${errors.phone ? "has-error" : ""}`}
              >
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  autoComplete="tel"
                  placeholder=" "
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!!errors.phone}
                  aria-describedby="phoneError"
                />
                <label htmlFor="phone">{t('common.phone')}</label>
                <span className="input-border" />
                <span className="error-message" id="phoneError">
                  {errors.phone}
                </span>
              </div>
            )}

            <div
              className={`input-group ${errors.password ? "has-error" : ""}`}
            >
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
                aria-describedby="passwordError"
              />
              <label htmlFor="password">{t('auth.password')}</label>
              <button
                type="button"
                className="password-toggle"
                id="passwordToggle"
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword((s) => !s)}
              >
                <svg
                  className="eye-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M8 3C4.5 3 1.6 5.6 1 8c.6 2.4 3.5 5 7 5s6.4-2.6 7-5c-.6-2.4-3.5-5-7-5zm0 8.5A3.5 3.5 0 118 4.5a3.5 3.5 0 010 7zm0-5.5a2 2 0 100 4 2 2 0 000-4z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <span className="input-border" />
              <span className="error-message" id="passwordError">
                {errors.password}
              </span>
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  id="remember"
                  name="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="checkmark" aria-hidden>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {t('auth.rememberMe')}
              </label>
              <div className="form-links">
                <a href="/register" className="forgot-link">
                  {t('common.register')}
                </a>
                <a href="/forget-pass" className="forgot-link">
                  {t('auth.forgotPassword')}
                </a>
              </div>
            </div>

            <button
              type="submit"
              className={`submit-btn submit-btn--primary ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              <span className="btn-text">
                {loading ? t('auth.signingIn') : t('auth.signIn')}
              </span>
              <div className="btn-loader" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle
                    cx="9"
                    cy="9"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.25"
                  />
                  <path
                    d="M16 9a7 7 0 01-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      dur="1s"
                      values="0 9 9;360 9 9"
                      repeatCount="indefinite"
                    />
                  </path>
                </svg>
              </div>
            </button>
            <p className="form-note small text-medium-emphasis mt-3 text-center">{t('common.form-note')} <a href="/general/terms-and-conditions" className="text-link">{t('common.form-note-href')}</a></p>
          </form>

          <div className="divider">
            <span>{t('auth.orContinueWith')}</span>
          </div>

          <div className="social-buttons">
            <button
              type="button"
              className="social-btn"
              onClick={() => {
                const ref = referralCode || (typeof window !== 'undefined' ? sessionStorage.getItem('pendingReferral') : null) || '';
                const params = new URLSearchParams();
                
                if (ref) {
                  params.set('state', ref);
                }
                
                if (router.query.next) {
                  params.set('next', router.query.next as string);
                }
                
                const url = `/api/auth/google${params.toString() ? '?' + params.toString() : ''}`;
                window.location.href = url;
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M14.9 8.161c0-.476-.039-.954-.118-1.421H8.021v2.681h3.833a3.321 3.321 0 01-1.431 2.161v1.785h2.3c1.349-1.25 2.177-3.103 2.177-5.206z"
                />
                <path
                  fill="#34A853"
                  d="M8.021 15c1.951 0 3.57-.65 4.761-1.754l-2.3-1.785c-.653.447-1.477.707-2.461.707-1.887 0-3.487-1.274-4.057-2.991H1.617V11.1C2.8 13.481 5.282 15 8.021 15z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.964 9.177a4.97 4.97 0 010-2.354V4.9H1.617a8.284 8.284 0 000 7.623l2.347-1.346z"
                />
                <path
                  fill="#EA4335"
                  d="M8.021 3.177c1.064 0 2.02.375 2.75 1.111l2.041-2.041C11.616 1.016 9.97.446 8.021.446c-2.739 0-5.221 1.519-6.404 3.9l2.347 1.346c.57-1.717 2.17-2.515 4.057-2.515z"
                />
              </svg>
              Google
            </button>
          </div>

          {/* signup-link removed as requested */}

          {success && (
            <div
              className="success-message"
              id="successMessage"
              role="status"
              aria-live="polite"
            >
              <div className="success-icon" aria-hidden>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#635BFF" />
                  <path
                    d="M8 12l3 3 5-5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>{t('auth.welcomeBack')}</h3>
              <p>{t('auth.redirectingDashboard')}</p>
            </div>
          )}
        </div>
      </div>

    </>
  );
}
