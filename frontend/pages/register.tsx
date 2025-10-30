import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useColorModes } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMoon, cilSun } from '@coreui/icons';

export default function RegisterPage() {
  const router = useRouter();
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
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
    if (!firstName) next.firstName = 'First name is required';
    if (!lastName) next.lastName = 'Last name is required';
    if (!email) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email';
    // Phone field is currently hidden; only validate if user has entered a value
    if (phone && !/^\+?[0-9\s\-()]{7,}$/.test(phone)) next.phone = 'Enter a valid phone number';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep2 = () => {
    const next: typeof errors = {};
    if (!password) next.password = 'Password is required';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters';
    if (confirm !== password) next.confirm = 'Passwords do not match';
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
      setSuccess(true);
      // Do NOT auto-send email OTP; redirect to verify-email with prefilled email
      try { localStorage.setItem('pending_verify_email', email.trim()); } catch {}
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
  <div className="auth-container bg-auth">
    <div className="auth-card register">
          {/* Language switcher and theme toggle */}
          <div className="top-right">
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <a href="?lang=en" style={{ textDecoration: 'none', color: 'inherit' }}>EN</a>
              <span aria-hidden>|</span>
              <a href="?lang=vi" style={{ textDecoration: 'none', color: 'inherit' }}>VI</a>
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
            <h1>Create your account</h1>
            <p>Start transferring in minutes</p>
          </div>

          <form className="auth-form" noValidate onSubmit={step === 1 ? onNext : onCreate}>
            {step === 1 ? (
              <>
                <div className={`input-group ${errors.firstName ? 'has-error' : ''}`}>
                  <input id="firstName" name="firstName" placeholder=" " value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  <label htmlFor="firstName">First name</label>
                  <span className="input-border" />
                  <span className="error-message">{errors.firstName}</span>
                </div>
                <div className={`input-group ${errors.lastName ? 'has-error' : ''}`}>
                  <input id="lastName" name="lastName" placeholder=" " value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  <label htmlFor="lastName">Last name</label>
                  <span className="input-border" />
                  <span className="error-message">{errors.lastName}</span>
                </div>
                <div className={`input-group ${errors.email ? 'has-error' : ''}`}>
                  <input type="email" id="email" placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} />
                  <label htmlFor="email">Email address</label>
                  <span className="input-border" />
                  <span className="error-message">{errors.email}</span>
                </div>
                {/* <div className={`input-group ${errors.phone ? 'has-error' : ''}`}>
                  <input type="tel" id="phone" placeholder=" " required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <label htmlFor="phone">Phone number</label>
                  <span className="input-border" />
                  <span className="error-message">{errors.phone}</span>
                </div> */}
                <button type="submit" className={`submit-btn submit-btn--accent ${loading ? 'loading' : ''}`} disabled={loading}>
                  <span className="btn-text">{loading ? 'Next…' : 'Create New Account'}</span>
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
                  <label htmlFor="password">Password</label>
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
                  <label htmlFor="confirm">Confirm password</label>
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
                  <label htmlFor="referralCode">Referral Code (Optional)</label>
                  <span className="input-border" />
                  <span className="error-message"></span>
                </div>

                <div className="flex-gap-12">
                  <button type="button" className="submit-btn submit-btn--accent" onClick={() => setStep(1)} disabled={loading}>
                    Back
                  </button>
                  <button type="submit" className={`submit-btn submit-btn--accent ${loading ? 'loading' : ''}`} disabled={loading}>
                    <span className="btn-text">{loading ? 'Creating…' : 'Register'}</span>
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
          </form>


          <div className="alt-link">
            <span>Already have an account? </span>
            <a href="/login">Sign in</a>
          </div>

          {success && (
            <div className="success-message" role="status" aria-live="polite">
              <h3>Account created!</h3>
              <p>Redirecting to verify your email…</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
