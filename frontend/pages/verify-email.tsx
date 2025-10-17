import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getAuthToken } from '../lib/auth';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailLocked, setEmailLocked] = useState(false);
  const [code, setCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Prefill email: priority order => query param -> localStorage -> authenticated user
    const qEmail = (router.query.email as string) || '';
    if (qEmail) {
      setEmail(qEmail);
      setEmailLocked(true);
      try { localStorage.setItem('pending_verify_email', qEmail); } catch {}
      return;
    }
    try {
      const stored = localStorage.getItem('pending_verify_email');
      if (stored) {
        setEmail(stored);
        setEmailLocked(true);
        return;
      }
    } catch {}
    // Fallback to authenticated user's email
    (async () => {
      try {
        const token = getAuthToken();
        const resp = await fetch(`/api/users/me`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        const data = await resp.json();
        if (data?.user?.email) {
          setEmail(data.user.email);
          setEmailLocked(true);
        }
      } catch {}
    })();
  }, [router.query.email]);

  const request = async () => {
    setLoading(true);
    setStatus(null);
    setStatusType(null);
    try {
      const resp = await fetch(`/api/otp/email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.otpToken) throw new Error(data?.message || 'Failed to request code');
      setOtpToken(data.otpToken);
      setStatus('Code sent to your email');
      setStatusType('success');
    } catch (e: any) {
      setStatus(e?.message || 'Failed to request code');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    setStatus(null);
    setStatusType(null);
    try {
      const resp = await fetch(`/api/otp/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, otpToken }),
      });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.message || 'Verification failed');
  try { localStorage.removeItem('pending_verify_email'); } catch {}
  const next = (router.query.next as string) || '/';
      await router.replace(next);
    } catch (e: any) {
      setStatus(e?.message || 'Verification failed');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Verify your email</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="logo" aria-hidden>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
                <rect width="32" height="32" rx="6" fill="#00B3A4" />
                <path d="M9 12h14v2H9v-2zm0 4h14v2H9v-2zm0 4h9v2H9v-2z" fill="white" />
              </svg>
            </div>
            <h1>Verify your email</h1>
            <p>We will send a 6‑digit code to your inbox</p>
          </div>

          <div className="auth-form" role="form" aria-label="Verify email">
            <div className="input-group">
              <input
                type="email"
                id="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={emailLocked}
              />
              <label htmlFor="email">Email address</label>
              <span className="input-border" />
            </div>
            <button className={`submit-btn ${loading ? 'loading' : ''}`} onClick={request} disabled={loading || !email}>
              <span className="btn-text">{loading ? 'Sending…' : 'Send code'}</span>
              <div className="btn-loader" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                  <path d="M16 9a7 7 0 01-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 9 9;360 9 9" repeatCount="indefinite" />
                  </path>
                </svg>
              </div>
            </button>

            <div className="input-group">
              <input
                id="code"
                placeholder=" "
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
              />
              <label htmlFor="code">6-digit code</label>
              <span className="input-border" />
            </div>
            <button className={`submit-btn ${loading ? 'loading' : ''}`} onClick={verify} disabled={loading || !code || !otpToken}>
              <span className="btn-text">{loading ? 'Verifying…' : 'Verify'}</span>
              <div className="btn-loader" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                  <path d="M16 9a7 7 0 01-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 9 9;360 9 9" repeatCount="indefinite" />
                  </path>
                </svg>
              </div>
            </button>

            {status && (
              <div className={`status ${statusType || 'success'}`} role="status" aria-live="polite">{status}</div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(html, body, #__next) { height: 100%; }
        .auth-container { min-height: 100vh; display: grid; place-items: center; background: radial-gradient(1200px 400px at 50% -10%, rgba(91,141,239,.12), transparent), linear-gradient(180deg, #0b1020 0%, #0e1530 100%); padding: 24px; }
        .auth-card { width: 100%; max-width: 480px; background: rgba(16,23,42,0.92); border: 1px solid #1b2440; color: #e6edf7; border-radius: 16px; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.35); position: relative; overflow: hidden; }
        .auth-header { text-align: center; margin-bottom: 18px; }
        .logo { display: inline-flex; padding: 10px; border-radius: 12px; background: rgba(0,179,164,0.12); box-shadow: inset 0 0 0 1px rgba(0,179,164,0.25); }
        .auth-header h1 { margin: 10px 0 6px; font-size: 22px; font-weight: 700; }
        .auth-header p { margin: 0; font-size: 14px; color: #9fb3c8; }

        .auth-form { display: grid; gap: 14px; }
        .input-group { position: relative; }
        .input-group input { width: 100%; background: #0b1326; border: 1px solid #203058; color: #e6edf7; border-radius: 12px; padding: 14px 14px; outline: none; transition: box-shadow .2s, border-color .2s; }
        .input-group input:focus { border-color: #00B3A4; box-shadow: 0 0 0 3px rgba(0,179,164,0.25); }
        .input-group label { position: absolute; left: 12px; top: 12px; color: #9fb3c8; padding: 0 6px; background: transparent; pointer-events: none; transition: all .15s ease; }
        .input-group input:not(:placeholder-shown) + label,
        .input-group input:focus + label { top: -8px; font-size: 12px; background: #10172a; color: #baf3ed; }
        .input-group .input-border { position: absolute; inset: 0; pointer-events: none; border-radius: 12px; }

        .submit-btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 10px; background: #00B3A4; color: white; border: none; padding: 12px 16px; border-radius: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 30px rgba(0,179,164,0.35); transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease; }
        .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 14px 34px rgba(0,179,164,0.45); }
        .submit-btn:disabled { opacity: 0.75; cursor: not-allowed; }
        .submit-btn .btn-loader { display: none; }
        .submit-btn.loading .btn-loader { display: inline-flex; }

        .status { padding: 10px 12px; border-radius: 10px; font-size: 14px; }
        .status.success { background: rgba(0,179,164,0.12); color: #baf3ed; border: 1px solid rgba(0,179,164,0.35); }
        .status.error { background: rgba(255,0,0,0.08); color: #ffb3b3; border: 1px solid rgba(255,0,0,0.25); }
      `}</style>
    </>
  );
}
