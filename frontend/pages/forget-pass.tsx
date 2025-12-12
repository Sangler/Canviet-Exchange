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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
      <div className="auth-container bg-auth">
        <div className="auth-card">
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
              <p className="mt-20">
                <a href="/login" className="submit-btn submit-btn--accent btn-inline-block">
                  {t('common.backToLogin') || 'Back to Login'}
                </a>
              </p>
            </div>
          ) : (
            <form className="auth-form" noValidate onSubmit={onSubmit}>
              {error && (
                <div className="oauth-error">{error}</div>
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

              <div className="mt-8">
                <button type="submit" className="submit-btn submit-btn--accent" disabled={loading}>
                  {loading ? (
                    <span className="inline-lang">
                      <CSpinner size="sm" />
                      {t('common.sending') || 'Sending…'}
                    </span>
                  ) : (
                    t('auth.sendReset') || 'Send Reset Email'
                  )}
                </button>
                <a href="/login" className="forgot-link ml-12">
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
