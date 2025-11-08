import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getAuthToken } from '../lib/auth';
import { useLanguage } from '../context/LanguageContext';

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

  useEffect(() => {
    // Check if user is already verified and redirect to dashboard
    (async () => {
      try {
        const token = getAuthToken();
        if (token) {
          const resp = await fetch(`/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await resp.json();
          if (data?.user?.emailVerified) {
            // User's email is already verified, redirect to transfers
            router.replace('/transfers');
            return;
          }
        }
      } catch (e) {
        console.error('Error checking email verification status:', e);
      }
    })();

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
      
      // Handle already verified email
      if (data?.code === 'EMAIL_ALREADY_VERIFIED') {
        await router.replace('/dashboard');
        return;
      }
      
      if (!resp.ok || !data?.otpToken) throw new Error(data?.message || t('auth.failedToRequestCode'));
      setOtpToken(data.otpToken);
      setStatus(t('auth.codeSent'));
      setStatusType('success');
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
      try { localStorage.removeItem('pending_verify_email'); } catch {}
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
    <>
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
            <button className={`submit-btn submit-btn--accent ${loading ? 'loading' : ''}`} onClick={request} disabled={loading || !email}>
              <span className="btn-text">{loading ? t('auth.sending') : t('auth.sendCode')}</span>
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
              <label htmlFor="code">{t('auth.sixDigitCode')}</label>
              <span className="input-border" />
            </div>
            <button className={`submit-btn submit-btn--accent ${loading ? 'loading' : ''}`} onClick={verify} disabled={loading || !code || !otpToken}>
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

            {status && (
              <div className={`status ${statusType || 'success'}`} role="status" aria-live="polite">{status}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
