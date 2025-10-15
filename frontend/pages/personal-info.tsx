import { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse['user'] | null>(null);
  // Form state (prefill with user once loaded)
  const [country, setCountry] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
        // DOB split
        if (u.dateOfBirth) {
          const d = new Date(u.dateOfBirth);
            setDobDay(String(d.getUTCDate()).padStart(2,'0'));
            setDobMonth(String(d.getUTCMonth()+1));
            setDobYear(String(d.getUTCFullYear()));
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const months = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Currently just local UI; backend update endpoint not defined yet.
    setSaving(true);
    setTimeout(()=> setSaving(false), 800);
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
                  <div className="dob-grid">
                    <div className="field-group">
                      <label htmlFor="dobDay">Day</label>
                      <input id="dobDay" className="themed" inputMode="numeric" maxLength={2} value={dobDay} onChange={(e)=> setDobDay(e.target.value.replace(/[^0-9]/g,''))} />
                    </div>
                    <div className="field-group">
                      <label htmlFor="dobMonth">Month</label>
                      <select id="dobMonth" className="themed" value={dobMonth} onChange={(e)=> setDobMonth(e.target.value)}>
                        <option value="" disabled>Select month</option>
                        {months.map((m,i)=> <option key={m} value={String(i+1)}>{m}</option>)}
                      </select>
                    </div>
                    <div className="field-group">
                      <label htmlFor="dobYear">Year</label>
                      <input id="dobYear" className="themed" inputMode="numeric" maxLength={4} value={dobYear} onChange={(e)=> setDobYear(e.target.value.replace(/[^0-9]/g,''))} />
                    </div>
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
          .auth-header { text-align: center; margin-bottom: 18px; }
          h2 { font-size: 14px; font-weight: 600; margin: 26px 0 14px; letter-spacing: .25px; color:#d9e7f5; }
          .pi-section { padding-bottom: 8px; }
          .pi-section + .pi-section { border-top: 1px solid #1b2440; padding-top: 20px; }
          label.field-label { display:block; font-size:12px; font-weight:600; margin-bottom:6px; letter-spacing:.5px; }
          .field-group { display:flex; flex-direction:column; margin-bottom:18px; }
          .field-group label { font-size:12px; font-weight:600; margin-bottom:6px; color:#c7d9ed; }
          .grid-1 { display:grid; grid-template-columns:1fr; gap:4px; }
          .dob-grid { display:grid; grid-template-columns: 90px 1fr 120px; gap:16px; }
          .phone-row { display:flex; gap:12px; }
          .phone-row .code { width:120px; }
          .phone-row .phone { flex:1; }
          .link-btn { margin-top:10px; background:none; border:0; color:#baf3ed; font-weight:500; padding:0; cursor:pointer; text-decoration:underline; }
          .link-btn:hover { color:#e6edf7; }
          .actions { margin-top:32px; text-align:right; }
          .alert.error { background:rgba(255,0,0,0.08); color:#ffb3b3; padding:14px 16px; border:1px solid rgba(255,0,0,0.25); border-radius:12px; margin-bottom:16px; }
          .loading { font-size:14px; color:#9fb3c8; }
          .themed { background:#0b1326; border:1px solid #203058; color:#f2f8ff; border-radius:12px; padding:14px 14px; font-size:14px; }
          .themed:focus { outline:none; border-color:#00B3A4; box-shadow:0 0 0 3px rgba(0,179,164,0.25); }
          select.themed { padding-right:36px; }
          .pi-header { text-align:center; }
          .pi-title { font-size:26px; margin:10px 0 4px; background: linear-gradient(90deg,#e6f7ff,#c7fff5); -webkit-background-clip:text; color:transparent; font-weight:700; letter-spacing:.5px; }
          .pi-sub { margin:0; font-size:14px; color:#a9bed3; }
          .pi-card-centered { display:flex; flex-direction:column; }
          .logo { display: inline-flex; padding: 0; border-radius: 12px; background: transparent; box-shadow: none; }
          .logo-img { width: auto; height: 165px; display: block; object-fit: contain; }
          @media (max-width: 992px) { /* tablets */
            .logo-img { height: 140px; }
          }
          @media (max-width: 640px) { /* phones */
            .logo-img { height: 120px; }
          }
          @media (max-width:720px){ .dob-grid{ grid-template-columns:repeat(3,1fr); } }
        `}</style>
      </>
    </RequireAuth>
  );
}