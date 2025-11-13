import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useLanguage } from "../context/LanguageContext";
import { CSpinner, useColorModes } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilMoon, cilSun } from "@coreui/icons";

export default function ForgetPassPage() {
  const router = useRouter();
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const { language, setLanguage, t } = useLanguage();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) return setError(t('validation.emailRequired') || 'Email required');
    if (!validateEmail(email)) return setError(t('validation.emailInvalid') || 'Invalid email');
    try {
      setLoading(true);
      const resp = await fetch(`/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.message || 'Failed to send reset email');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('auth.forgotPassword') || 'Forgot Password'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="auth-container bg-auth">
        <div className="auth-card">
          <div className="top-right">
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setLanguage('en'); }}
                style={{ textDecoration: 'none', color: 'inherit', fontWeight: language === 'en' ? 'bold' : 'normal' }}
              >
                EN
              </a>
              <span aria-hidden>|</span>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setLanguage('vi'); }}
                style={{ textDecoration: 'none', color: 'inherit', fontWeight: language === 'vi' ? 'bold' : 'normal' }}
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

          <div className="auth-header">
            <div className="logo" aria-hidden>
              <img src="/logo.png" alt="CanViet Exchange" className="logo-img" />
            </div>
            <h1>{t('auth.resetYourPassword') || 'Reset Your Password'}</h1>
            <p>{t('auth.resetPasswordIntro') || "Enter your email address and we'll send you a reset link"}</p>
          </div>

          {success ? (
            <div className="success-message" role="status" aria-live="polite">
              <h3>{t('auth.checkYourEmail') || 'Check Your Email'}</h3>
              <p>{t('auth.resetEmailSent') || "If an account with that email exists, we've sent a password reset link. Please check your inbox."}</p>
              <p style={{ marginTop: '20px' }}>
                <a href="/login" className="submit-btn submit-btn--accent" style={{ display: 'inline-block', textDecoration: 'none' }}>
                  {t('common.backToLogin') || 'Back to Login'}
                </a>
              </p>
            </div>
          ) : (
            <form className="auth-form" noValidate onSubmit={onSubmit}>
              {error && (
                <div style={{ background: '#fee', color: '#c33', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px' }}>
                  {error}
                </div>
              )}

              <div className={`input-group ${error && !email ? 'has-error' : ''}`}>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby="emailError"
                />
                <label htmlFor="email">{t('auth.emailAddress') || 'Email address'}</label>
                <span className="input-border" />
                <span className="error-message" id="emailError">
                  {error && !email ? (t('validation.emailRequired') || 'Email required') : ''}
                </span>
              </div>

              <div style={{ marginTop: 8 }}>
                <button type="submit" className="submit-btn submit-btn--accent" disabled={loading}>
                  {loading ? (
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <CSpinner size="sm" />
                      {t('common.sending') || 'Sending…'}
                    </span>
                  ) : (
                    t('auth.sendReset') || 'Send Reset Email'
                  )}
                </button>
                <a href="/login" className="forgot-link" style={{ marginLeft: 12 }}>
                  {t('common.backToLogin') || 'Back to Login'}
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
