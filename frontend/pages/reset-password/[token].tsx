import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useColorModes } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMoon, cilSun } from '@coreui/icons';
import { useLanguage } from '../../context/LanguageContext';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const { language, setLanguage, t } = useLanguage();
  
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (!token || typeof token !== 'string') return;

    const validateToken = async () => {
      setValidating(true);
      try {
        const resp = await fetch(`/api/auth/reset-password/${token}`);
        const data = await resp.json().catch(() => ({}));

        if (!resp.ok || !data.valid) {
          setTokenError(data.message || 'Invalid or expired reset link');
          setTokenValid(false);
        } else {
          setTokenValid(true);
          setUserEmail(data.email || '');
        }
      } catch (err: any) {
        setTokenError('Failed to validate reset link');
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const validateForm = () => {
    if (!password) {
      setError(t('validation.passwordRequired'));
      return false;
    }
    if (password.length < 8) {
      setError(t('validation.passwordLength'));
      return false;
    }
    if (confirm !== password) {
      setError(t('validation.passwordMismatch'));
      return false;
    }
    return true;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const resp = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(data?.message || 'Failed to reset password');
      }

      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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

          <div className="auth-header">
            <div className="logo" aria-hidden>
              <img src="/logo.png" alt="CanViet Exchange" className="logo-img" />
            </div>
            <h1>Reset Your Password</h1>
            {tokenValid && userEmail && <p>For account: {userEmail}</p>}
          </div>

          {validating ? (
            <div className="text-center-pad">
              <div className="btn-loader btn-loader-inline">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M36 20a16 16 0 01-16 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 20 20;360 20 20" repeatCount="indefinite" />
                  </path>
                </svg>
              </div>
              <p className="muted mt-12">Validating reset link...</p>
            </div>
          ) : !tokenValid ? (
            <div className="oauth-error-lg">
              <h3 className="no-mt">Invalid Reset Link</h3>
              <p>{tokenError}</p>
              <p className="mt-20">
                <a href="/forget-pass" className="submit-btn submit-btn--accent btn-inline-block">
                  Request New Link
                </a>
              </p>
            </div>
          ) : success ? (
            <div className="success-message" role="status" aria-live="polite">
              <h3>Password Reset Successfully!</h3>
              <p>You can now log in with your new password.</p>
              <p className="muted mt-12">Redirecting to login...</p>
            </div>
          ) : (
            <form className="auth-form" noValidate onSubmit={onSubmit}>
              {error && (
                <div className="oauth-error">{error}</div>
              )}

              <div className={`input-group ${error && !password ? 'has-error' : ''}`}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  id="password" 
                  placeholder=" " 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  autoComplete="new-password"
                />
                <label htmlFor="password">{t('auth.password')}</label>
                <button 
                  type="button" 
                  className="password-toggle" 
                  onClick={() => setShowPassword((s) => !s)} 
                  aria-label="Toggle password visibility"
                >
                  <svg className="eye-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M8 3C4.5 3 1.6 5.6 1 8c.6 2.4 3.5 5 7 5s6.4-2.6 7-5c-.6-2.4-3.5-5-7-5zm0 8.5A3.5 3.5 0 118 4.5a3.5 3.5 0 010 7zm0-5.5a2 2 0 100 4 2 2 0 000-4z" fill="currentColor" />
                  </svg>
                </button>
                <span className="input-border" />
              </div>

              <div className={`input-group ${error && password && confirm !== password ? 'has-error' : ''}`}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  id="confirm" 
                  placeholder=" " 
                  value={confirm} 
                  onChange={(e) => setConfirm(e.target.value)} 
                  autoComplete="new-password"
                />
                <label htmlFor="confirm">{t('auth.confirmPassword')}</label>
                <span className="input-border" />
              </div>

              <button 
                type="submit" 
                className={`submit-btn submit-btn--accent ${loading ? 'loading' : ''}`} 
                disabled={loading}
              >
                <span className="btn-text">{loading ? 'Resetting...' : 'Reset Password'}</span>
                <div className="btn-loader" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                    <path d="M16 9a7 7 0 01-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 9 9;360 9 9" repeatCount="indefinite" />
                    </path>
                  </svg>
                </div>
              </button>
            </form>
          )}

          <div className="alt-link">
            <span>Remember your password? </span>
            <a href="/login">Sign In</a>
          </div>
        </div>
      </div>
    </>
  );
}
