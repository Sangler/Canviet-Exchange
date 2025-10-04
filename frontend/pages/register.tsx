import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
    if (!phone) next.phone = 'Phone number is required';
    else if (!/^\+?[0-9\s\-()]{7,}$/.test(phone)) next.phone = 'Enter a valid phone number';
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
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      };
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Registration failed');
      }
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 900));
      void router.push('/login');
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
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="logo" aria-hidden>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
                <rect width="32" height="32" rx="6" fill="#00B3A4" />
                <path d="M9 12h14v2H9v-2zm0 4h14v2H9v-2zm0 4h9v2H9v-2z" fill="white" />
              </svg>
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
                <div className={`input-group ${errors.phone ? 'has-error' : ''}`}>
                  <input type="tel" id="phone" placeholder=" " required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <label htmlFor="phone">Phone number</label>
                  <span className="input-border" />
                  <span className="error-message">{errors.phone}</span>
                </div>
                <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
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

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="submit-btn" onClick={() => setStep(1)} disabled={loading}>
                    Back
                  </button>
                  <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
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
              <p>Redirecting to login…</p>
            </div>
          )}
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
        .input-group input { width: 100%; background: #0b1326; border: 1px solid #203058; color: #e6edf7; border-radius: 12px; padding: 14px 44px 14px 14px; outline: none; transition: box-shadow .2s, border-color .2s; }
        .input-group input:focus { border-color: #00B3A4; box-shadow: 0 0 0 3px rgba(0,179,164,0.25); }
        .input-group label { position: absolute; left: 12px; top: 12px; color: #9fb3c8; padding: 0 6px; background: transparent; pointer-events: none; transition: all .15s ease; }
        .input-group input:not(:placeholder-shown) + label,
        .input-group input:focus + label { top: -8px; font-size: 12px; background: #10172a; color: #baf3ed; }
        .input-group .password-toggle { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; color: #a9bdd4; border: 0; padding: 6px; border-radius: 8px; cursor: pointer; }
        .input-group .password-toggle:hover { color: #e6edf7; background: rgba(255,255,255,0.04); }
        .input-group .input-border { position: absolute; inset: 0; pointer-events: none; border-radius: 12px; }
        .input-group .error-message { display: block; margin-top: 6px; min-height: 18px; color: #ff9aa2; font-size: 12px; }
        .input-group.has-error input { border-color: #ff6b6b; }

        .submit-btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 10px; background: #00B3A4; color: white; border: none; padding: 12px 16px; border-radius: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 30px rgba(0,179,164,0.35); transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease; }
        .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 14px 34px rgba(0,179,164,0.45); }
        .submit-btn:disabled { opacity: 0.75; cursor: not-allowed; }
        .submit-btn .btn-loader { display: none; }
        .submit-btn.loading .btn-loader { display: inline-flex; }

  .divider { display: flex; align-items: center; gap: 10px; margin: 16px 0 8px; color: #9fb3c8; font-size: 12px; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #1b2440; }
  .social-buttons { display: grid; grid-template-columns: 1fr; gap: 10px; }
  .social-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #0f1730; color: #e6edf7; border: 1px solid #1b2440; border-radius: 12px; padding: 10px; cursor: pointer; }
  .social-btn:hover { background: #131d3a; }

        .alt-link { text-align: center; color: #9fb3c8; margin-top: 10px; font-size: 14px; }
        .alt-link a { color: #cfe0ff; text-decoration: none; }
        .alt-link a:hover { text-decoration: underline; }

        .success-message { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(11,16,32,0.8); text-align: center; }
        .success-message h3 { margin: 10px 0 4px; }
        .success-message p { margin: 0; color: #9fb3c8; }
      `}</style>
    </>
  );
}
