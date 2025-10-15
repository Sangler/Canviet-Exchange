import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { setAuthToken } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { CSpinner } from "@coreui/react";

export default function LoginPage() {
  const router = useRouter();
  const { token, user, loading: authLoading } = useAuth();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    phone?: string;
    password?: string;
  }>({});

  // If user is already authenticated, redirect away from /login
  useEffect(() => {
    if (authLoading) return;
    const isAuthed = Boolean(token) && Boolean(user);
    if (isAuthed) {
      const nextParam = Array.isArray(router.query.next)
        ? router.query.next[0]
        : router.query.next;
      const target =
        typeof nextParam === "string" && nextParam.startsWith("/")
          ? nextParam
          : "/";
      void router.replace(target);
    }
  }, [authLoading, token, user, router, router.query.next]);

  const isAuthed = Boolean(token) && Boolean(user);

  const validate = () => {
    const next: typeof errors = {};
    if (method === "email") {
      if (!email) next.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        next.email = "Enter a valid email";
    } else {
      if (!phone) next.phone = "Phone is required";
      else if (!/^\+?[0-9\s\-()]{7,}$/.test(phone))
        next.phone = "Enter a valid phone number";
    }
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      // Real API call to backend
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const body: any = { password };
      if (method === 'email') body.email = email;
      else body.phone = phone;
      const resp = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
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
      // Compute intended next page
      const nextParam = Array.isArray(router.query.next)
        ? router.query.next[0]
        : router.query.next;
      const target =
        typeof nextParam === "string" && nextParam.startsWith("/")
          ? nextParam
          : "/";

      // If email is not verified, go straight to /verify-email with the intended target
      let emailVerified: boolean | undefined = userFromLogin?.emailVerified;
      try {
        if (emailVerified === undefined && token) {
          const meResp = await fetch(`${base}/api/users/me`, {
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
        void router.push(target);
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
        <div className="login-container">
          <div className="login-card" role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo" aria-hidden>
              <img src="/logo.png" alt="CanViet Exchange" className="logo-img" />
            </div>
            <h1>Sign in to Dashboard</h1>
            <p>Welcome! Please sign in to continue</p>
          </div>

          <form
            className="login-form"
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
                Email
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={method === "phone"}
                className={`pill ${method === "phone" ? "active" : ""}`}
                onClick={() => setMethod("phone")}
              >
                Phone
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
                <label htmlFor="email">Email address</label>
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
                <label htmlFor="phone">Phone number</label>
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
              <label htmlFor="password">Password</label>
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
                Remember Me
              </label>
              <div className="form-links">
                <a href="/register" className="forgot-link">
                  Register
                </a>
                <a href="#" className="forgot-link">
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              className={`submit-btn ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              <span className="btn-text">
                {loading ? "Signing in…" : "Sign in"}
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
          </form>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <div className="social-buttons">
            <button
              type="button"
              className="social-btn"
              onClick={() => alert("Google OAuth coming soon")}
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
              <h3>Welcome back!</h3>
              <p>Redirecting to your dashboard...</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
          :global(html, body, #__next) {
            height: 100%;
          }
          .login-container {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: radial-gradient(
                1200px 400px at 50% -10%,
                rgba(91, 141, 239, 0.12),
                transparent
              ),
              linear-gradient(180deg, #0b1020 0%, #0e1530 100%);
            padding: 24px;
          }
          .login-card {
            width: 100%;
            max-width: 420px;
            background: rgba(16, 23, 42, 0.9);
            border: 1px solid #1b2440;
            color: #e6edf7;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
            position: relative;
            overflow: hidden;
          }
          .login-header {
            text-align: center;
            margin-bottom: 18px;
          }
          .logo {
            display: inline-flex;
            padding: 0;
            border-radius: 12px;
            background: transparent;
            box-shadow: none;
          }
          .logo-img { width: auto; height: 165px; display: block; object-fit: contain; }
          @media (max-width: 992px) { /* tablets */
            .logo-img { height: 140px; }
          }
          @media (max-width: 640px) { /* phones */
            .logo-img { height: 120px; }
          }
          .login-header h1 {
            margin: 10px 0 6px;
            font-size: 22px;
            font-weight: 700;
          }
          .login-header p {
            margin: 0;
            font-size: 14px;
            color: #9fb3c8;
          }

          .login-form {
            display: grid;
            gap: 14px;
          }
          .method-switch {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            background: #0f1730;
            border: 1px solid #1b2440;
            padding: 6px;
            border-radius: 12px;
          }
          .method-switch .pill {
            background: transparent;
            color: #9fb3c8;
            padding: 8px 10px;
            border-radius: 8px;
            border: 0;
            cursor: pointer;
          }
          .method-switch .pill.active {
            background: rgba(91, 141, 239, 0.15);
            color: #e6edf7;
            box-shadow: inset 0 0 0 1px rgba(91, 141, 239, 0.35);
          }
          .input-group {
            position: relative;
          }
          .input-group input {
            width: 100%;
            background: #0b1326;
            border: 1px solid #203058;
            color: #e6edf7;
            border-radius: 12px;
            padding: 14px 44px 14px 14px;
            outline: none;
            transition: box-shadow 0.2s, border-color 0.2s;
          }
          .input-group input:focus {
            border-color: #5b8def;
            box-shadow: 0 0 0 3px rgba(91, 141, 239, 0.25);
          }
          .input-group label {
            position: absolute;
            left: 12px;
            top: 12px;
            color: #9fb3c8;
            padding: 0 6px;
            background: transparent;
            pointer-events: none;
            transition: all 0.15s ease;
          }
          .input-group input:not(:placeholder-shown) + label,
          .input-group input:focus + label {
            top: -8px;
            font-size: 12px;
            background: #10172a;
            color: #cfe0ff;
          }
          .input-group .password-toggle {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            color: #a9bdd4;
            border: 0;
            padding: 6px;
            border-radius: 8px;
            cursor: pointer;
          }
          .input-group .password-toggle:hover {
            color: #e6edf7;
            background: rgba(255, 255, 255, 0.04);
          }
          .input-group .input-border {
            position: absolute;
            inset: 0;
            pointer-events: none;
            border-radius: 12px;
          }
          .input-group .error-message {
            display: block;
            margin-top: 6px;
            min-height: 18px;
            color: #ff9aa2;
            font-size: 12px;
          }
          .input-group.has-error input {
            border-color: #ff6b6b;
          }

          .form-options {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 6px;
          }
          .checkbox-container {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            user-select: none;
            cursor: pointer;
            color: #c7d3e1;
            position: relative;
          }
          /* Hide native checkbox but keep it focusable and accessible */
          .checkbox-container input {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
            pointer-events: none;
          }
          /* Custom square box */
          .checkbox-container .checkmark {
            width: 18px;
            height: 18px;
            border-radius: 6px;
            border: 1px solid #2a3a6a;
            background: #0b1326;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          /* Check icon inside the box (hidden by default) */
          .checkbox-container .checkmark svg {
            opacity: 0;
            transform: scale(0.8);
            transition: opacity 0.15s ease, transform 0.15s ease;
            color: #ffffff;
          }
          /* Checked state: colorize box and show the icon */
          .checkbox-container input:checked + .checkmark {
            background: #5b8def;
            border-color: #5b8def;
          }
          .checkbox-container input:checked + .checkmark svg {
            opacity: 1;
            transform: scale(1);
          }
          /* Keyboard focus ring */
          .checkbox-container input:focus-visible + .checkmark {
            box-shadow: 0 0 0 3px rgba(91, 141, 239, 0.35);
          }
          .form-links {
            display: inline-flex;
            gap: 12px;
          }
          .forgot-link {
            color: #5b8def;
            text-decoration: none;
            font-size: 14px;
          }
          .forgot-link:hover {
            text-decoration: underline;
          }

          .submit-btn {
            width: 100%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: #5b8def;
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 12px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 10px 30px rgba(91, 141, 239, 0.35);
            transition: transform 0.15s ease, box-shadow 0.15s ease,
              opacity 0.15s ease;
          }
          .submit-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 14px 34px rgba(91, 141, 239, 0.45);
          }
          .submit-btn:disabled {
            opacity: 0.75;
            cursor: not-allowed;
          }
          .submit-btn .btn-loader {
            display: none;
          }
          .submit-btn.loading .btn-loader {
            display: inline-flex;
          }

          .divider {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 16px 0 8px;
            color: #9fb3c8;
            font-size: 12px;
          }
          .divider::before,
          .divider::after {
            content: "";
            flex: 1;
            height: 1px;
            background: #1b2440;
          }

          .social-buttons {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .social-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: #0f1730;
            color: #e6edf7;
            border: 1px solid #1b2440;
            border-radius: 12px;
            padding: 10px;
            cursor: pointer;
          }
          .social-btn:hover {
            background: #131d3a;
          }

          /* signup-link styles removed */

          .success-message {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            background: rgba(11, 16, 32, 0.8);
            text-align: center;
          }
          .success-message h3 {
            margin: 10px 0 4px;
          }
          .success-message p {
            margin: 0;
            color: #9fb3c8;
          }
        `}</style>
    </>
  );
}
