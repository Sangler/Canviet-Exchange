import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useColorModes } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMoon, cilSun } from '@coreui/icons';
import { useLanguage } from '../context/LanguageContext';
import { setAuthToken } from '../lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const { language, setLanguage, t } = useLanguage();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string; phone?: string; password?: string; confirm?: string }>({});

  const validateStep1 = () => {
    const next: typeof errors = {};
    if (!firstName) next.firstName = t('validation.firstNameRequired');
    if (!lastName) next.lastName = t('validation.lastNameRequired');
    if (!email) next.email = t('validation.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t('validation.emailInvalid');
    // Phone field is currently hidden; only validate if user has entered a value
    if (phone && !/^\+?[0-9\s\-()]{7,}$/.test(phone)) next.phone = t('validation.phoneInvalid');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep2 = () => {
    const next: typeof errors = {};
    if (!password) next.password = t('validation.passwordRequired');
    else if (password.length < 8) next.password = t('validation.passwordLength');
    if (confirm !== password) next.confirm = t('validation.passwordMismatch');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;
    setStep(2);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      };
      if (phone && phone.trim()) {
        payload.phone = phone.trim();
      }
      if (referralCode && referralCode.trim()) {
        payload.referralCode = referralCode.trim();
      }
      // Use same-origin proxy for backend calls
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Registration failed');
      }
      const data = await resp.json();
      const { token } = data;
      if (token) {
        // Store token in sessionStorage (non-persistent like login without "remember me")
        setAuthToken(token, { persistent: false });
      }
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 250));
      void router.push(`/verify-email?email=${encodeURIComponent(email.trim())}&next=/login`);
    } catch (err: any) {
      setErrors({ ...(errors || {}), password: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create your account</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
  <div className="auth-container bg-auth">
    <div className="auth-card register">
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
            <h1>{t('auth.createAccount')}</h1>
            <p>{t('auth.startTransferring')}</p>
          </div>

          <form className="auth-form" noValidate onSubmit={step === 1 ? onNext : onCreate}>
            {step === 1 ? (
              <>
                <div className={`input-group ${errors.firstName ? 'has-error' : ''}`}>
                  <input id="firstName" name="firstName" placeholder=" " value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  <label htmlFor="firstName">{t('auth.firstName')}</label>
                  <span className="input-border" />
                  <span className="error-message">{errors.firstName}</span>
                </div>
                <div className={`input-group ${errors.lastName ? 'has-error' : ''}`}>
                  <input id="lastName" name="lastName" placeholder=" " value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  <label htmlFor="lastName">{t('auth.lastName')}</label>
                  <span className="input-border" />
                  <span className="error-message">{errors.lastName}</span>
                </div>
                <div className={`input-group ${errors.email ? 'has-error' : ''}`}>
                  <input type="email" id="email" placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} />
                  <label htmlFor="email">{t('auth.emailAddress')}</label>
                  <span className="input-border" />
                  <span className="error-message">{errors.email}</span>
                </div>

                <button type="submit" className={`submit-btn submit-btn--accent ${loading ? 'loading' : ''}`} disabled={loading}>
                  <span className="btn-text">{loading ? t('common.next') : t('auth.createNewAccount')}</span>
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
            ) : (
              <>
                <div className={`input-group ${errors.password ? 'has-error' : ''}`}>
                  <input type={showPassword ? 'text' : 'password'} id="password" placeholder=" " value={password} onChange={(e) => setPassword(e.target.value)} />
                  <label htmlFor="password">{t('auth.password')}</label>
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility">
                    <svg className="eye-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M8 3C4.5 3 1.6 5.6 1 8c.6 2.4 3.5 5 7 5s6.4-2.6 7-5c-.6-2.4-3.5-5-7-5zm0 8.5A3.5 3.5 0 118 4.5a3.5 3.5 0 010 7zm0-5.5a2 2 0 100 4 2 2 0 000-4z" fill="currentColor" />
                    </svg>
                  </button>
                  <span className="input-border" />
                  <span className="error-message">{errors.password}</span>
                </div>
                <div className={`input-group ${errors.confirm ? 'has-error' : ''}`}>
                  <input type={showPassword ? 'text' : 'password'} id="confirm" placeholder=" " value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                  <label htmlFor="confirm">{t('auth.confirmPassword')}</label>
                  <span className="input-border" />
                  <span className="error-message">{errors.confirm}</span>
                </div>

                {/* Referral code input (optional) */}
                <div className="input-group">
                  <input 
                    type="text" 
                    id="referralCode" 
                    placeholder=" " 
                    value={referralCode} 
                    onChange={(e) => setReferralCode(e.target.value.trim())} 
                  />
                  <label htmlFor="referralCode">{t('auth.referralCode')}</label>
                  <span className="input-border" />
                  <span className="error-message"></span>
                </div>

                <div className="flex-gap-12">
                  <button type="button" className="submit-btn submit-btn--accent" onClick={() => setStep(1)} disabled={loading}>
                    {t('common.back')}
                  </button>
                  <button type="submit" className={`submit-btn submit-btn--accent ${loading ? 'loading' : ''}`} disabled={loading}>
                    <span className="btn-text">{loading ? t('auth.creating') : t('common.register')}</span>
                    <div className="btn-loader" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                        <path d="M16 9a7 7 0 01-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 9 9;360 9 9" repeatCount="indefinite" />
                        </path>
                      </svg>
                    </div>
                  </button>
                </div>
              </>
            )}
            <p className="form-note small text-medium-emphasis mt-3 text-center">By using our services, you agree to our <a href="/terms-and-conditions" className="text-link">terms &amp; conditions</a></p>
          </form>

          <div className="alt-link">
            <span>{t('auth.alreadyHaveAccount')} </span>
            <a href="/login">{t('auth.signIn')}</a>
          </div>

          {success && (
            <div className="success-message" role="status" aria-live="polite">
              <h3>{t('auth.accountCreated')}</h3>
              <p>{t('auth.redirectingVerify')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
