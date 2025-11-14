import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getAuthToken } from '../lib/auth';
import { useLanguage } from '../context/LanguageContext';
import RequireAuth from '../components/RequireAuth';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [emailLocked, setEmailLocked] = useState(false);
  const [code, setCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showCodeInput, setShowCodeInput] = useState(false);

  // Check and restore countdown from localStorage
  useEffect(() => {
    const checkCountdown = () => {
      try {
        const expiryStr = localStorage.getItem('otp_request_expiry');
        if (expiryStr) {
          const expiryTime = parseInt(expiryStr, 10);
          const now = Date.now();
          if (expiryTime > now) {
            const remaining = Math.ceil((expiryTime - now) / 1000);
            setCountdown(remaining);
            // Ensure the OTP input remains visible while countdown is active (e.g., after refresh)
            setShowCodeInput(true);
          } else {
            localStorage.removeItem('otp_request_expiry');
          }
        }
      } catch {}
    };
    checkCountdown();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          try {
            localStorage.removeItem('otp_request_expiry');
          } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    // Check user's email verification status from database
    (async () => {
      try {
        const token = getAuthToken();

        // If there is no auth token, do not call /api/users/me to avoid backend 401 noise.
        if (!token) {
          const qEmail = (router.query.email as string) || '';
          if (qEmail) {
            setEmail(qEmail);
            setEmailLocked(true);
          }
          return;
        }

        // Authenticated: fetch profile and react accordingly
        const resp = await fetch(`/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await resp.json();

        if (data?.user?.emailVerified) {
          // User's email is already verified, redirect to transfers
          router.replace('/transfers');
          return;
        }

        // User not verified - prefill email from database
        if (data?.user?.email) {
          setEmail(data.user.email);
          setEmailLocked(true);
          return;
        }
      } catch (e) {
        console.error('Error checking email verification status:', e);
        // On error, fall back to query param if present
        const qEmail = (router.query.email as string) || '';
        if (qEmail) {
          setEmail(qEmail);
          setEmailLocked(true);
        }
      }
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
      
      // Handle already verified email: backend may return ok + message 'Already verified'
      const alreadyVerified = data?.code === 'EMAIL_ALREADY_VERIFIED' || (data?.ok && typeof data?.message === 'string' && data.message.toLowerCase().includes('already verified'));
      if (alreadyVerified) {
        // Show a friendly failure message and do not show OTP input or start countdown
        setStatus(t('auth.failedToRequestCode'));
        setStatusType('error');
        return;
      }

      // Consider any non-2xx response as an error
      if (!resp.ok) throw new Error(data?.message || t('auth.failedToRequestCode'));

      // Treat success as OTP issued (backend may omit otpToken in some flows)
      setOtpToken(String(data?.otpToken || ''));
      setStatus(t('auth.codeSent'));
      setStatusType('success');
      setShowCodeInput(true);

      // Set 60-second countdown and save expiry to localStorage
      const expiryTime = Date.now() + 60000; // 60 seconds
      try {
        localStorage.setItem('otp_request_expiry', expiryTime.toString());
      } catch {}
      setCountdown(60);
    } catch (e: any) {
      setStatus(e?.message || t('auth.failedToRequestCode'));
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
      
      // Handle already verified email
      if (data?.code === 'EMAIL_ALREADY_VERIFIED') {
        await router.replace('/dashboard');
        return;
      }
      
      if (!resp.ok) throw new Error(data?.message || t('auth.verificationFailed'));
      
      const next = (router.query.next as string) || '/';
      await router.replace(next);
    } catch (e: any) {
      setStatus(e?.message || t('auth.verificationFailed'));
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequireAuth>
      <Head>
        <title>{t('auth.verifyEmail')}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
  <div className="auth-container bg-auth">
    <div className="auth-card">
          <div className="top-right">
            <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); setLanguage('en'); }}
                style={{ textDecoration: 'none', color: 'inherit', fontWeight: language === 'en' ? 'bold' : 'normal' }}
              >
                EN
              </a>
              <span aria-hidden="true">|</span>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); setLanguage('vi'); }}
                style={{ textDecoration: 'none', color: 'inherit', fontWeight: language === 'vi' ? 'bold' : 'normal' }}
              >
                VI
              </a>
            </span>
          </div>
          <div className="auth-header">
            <div className="logo" aria-hidden>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
                <rect width="32" height="32" rx="6" fill="#00B3A4" />
                <path d="M9 12h14v2H9v-2zm0 4h14v2H9v-2zm0 4h9v2H9v-2z" fill="white" />
              </svg>
            </div>
            <h1>{t('auth.verifyEmail')}</h1>
            <p>{t('auth.verifyEmailSubtitle')}</p>
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
              <label htmlFor="email">{t('auth.emailAddress')}</label>
              <span className="input-border" />
            </div>
            <button className={`submit-btn submit-btn--accent ${loading ? 'loading' : ''}`} onClick={request} disabled={loading || !email || countdown > 0}>
              <span className="btn-text">
                {loading ? t('auth.sending') : countdown > 0 ? `${countdown}s` : t('auth.sendCode')}
              </span>
              <div className="btn-loader" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                  <path d="M16 9a7 7 0 01-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 9 9;360 9 9" repeatCount="indefinite" />
                  </path>
                </svg>
              </div>
            </button>

            {showCodeInput && (
              <>
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
                  <label htmlFor="code">{t('auth.sixDigitCode')}</label>
                  <span className="input-border" />
                </div>
                <button className={`submit-btn submit-btn--accent ${loading ? 'loading' : ''}`} onClick={verify} disabled={loading || !code}>
                  <span className="btn-text">{loading ? t('auth.verifying') : t('auth.verify')}</span>
                  <div className="btn-loader" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                      <path d="M16 9a7 7 0 01-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 9 9;360 9 9" repeatCount="indefinite" />
                      </path>
                    </svg>
                  </div>
                </button>
              </>
            )}

            {status && (
              <div className={`status ${statusType || 'success'}`} role="status" aria-live="polite">{status}</div>
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
