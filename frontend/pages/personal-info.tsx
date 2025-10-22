import { useEffect, useState } from 'react';
import { useColorModes } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSun, cilMoon } from '@coreui/icons';
import Head from 'next/head';
import RequireAuth from '../components/RequireAuth';
import { getAuthToken, logout } from '../lib/auth';

interface MeResponse {
  user?: {
    id?: string; email?: string; firstName?: string; lastName?: string; phone?: string; role?: string; emailVerified?: boolean; createdAt?: string;
    dateOfBirth?: string; address?: { street?: string; postalCode?: string; city?: string; country?: string }; employmentStatus?: string;
  };
}

export default function PersonalInfoPage() {
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse['user'] | null>(null);
  // Form state (prefill with user once loaded)
  const [country, setCountry] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Restore saved theme with light as default fallback
    try {
      const savedMode = localStorage.getItem('theme.mode');
      if (savedMode === 'dark' || savedMode === 'light') setColorMode(savedMode as 'dark' | 'light');
      else setColorMode('light');
    } catch {
      setColorMode('light');
    }
    (async () => {
      try {
        const token = getAuthToken();
          const resp = await fetch(`/api/users/me`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        if (resp.status === 401) {
          // Token invalid/expired: force re-auth
          await logout('/login?next=/personal-info');
          return;
        }
        const data: MeResponse = await resp.json();
        if (!resp.ok) throw new Error((data as any)?.message || 'Failed to load profile');
        const u = data.user || {};
        setUser(u);
        setFirstName(u.firstName || '');
        setLastName(u.lastName || '');
        setPhone(u.phone || '');
        setEmploymentStatus(u.employmentStatus || '');
        const addr = u.address || {};
        setStreet(addr.street || '');
        setCity(addr.city || '');
        setPostalCode(addr.postalCode || '');
        setCountry(addr.country || 'Canada');
        // DOB parse to YYYY-MM-DD
        if (u.dateOfBirth) {
          const d = new Date(u.dateOfBirth);
          const yyyy = String(d.getUTCFullYear());
          const mm = String(d.getUTCMonth()+1).padStart(2,'0');
          const dd = String(d.getUTCDate()).padStart(2,'0');
          setDob(`${yyyy}-${mm}-${dd}`);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist theme choice
  useEffect(() => {
    try { localStorage.setItem('theme.mode', colorMode || 'light'); } catch {}
  }, [colorMode]);

  const months: string[] = [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      // Build payload
      let dobIso: string | undefined = undefined;
      if (dob) {
        // Construct ISO at UTC midnight to avoid TZ drift
        const [yyyy, mm, dd] = dob.split('-').map((s)=> parseInt(s, 10));
        if (!isNaN(yyyy) && !isNaN(mm) && !isNaN(dd)) {
          dobIso = new Date(Date.UTC(yyyy, mm - 1, dd)).toISOString();
        }
      }
      const payload: any = {
        dateOfBirth: dobIso,
        address: {
          street,
          postalCode,
          city,
          country,
        },
        employmentStatus,
      };
      const token = getAuthToken();
      const resp = await fetch(`/api/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.ok) throw new Error(data?.message || 'Failed to save profile');
      // On success, redirect to transfers
      window.location.href = '/transfers';
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <>
        <Head>
          <title>Introduction</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        </Head>
        <div className="auth-container" style={{ paddingTop: 40, paddingBottom: 60 }}>
          <div className="auth-card pi-card-centered" style={{ width: '100%', maxWidth: 900 }}>
          <a href="/transfers" className="back-btn" aria-label="Back to transfers" title="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <div className="top-right" aria-label="Controls">
            <span className="lang-switch">
              <a href="?lang=en">EN</a>
              <span aria-hidden>|</span>
              <a href="?lang=vi">VI</a>
            </span>
            <button
              type="button"
              className="mode-btn"
              onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
              aria-label={`Toggle ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
              title="Toggle color mode"
            >
              <CIcon icon={colorMode === 'dark' ? cilSun : cilMoon} size="lg" />
            </button>
          </div>
          <form className="pi-form" onSubmit={onSubmit} noValidate>
            <div className="auth-header pi-header" style={{ marginBottom: 6 }}>
              <div className="logo" aria-hidden>
                <img src="/logo.png" alt="CanViet Exchange" className="logo-img" />
              </div>
              <h1 className="pi-title">Tell us about yourself</h1>
              <p className="pi-sub">We need a few details to complete your profile.</p>
            </div>

            {error && <div className="alert error" role="alert">{error}</div>}
            {loading && <div className="loading">Loading profile…</div>}
            {!loading && (
              <>
                <section className="pi-section">
                  <label className="field-label" htmlFor="country">Country of residence</label>
                  <select id="country" className="themed" value={country} onChange={(e)=> setCountry(e.target.value)}>
                    <option value="Canada">Canada</option>
                    <option value="Vietnam">Vietnam</option>
                    <option value="USA">United States</option>
                  </select>
                </section>

                <section className="pi-section">
                  <h2>Personal details</h2>
                  <div className="grid-1">
                    <div className="field-group">
                      <label htmlFor="firstName">Full legal first and middle name(s)</label>
                      <input id="firstName" className="themed" value={firstName} onChange={(e)=> setFirstName(e.target.value)} />
                    </div>
                    <div className="field-group">
                      <label htmlFor="lastName">Full legal last name(s)</label>
                      <input id="lastName" className="themed" value={lastName} onChange={(e)=> setLastName(e.target.value)} />
                    </div>
                    <div className="field-group">
                      <label htmlFor="preferredName">Preferred name (optional) <span className="hint">ⓘ</span></label>
                      <input id="preferredName" className="themed" value={preferredName} onChange={(e)=> setPreferredName(e.target.value)} />
                    </div>
                  </div>
                </section>

                <section className="pi-section">
                  <h2>Date of birth</h2>
                  <div className="field-group">
                    <label htmlFor="dob">Date of birth</label>
                    <input
                      id="dob"
                      type="date"
                      className="themed"
                      value={dob}
                      onChange={(e)=> setDob(e.target.value)}
                      onFocus={(e) => {
                        // Call the HTMLInputElement.showPicker() when available (Chrome/Chromium based browsers)
                        try { (e.target as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* ignore */ }
                      }}
                      onClick={(e) => {
                        try { (e.target as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* ignore */ }
                      }}
                    />
                  </div>
                </section>

                <section className="pi-section">
                  <h2>Phone number</h2>
                  <div className="phone-row">
                    <select className="code themed" value={phoneCountryCode} onChange={(e)=> setPhoneCountryCode(e.target.value)}>
                      <option value="+1">+1</option>
                      <option value="+84">+84</option>
                    </select>
                    <input className="phone themed" value={phone} onChange={(e)=> setPhone(e.target.value)} placeholder="Your phone" />
                  </div>
                  {phone && <button type="button" className="link-btn" onClick={()=> alert('Change number flow TBD')}>Change phone number</button>}
                </section>

                <section className="pi-section">
                  <h2>Address</h2>
                  <div className="field-group"><label htmlFor="street">Home address</label><input id="street" className="themed" value={street} onChange={(e)=> setStreet(e.target.value)} /></div>
                  <div className="field-group"><label htmlFor="city">City</label><input id="city" className="themed" value={city} onChange={(e)=> setCity(e.target.value)} /></div>
                  <div className="field-group"><label htmlFor="postal">Postcode</label><input id="postal" className="themed" value={postalCode} onChange={(e)=> setPostalCode(e.target.value)} /></div>
                  <div className="field-group"><label htmlFor="province">Province</label>
                    <select id="province" className="themed" value={province} onChange={(e)=> setProvince(e.target.value)}>
                      <option value="">Select province</option>
                      <option value="Ontario">Ontario</option>
                      <option value="Quebec">Quebec</option>
                      <option value="Alberta">Alberta</option>
                      <option value="BC">British Columbia</option>
                    </select>
                  </div>
                </section>

                <section className="pi-section">
                  <h2>Additional information</h2>
                  <div className="field-group">
                    <label htmlFor="employment">Employment Status</label>
                    <select id="employment" className="themed" value={employmentStatus} onChange={(e)=> setEmploymentStatus(e.target.value)}>
                      <option value="">Select</option>
                      <option value="Student">Student</option>
                      <option value="Employed">Employed</option>
                      <option value="Self-employed">Self-employed</option>
                      <option value="Unemployed">Unemployed</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                </section>

                <div className="actions">
                  <button type="submit" className={`submit-btn ${saving ? 'loading' : ''}`} disabled={saving}>
                    <span className="btn-text">{saving ? 'Saving…' : 'Save changes'}</span>
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
          </div>
        </div>
        <style jsx>{`
          :global(html, body, #__next) { height: 100%; }
          .auth-container { min-height: 100vh; display: grid; place-items: center; background: radial-gradient(1200px 400px at 50% -10%, rgba(91,141,239,.12), transparent), linear-gradient(180deg, #0b1020 0%, #0e1530 100%); padding: 24px; }
          .auth-card { width: 100%; max-width: 900px; background: rgba(16,23,42,0.92); border: 1px solid #1b2440; color: #e6edf7; border-radius: 16px; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.35); position: relative; overflow: hidden; }
          .back-btn { position:absolute; top:12px; left:12px; display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; color:#a9bed3; border:1px solid #1b2440; background:#0f1730; border-radius:10px; text-decoration:none; }
          .back-btn:hover { color:#e6edf7; background:#131d3a; }
          .top-right { position:absolute; top:12px; right:12px; display:flex; align-items:center; gap:10px; }
          .lang-switch { display:inline-flex; align-items:center; gap:8px; color:#a9bed3; }
          .lang-switch a { color:#cfe0ff; text-decoration:none; }
          .lang-switch a:hover { text-decoration:underline; }
          .mode-btn { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; color:#a9bed3; border:1px solid #1b2440; background:#0f1730; border-radius:10px; }
          .mode-btn:hover { color:#e6edf7; background:#131d3a; }
          .auth-header { text-align: center; margin-bottom: 18px; }
          h2 { font-size: 14px; font-weight: 600; margin: 26px 0 14px; letter-spacing: .25px; color:#d9e7f5; }
          .pi-section { padding-bottom: 8px; }
          .pi-section + .pi-section { border-top: 1px solid #1b2440; padding-top: 20px; }
          label.field-label { display:block; font-size:12px; font-weight:600; margin-bottom:6px; letter-spacing:.5px; }
          .field-group { display:flex; flex-direction:column; margin-bottom:18px; }
          .field-group label { font-size:12px; font-weight:600; margin-bottom:6px; color:#c7d9ed; }
          .grid-1 { display:grid; grid-template-columns:1fr; gap:4px; }
          /* Date input tweaks */
          input[type="date"].themed { appearance: none; -webkit-appearance: none; }
          input[type="date"].themed::-webkit-calendar-picker-indicator { cursor: pointer; }
          .phone-row { display:flex; gap:12px; }
          .phone-row .code { width:120px; }
          .phone-row .phone { flex:1; }
          .link-btn { margin-top:10px; background:none; border:0; color:#baf3ed; font-weight:500; padding:0; cursor:pointer; text-decoration:underline; }
          .link-btn:hover { color:#e6edf7; }
          .actions { margin-top:32px; text-align:center; }
          .submit-btn { 
            display:inline-flex; align-items:center; justify-content:center; gap:10px;
            padding:12px 18px; min-width:160px;
            background: linear-gradient(135deg, #00B3A4, #06b6d4);
            color:#ffffff; border:0; border-radius:12px; cursor:pointer;
            font-weight:700; letter-spacing:.4px;
            box-shadow: 0 10px 24px rgba(0,179,164,0.25);
            transition: transform .15s ease, box-shadow .15s ease, filter .15s ease, opacity .15s ease;
          }
          .submit-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); box-shadow: 0 14px 30px rgba(0,179,164,0.35); }
          .submit-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(0,179,164,0.35), 0 10px 24px rgba(0,179,164,0.25); }
          .submit-btn:disabled { opacity:.75; cursor:not-allowed; }
          .submit-btn .btn-loader { display:none; }
          .submit-btn.loading .btn-loader { display:inline-flex; }
          .submit-btn.loading .btn-text { opacity:.9; }
          .alert.error { background:rgba(255,0,0,0.08); color:#ffb3b3; padding:14px 16px; border:1px solid rgba(255,0,0,0.25); border-radius:12px; margin-bottom:16px; }
          .loading { font-size:14px; color:#9fb3c8; }
          .themed { background:#0b1326; border:1px solid #203058; color:#f2f8ff; border-radius:12px; padding:14px 14px; font-size:14px; }
          .themed:focus { outline:none; border-color:#00B3A4; box-shadow:0 0 0 3px rgba(0,179,164,0.25); }
          select.themed { padding-right:36px; }
          .pi-header { text-align:center; }
          .pi-title { font-size:26px; margin:10px 0 4px; background: linear-gradient(90deg,#e6f7ff,#c7fff5); -webkit-background-clip:text; color:transparent; font-weight:700; letter-spacing:.5px; opacity:0; transform: translateY(6px); animation: fadeUp 520ms cubic-bezier(.21,.72,.25,1) 120ms forwards; will-change: transform, opacity; }
          .pi-sub { margin:0; font-size:14px; color:#a9bed3; opacity:0; transform: translateY(6px); animation: fadeUp 520ms cubic-bezier(.21,.72,.25,1) 220ms forwards; will-change: transform, opacity; }
          .pi-card-centered { display:flex; flex-direction:column; }
          .logo { display: inline-flex; padding: 0; border-radius: 12px; background: transparent; box-shadow: none; }
          .logo-img { width: auto; height: 165px; display: block; object-fit: contain; opacity: 0; transform: translateY(8px) scale(.96); animation: logoPop 560ms cubic-bezier(.18,.89,.32,1.28) 20ms forwards; will-change: transform, opacity; }
          @media (max-width: 992px) { /* tablets */
            .logo-img { height: 140px; }
          }
          @media (max-width: 640px) { /* phones */
            .logo-img { height: 100px; }
            /* Make date input comfortable on phones */
            input[type="date"].themed { padding: 12px 12px; font-size: 14px; }
          }
          @keyframes logoPop {
            0% { opacity: 0; transform: translateY(8px) scale(0.96); }
            60% { opacity: 1; transform: translateY(0) scale(1.02); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          /* Respect reduced-motion preferences */
          @media (prefers-reduced-motion: reduce) {
            .logo-img, .pi-title, .pi-sub { animation: none !important; opacity: 1 !important; transform: none !important; }
          }
          @media (max-width:720px){ .dob-grid{ grid-template-columns:repeat(3,1fr); } }
        `}</style>
      </>
    </RequireAuth>
  );
}