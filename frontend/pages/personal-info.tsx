import { useCallback, useEffect, useRef, useState } from 'react';
import { useColorModes } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSun, cilMoon } from '@coreui/icons';
import Head from 'next/head';
import Script from 'next/script';
import RequireAuth from '../components/RequireAuth';
import { logout } from '../lib/auth';
import { useLanguage } from '../context/LanguageContext';

interface MeResponse {
  user?: {
    id?: string; email?: string; firstName?: string; lastName?: string; 
    phone?: { countryCode?: string; phoneNumber?: string } | string; 
    role?: string; emailVerified?: boolean; createdAt?: string;
    dateOfBirth?: string; address?: { street?: string; postalCode?: string; city?: string; province?: string; country?: string }; employmentStatus?: string;
    KYCStatus?: string;
  };
}

export default function PersonalInfoPage({ googleKey }: { googleKey?: string }) {
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const { language, setLanguage, t } = useLanguage();
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
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [showChangeNumber, setShowChangeNumber] = useState(false);
  const [street, setStreet] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const surfaceError = useCallback((message: string) => {
    console.log('[surfaceError] called with:', message);
    // Clear error first, then set it to ensure useEffect triggers even if the message is the same
    setError(null);
    // Use microtask to ensure state update is processed
    Promise.resolve().then(() => {
      setError(message);
    });
    // Keep a small debug snapshot for devs (not relied upon for scrolling)
    setTimeout(() => {
      console.log('[surfaceError] error state after setError:', errorRef.current, message);
    }, 100);
  }, []);

  // When `error` changes, ensure the alert is visible and scrolled into view.
  // Using requestAnimationFrame ensures the DOM has updated before we attempt to scroll.
  useEffect(() => {
    if (!error) return;
    const raf = window.requestAnimationFrame(() => {
      try {
        if (errorRef.current) {
          // Make sure the alert can be programmatically focused for screen readers
          errorRef.current.tabIndex = -1;
          errorRef.current.focus({ preventScroll: true });
          errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (e) {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [error]);

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
          const resp = await fetch(`/api/users/me`, { credentials: 'include' });
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
        setPreferredName((u as any).preferredName || '');
        
        // Check KYC status
        setKycVerified(u.KYCStatus === 'verified');
        
        // Handle phone number
        if (u.phone && typeof u.phone === 'object' && u.phone.countryCode && u.phone.phoneNumber) {
          setPhoneCountryCode(u.phone.countryCode);
          setPhone(u.phone.phoneNumber);
        }
        
        // Load phone verification status from database
        setPhoneVerified(!!(u as any).phoneVerified);
        
        setEmploymentStatus(u.employmentStatus || '');
        const addr = u.address || {};
        setStreet(addr.street || '');
        setAddressLine2((addr as any).addressLine2 || '');
        setCity(addr.city || '');
        setPostalCode(addr.postalCode || '');
        // Normalize country to match select option values (capitalize first letter)
        const dbCountry = addr.country || 'Canada';
        const normalizedCountry = dbCountry.charAt(0).toUpperCase() + dbCountry.slice(1).toLowerCase();
        setCountry(normalizedCountry);
        // Populate province from database if available
        setProvince(addr.province || '');
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
  }, [setColorMode]);

  // Persist theme choice
  useEffect(() => {
    try { localStorage.setItem('theme.mode', colorMode || 'light'); } catch {}
  }, [colorMode]);

  // Countdown timer for OTP (UI-only, resets on page refresh)
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Autocomplete: address input ref
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const [scriptStatus, setScriptStatus] = useState<'pending'|'loaded'|'error'>('pending');

  // Initialize Google Places Autocomplete when script is loaded.
  // We avoid exposing a global callback and remove polling; use the Script onLoad handler instead.
  const initCalledRef = useRef(false);
  const retryRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);

  const initAutocompleteOnce = useCallback(() => {
    if (initCalledRef.current) return;
    const googleAny: any = (window as any).google;
    if (!googleAny || !googleAny.maps || !googleAny.maps.places) {
      // If the script failed earlier, don't retry.
      if (scriptStatus === 'error') {
        console.debug('[maps] scriptStatus=error, not retrying init');
        return;
      }
      // Retry with exponential backoff (max 5 attempts)
      const maxRetries = 5;
      if (retryRef.current >= maxRetries) {
        console.debug('[maps] init retries exhausted');
        return;
      }
      const delay = 500 * Math.pow(2, retryRef.current); // 500ms, 1s, 2s, 4s, ...
      retryRef.current += 1;
      const t = window.setTimeout(() => {
        try { initAutocompleteOnce(); } catch (e) { console.debug('[maps] retry init failed', e); }
      }, delay) as unknown as number;
      timeoutsRef.current.push(t);
      console.debug('[maps] google not available, scheduling retry', retryRef.current, 'in', delay, 'ms');
      return;
    }
    if (!addressInputRef.current) return;
    initCalledRef.current = true;
    try {
      // Determine country code for componentRestrictions
      const countryCode = country === 'Vietnam' ? 'vn' : 'ca';
      
      const autocomplete = new googleAny.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: [countryCode] }
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place) return;
        
        // For Vietnam: save full formatted address to street field
        if (country === 'Vietnam') {
          const fullAddress = place.formatted_address || '';
          if (fullAddress) setStreet(fullAddress);
          
          // Still parse components for city, province (but NOT country - user sets that via dropdown)
          const comps = place.address_components || [];
          let cityVal = '';
          let provinceVal = '';
          
          comps.forEach((c: any) => {
            const types = c.types || [];
            if (types.includes('locality') || types.includes('administrative_area_level_2')) cityVal = c.long_name || '';
            if (types.includes('administrative_area_level_1')) provinceVal = c.long_name || '';
          });
          
          if (cityVal) setCity(cityVal);
          if (provinceVal) setProvince(provinceVal);
          // Vietnam doesn't use postal codes in the same way
          setPostalCode('');
        } else {
          // For Canada: parse address components normally (but NOT country - user sets that via dropdown)
          const comps = place.address_components || [];
          let streetNumber = '';
          let route = '';
          let cityVal = '';
          let provinceVal = '';
          let postal = '';

          comps.forEach((c: any) => {
            const types = c.types || [];
            if (types.includes('street_number')) streetNumber = c.long_name || '';
            if (types.includes('route')) route = c.long_name || '';
            if (types.includes('locality')) cityVal = c.long_name || '';
            if (types.includes('administrative_area_level_1')) provinceVal = c.long_name || '';
            if (types.includes('postal_code')) postal = c.long_name || '';
          });

          const fullStreet = `${streetNumber} ${route}`.trim() || place.formatted_address || '';
          if (fullStreet) setStreet(fullStreet);
          if (cityVal) setCity(cityVal);
          if (postal) setPostalCode(postal);
          if (provinceVal) setProvince(provinceVal);
        }
      });
    } catch (err) {
      console.error('[maps] initAutocompleteOnce error', err);
    }
  }, [country]);

  useEffect(() => {
    // If Google is already loaded by the time this mounts, initialize immediately.
    if ((window as any).google?.maps?.places) {
      try { initAutocompleteOnce(); } catch (e) { console.error('[maps] init error in useEffect', e); }
    }
    // Cleanup any scheduled retries on unmount
    return () => {
      try {
        timeoutsRef.current.forEach((t) => clearTimeout(t));
        timeoutsRef.current = [];
      } catch {}
    };
  }, [initAutocompleteOnce]);

  const months: string[] = [];

  const handleChangeNumber = () => {
    setShowChangeNumber(false);
    setPhoneVerified(false);
    setPhoneOtpSent(false);
    setPhoneOtpCode('');
    setPhone('');
    setError(null);
  };

  const requestPhoneOtp = async () => {
    if (!phone || phone.length !== 10) {
      surfaceError(t('personalInfo.validation.invalidPhone10'));
      return;
    }
    
    setSendingOtp(true);
    setError(null);
      try {
      
      const fullPhone = `${phoneCountryCode}${phone}`;
      const resp = await fetch(`/api/otp/phone/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: fullPhone }),
      });
      
      const data = await resp.json();
      
      if (!resp.ok) {
        // Check if it's a phone validation error from Twilio Lookup
          if (data?.reason === 'invalid_number' || data?.reason === 'invalid_phone') {
          throw new Error(t('personalInfo.validation.existingPhone'));
        }
        // Check if it's a country restriction error
        if (data?.reason === 'unsupported_country') {
          throw new Error(t('personalInfo.validation.unsupportedPhoneCountry'));
        }
        throw new Error(data?.message || 'Failed to send verification code');
      }
      
      setPhoneOtpSent(true);
      // Start UI countdown using server-provided TTL when available
      const expires = typeof data?.expiresIn === 'number' ? Number(data.expiresIn) : 61
      setOtpCountdown(expires);
      setError(null);
    } catch (err: any) {
      surfaceError(err?.message || t('personalInfo.otp.sendFailed'));
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!phoneOtpCode || phoneOtpCode.length !== 6) {
      surfaceError(t('personalInfo.otp.enter6'));
      return;
    }
    
    setVerifyingOtp(true);
    setError(null);
      try {
      
      const fullPhone = `${phoneCountryCode}${phone}`;
      const resp = await fetch(`/api/otp/phone/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          phone: fullPhone, 
          code: phoneOtpCode
        }),
      });
      
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || 'Verification failed');
      
      // Reload user data to get the saved phone number from database
      const meResp = await fetch(`/api/users/me`, { credentials: 'include' });
      const meData: MeResponse = await meResp.json();
      if (meData.user) {
        setUser(meData.user);
        setPhoneVerified(!!(meData.user as any).phoneVerified);
        // Update phone from database
        if (meData.user.phone && typeof meData.user.phone === 'object') {
          setPhoneCountryCode(meData.user.phone.countryCode || '+1');
          setPhone(meData.user.phone.phoneNumber || '');
        }
      }
      
      setPhoneOtpSent(false);
      setPhoneOtpCode('');
      setShowChangeNumber(true);
      setError(null);
    } catch (err: any) {
      surfaceError(err?.message || t('personalInfo.otp.invalid'));
    } finally {
      setVerifyingOtp(false);
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const trimmedPreferred = preferredName.trim();
      // Validate required names
      if (!trimmedFirst || !trimmedLast) {
        surfaceError(t('personalInfo.validation.enterNames'));
        setSaving(false);
        return;
      }

      // Names: letters (including common Latin accents) and spaces only, max 30 chars
      const nameRegex = /^[A-Za-z\u00C0-\u024F\u1E00-\u1EFF\s]{1,30}$/;
      if (!nameRegex.test(trimmedFirst) || !nameRegex.test(trimmedLast)) {
        surfaceError(t('personalInfo.validation.nameFormat'));
        setSaving(false);
        return;
      }
      if (trimmedPreferred && !nameRegex.test(trimmedPreferred)) {
        surfaceError(t('personalInfo.validation.preferredNameInvalid'));
        setSaving(false);
        return;
      }

      // Build payload
      let dobIso: string | undefined = undefined;
      if (dob) {
        // Construct ISO at UTC midnight to avoid TZ drift
        const [yyyy, mm, dd] = dob.split('-').map((s)=> parseInt(s, 10));
        if (!isNaN(yyyy) && !isNaN(mm) && !isNaN(dd)) {
          dobIso = new Date(Date.UTC(yyyy, mm - 1, dd)).toISOString();
        }
      }
      if (!dobIso) {
        surfaceError(t('personalInfo.validation.provideDob'));
        setSaving(false);
        return;
      }
      // Ensure user is at least 18 years old
      try {
        const dobDate = new Date(dobIso);
        const now = new Date();
        let age = now.getUTCFullYear() - dobDate.getUTCFullYear();
        const monthDiff = now.getUTCMonth() - dobDate.getUTCMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dobDate.getUTCDate())) {
          age -= 1;
        }
        if (age < 18) {
          surfaceError(t('personalInfo.validation.mustBe18'));
          setSaving(false);
          return;
        }
      } catch (e) {
        // If parsing fails, treat as invalid DOB
        surfaceError(t('personalInfo.validation.validDob'));
        setSaving(false);
        return;
      }
      // Combine phone country code and phone number
      const fullPhone = phone ? `${phoneCountryCode}${phone}` : '';

      if (!phone || phone.length !== 10) {
        surfaceError(t('personalInfo.validation.phoneExactly10'));
        setSaving(false);
        return;
      }

      if (!phoneVerified) {
        surfaceError(t('personalInfo.validation.verifyPhoneFirst'));
        setSaving(false);
        return;
      }

      const trimmedStreet = street.trim();
      const trimmedPostal = postalCode.trim();
      const trimmedCity = city.trim();
      const trimmedProvince = province.trim();
      const trimmedCountry = country.trim();

      // For Vietnam, only street and country are required
      if (trimmedCountry === 'Vietnam') {
        if (!trimmedStreet || !trimmedCountry) {
          surfaceError(t('personalInfo.validation.addressVietnam'));
          setSaving(false);
          return;
        }
      } else {
        // For other countries (Canada), validate postal code and all fields
        if (!trimmedStreet || !trimmedPostal || !trimmedCity || !trimmedCountry) {
          surfaceError(t('personalInfo.validation.addressOther'));
          setSaving(false);
          return;
        }

        if (!trimmedProvince) {
          surfaceError(t('personalInfo.validation.selectProvince'));
          setSaving(false);
          return;
        }

        // Validate Canadian postal code format (A1A 1A1 or A1A1A1 -> 6 alphanumeric chars)
        const postalNormalized = trimmedPostal.replace(/\s+/g, '').toUpperCase();
        const postalRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;
        if (!postalRegex.test(postalNormalized) || postalNormalized.length !== 6) {
          surfaceError(t('personalInfo.validation.postalFormat'));
          setSaving(false);
          return;
        }
      }

      if (!employmentStatus) {
        surfaceError(t('personalInfo.validation.chooseEmployment'));
        setSaving(false);
        return;
      }
      
      const payload: any = {
        firstName: trimmedFirst,
        lastName: trimmedLast,
        preferredName: trimmedPreferred || undefined,
        dateOfBirth: dobIso,
        address: {
          street: trimmedStreet,
          postalCode: trimmedPostal,
          city: trimmedCity,
          province: trimmedProvince,
          country: trimmedCountry,
        },
        employmentStatus,
      };
      // Debug: log outgoing payload to help diagnose 400 errors
      try { console.debug('POST /api/users/profile payload:', payload); } catch {}
      const resp = await fetch(`/api/users/profile`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Attempt to parse JSON, fall back to raw text so we can show server error messages
      let data: any = null;
      let rawText: string | null = null;
      try {
        data = await resp.json();
      } catch (jsonErr) {
        try { rawText = await resp.text(); } catch (tErr) { rawText = null; }
      }

      if (!resp.ok || !(data && data.ok)) {
        const serverMessage = (data && data.message) ? data.message : rawText;
        console.error('POST /api/users/profile failed', { status: resp.status, serverMessage, data, rawText });
        throw new Error(serverMessage || `Failed to save profile (status ${resp.status})`);
      }
      // On success, redirect to transfers
      window.location.href = '/transfers';
    } catch (err: any) {
      setError(err?.message || t('personalInfo.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <>
        <Head>
          <title>{t('personalInfo.title')}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        </Head>
        {/* Load Google Maps JS with Places library. Key is provided server-side via getServerSideProps */}
        {googleKey ? (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleKey}&libraries=places&loading=async&v=weekly`}
            strategy="afterInteractive"
            onLoad={() => {
              console.debug('[maps] loaded afterInteractive (onLoad)');
              setScriptStatus('loaded');
              // Add small delay to ensure Google Maps is fully initialized on iOS
              setTimeout(() => {
                try { initAutocompleteOnce(); } catch (e) { console.error('[maps] init error onLoad', e); }
              }, 100);
            }}
            onError={(err) => {
              console.error('[maps] script failed to load', err);
              setScriptStatus('error');
              setError('Map failed to load. Please check your internet connection and try again.');
            }}
          />
        ) : null}
  <div className="auth-container bg-auth pt-10 pb-16">
    <div className="auth-card personal-info pi-card-centered">
          <a href="/transfers" className="back-btn page" aria-label="Back to transfers" title="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <div className="top-right" aria-label="Controls">
              <span className="ms-3" style={{ display: 'inline-flex', gap: 8 }}>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setLanguage('en'); }} 
                  style={{ 
                    textDecoration: 'none', 
                    fontWeight: language === 'en' ? 'bold' : 'normal' 
                  }}
                >
                  EN
                </a>
                <span aria-hidden>|</span>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setLanguage('vi'); }} 
                  style={{ 
                    textDecoration: 'none', 
                    fontWeight: language === 'vi' ? 'bold' : 'normal' 
                  }}
                >
                  VI
                </a>
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
            <div className="auth-header pi-header">
              <div className="logo" aria-hidden>
                <img src="/logo.png" alt="CanViet Exchange" className="logo-img" />
              </div>
              <h1 className="pi-title">{t('personalInfo.title')}</h1>
              <p className="pi-sub">{t('personalInfo.subtitle')}</p>
            </div>

            <div
              className={`alert alert-danger${error ? ' show' : ''}`}
              role="alert"
              ref={errorRef}
              tabIndex={-1}
              aria-live="assertive"
            >
              <span className="alert-content">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="alert-icon" aria-hidden>
                  <circle cx="12" cy="12" r="10" stroke="#e57373" strokeWidth="2" fill="#ffcdd2" />
                  <path d="M12 8v4m0 4h.01" stroke="#b71c1c" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {error}
              </span>
            </div>
            {/* (debug UI removed) */}
            {scriptStatus === 'error' && (
              <div className="alert alert-danger" role="alert">
                Map failed to load. Please check that your Google Maps API key allows requests from <code>http://localhost:3000/*</code> (or your dev origin). See your <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>.
              </div>
            )}
            {loading && <div className="loading">Loading profile…</div>}
            {!loading && (
              <>

                <section className="pi-section">
                  <h2>{t('personalInfo.personalDetailsHeading')}</h2>
                  <div className="grid-1">
                    <div className="field-group">
                      <label htmlFor="firstName">
                        {t('personalInfo.firstNameLabel')}
                        {kycVerified && (
                          <span style={{ 
                            marginLeft: '8px', 
                            padding: '2px 8px', 
                            backgroundColor: '#28a745', 
                            color: 'white', 
                            borderRadius: '4px', 
                            fontSize: '12px', 
                            fontWeight: 'bold' 
                          }}>
                            ✓
                          </span>
                        )}
                      </label>
                      <input 
                        id="firstName" 
                        className="themed" 
                        value={firstName} 
                        onChange={(e)=> {
                          // Allow only letters and spaces (Unicode letters), enforce maxlength 30
                          try {
                            const sanitized = (e.target.value || '').replace(/[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF\s]/g, '').slice(0,30);
                            setFirstName(sanitized);
                          } catch {
                            // Fallback for environments without Unicode regex support
                            const sanitized = (e.target.value || '').replace(/[^A-Za-z\s]/g, '').slice(0,30);
                            setFirstName(sanitized);
                          }
                        }} 
                        disabled={kycVerified}
                        required 
                        maxLength={30}
                      />

                    </div>
                    <div className="field-group">
                      <label htmlFor="lastName">
                        {t('personalInfo.lastNameLabel')}
                        {kycVerified && (
                          <span style={{ 
                            marginLeft: '8px', 
                            padding: '2px 8px', 
                            backgroundColor: '#28a745', 
                            color: 'white', 
                            borderRadius: '4px', 
                            fontSize: '12px', 
                            fontWeight: 'bold' 
                          }}>
                            ✓
                          </span>
                        )}
                      </label>
                      <input 
                        id="lastName" 
                        className="themed" 
                        value={lastName} 
                        onChange={(e)=> {
                          try {
                            const sanitized = (e.target.value || '').replace(/[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF\s]/g, '').slice(0,30);
                            setLastName(sanitized);
                          } catch {
                            const sanitized = (e.target.value || '').replace(/[^A-Za-z\s]/g, '').slice(0,30);
                            setLastName(sanitized);
                          }
                        }} 
                        disabled={kycVerified}
                        required 
                        maxLength={30}
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="preferredName">Preferred name (optional) <span className="hint">ⓘ</span></label>
                      <input id="preferredName" className="themed" value={preferredName} onChange={(e)=> {
                        try {
                          const sanitized = (e.target.value || '').replace(/[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF\s]/g, '').slice(0,30);
                          setPreferredName(sanitized);
                        } catch {
                          const sanitized = (e.target.value || '').replace(/[^A-Za-z\s]/g, '').slice(0,30);
                          setPreferredName(sanitized);
                        }
                      }} maxLength={30} />
                    </div>
                  </div>
                </section>

                <section className="pi-section">
                  <h2>Date of birth</h2>
                  <div className="field-group">
                    <label htmlFor="dob">
                      Date of birth
                      {kycVerified && (
                        <span style={{ 
                          marginLeft: '8px', 
                          padding: '2px 8px', 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          borderRadius: '4px', 
                          fontSize: '12px', 
                          fontWeight: 'bold' 
                        }}>
                          ✓
                        </span>
                      )}
                    </label>
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
                      disabled={kycVerified}
                      required
                    />

                  </div>
                </section>

                <section className="pi-section">
                  <h2>Phone number</h2>
                  <div className="phone-row">
                    <select 
                      className="code themed" 
                      value={phoneCountryCode} 
                      onChange={(e)=> setPhoneCountryCode(e.target.value)}
                      disabled={phoneVerified}
                    >
                      <option value="+1">+1</option>
                    </select>
                    <input 
                      className="phone themed" 
                      type="tel"
                      value={phone} 
                      onChange={(e)=> {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 10) {
                          setPhone(value);
                          // Reset verification if phone changes
                          if (phoneVerified || phoneOtpSent) {
                            setPhoneVerified(false);
                            setPhoneOtpSent(false);
                            setPhoneOtpCode('');
                          }
                        }
                      }} 
                      placeholder="Your phone" 
                      maxLength={10}
                      pattern="[0-9]{10}"
                      required
                      disabled={phoneVerified}
                    />
                     {phoneVerified && (
                    <>
                      <div className="phone-verified-box">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Phone number verified
                      </div>
                    
                    </>
                  )}
                  </div>

                  {phoneVerified && (
                    <div className="field-group no-mt">
                      <button type="button" className="link-btn" onClick={handleChangeNumber}>
                        Change phone number
                      </button>
                    </div>
                  )}
                  
                  {!phoneVerified && !phoneOtpSent && (
                    <button 
                      type="button" 
                      className="submit-btn submit-btn--accent mt-12" 
                      onClick={requestPhoneOtp}
                      disabled={!phone || phone.length !== 10 || otpCountdown > 0 || sendingOtp}
                    >
                      <span className="btn-text">
                        {sendingOtp ? 'Sending...' : otpCountdown > 0 ? `Wait ${otpCountdown}s` : 'Send verification code'}
                      </span>
                      {sendingOtp && (
                        <div className="btn-loader" aria-hidden>
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                            <path d="M16 9a7 7 0 01-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 9 9;360 9 9" repeatCount="indefinite" />
                            </path>
                          </svg>
                        </div>
                      )}
                    </button>
                  )}
                  
                  {phoneOtpSent && !phoneVerified && (
                    <>
                      <div className="field-group mt-12">
                        <label htmlFor="phoneOtpCode">Verification code</label>
                        <input
                          id="phoneOtpCode"
                          className="themed"
                          placeholder="Enter 6-digit code"
                          value={phoneOtpCode}
                          onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ''))}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                        />
                      </div>
                      
                      <div className="otp-actions">
                        <button 
                          type="button" 
                          className="submit-btn submit-btn--accent flex-1" 
                          onClick={verifyPhoneOtp}
                          disabled={phoneOtpCode.length !== 6 || verifyingOtp}
                        >
                          <span className="btn-text">
                            {verifyingOtp ? 'Verifying...' : 'Verify code'}
                          </span>
                          {verifyingOtp && (
                            <div className="btn-loader" aria-hidden>
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                                <path d="M16 9a7 7 0 01-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 9 9;360 9 9" repeatCount="indefinite" />
                                </path>
                              </svg>
                            </div>
                          )}
                        </button>
                        <button 
                          type="button" 
                          className="submit-btn submit-btn--secondary flex-1" 
                          onClick={requestPhoneOtp}
                          disabled={otpCountdown > 0 || sendingOtp}
                        >
                          {otpCountdown > 0 ? `Resend (${otpCountdown}s)` : 'Resend code'}
                        </button>
                      </div>
                    </>
                  )}
                  
                 
                </section>

                <section className="pi-section">
                  <label className="field-label" htmlFor="country">Country of residence</label>
                  <select id="country" className="themed" value={country} onChange={(e)=> {
                    const newCountry = e.target.value;
                    setCountry(newCountry);
                    
                    // Only reset autocomplete if user selects an actual country (not "Select")
                    if (newCountry !== 'Select') {
                      // Reset autocomplete when country changes
                      initCalledRef.current = false;
                      setStreet('');
                      setCity('');
                      setPostalCode('');
                      setProvince('');
                      // Reinitialize autocomplete with new country
                      setTimeout(() => {
                        try { initAutocompleteOnce(); } catch (err) { console.error('[maps] reinit error', err); }
                      }, 100);
                    }
                  }} required>
                    <option value="Select">Select</option>
                    <option value="Canada">Canada</option>
                    <option value="Vietnam">Vietnam</option>
                  </select>
                </section>

                <section className="pi-section">
                  <h2>Address</h2>
                  <div className="field-group"><label htmlFor="street">Home address</label><input id="street" ref={addressInputRef} placeholder="Start typing your address" className="themed" value={street} onChange={(e)=> setStreet(e.target.value)} required /></div>
                  <div className="field-group">
                    <label htmlFor="addressLine2">Address Line 2</label>
                    <input
                      id="addressLine2"
                      placeholder="Apt, suite, unit, building, floor (optional)"
                      className="themed"
                      value={addressLine2}
                      onChange={(e)=> setAddressLine2(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="city">City</label>
                    <input id="city" className="themed" value={city} onChange={(e)=> setCity(e.target.value)} required={country !== 'Vietnam'} disabled />
                  </div>
                  <div className="field-group">
                    <label htmlFor="postal">Postcode</label>
                    <input
                      id="postal"
                      className="themed"
                      value={postalCode}
                      onChange={(e)=> setPostalCode(e.target.value)}
                      required={country !== 'Vietnam'}
                      disabled
                      pattern={country !== 'Vietnam' ? "[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d" : undefined}
                      title={country !== 'Vietnam' ? "Postal code format: A1A 1A1 (letters and digits)" : undefined}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="province">Province / State</label>
                    <input id="province" className="themed" value={province} onChange={(e)=> setProvince(e.target.value)} required={country !== 'Vietnam'} disabled />
                  </div>

                </section>

                <section className="pi-section">
                  <h2>{t('personalInfo.additionalInfo')}</h2>
                  <div className="field-group">
                    <label htmlFor="employment">{t('personalInfo.employmentStatusLabel')}</label>
                    <select id="employment" className="themed" value={employmentStatus} onChange={(e)=> setEmploymentStatus(e.target.value)} required>
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
                  <button type="submit" className={`submit-btn submit-btn--accent-gradient ${saving ? 'loading' : ''}`} disabled={saving}>
                    <span className="btn-text">{saving ? t('personalInfo.saving') : t('personalInfo.saveChanges')}</span>
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
      </>
    </RequireAuth>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      googleKey: process.env.GOOGLE_MAP_API_KEY || null,
    },
  };
}