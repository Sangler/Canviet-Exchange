import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function Home() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  // Minimal local state to render the exchange form on the homepage
  const [rate, setRate] = useState<number | null>(null);
  const [prevRate, setPrevRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState<boolean>(true);
  const [rateError, setRateError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const rateTimer = useRef<NodeJS.Timeout | null>(null);
  const [amountFrom, setAmountFrom] = useState<string>('');
  const [amountTo, setAmountTo] = useState<string>('');
  const [showRateModal, setShowRateModal] = useState(false);
  const lastComputedToRef = useRef<number>(NaN);
  const lastComputedFromRef = useRef<number>(NaN);

  // Fetch live CAD->VND rate from backend endpoint
  async function fetchRate(manual = false) {
    try {
      if (manual) setRateLoading(true);
      setRateError(null);
      // Prefer direct ExchangeRate-API fetch; fallback to backend endpoint if needed
      const apiKey = process.env.EXCHANGE_API_KEY || '';
      let nextRate: number | null = null;
      let fetchedAt: string | null = null;

      try {
        // Single source of truth: call backend endpoint that already applies the +200 VND margin.
        const resp = await fetch('/api/fx/cad-vnd');
        if (!resp.ok) throw new Error('Backend FX HTTP error');
        const json = await resp.json();
        if (!json?.ok || typeof json.rate !== 'number') throw new Error('Backend FX invalid payload');
        nextRate = json.rate;
        fetchedAt = json.fetchedAt || null;
      } catch (err) {
        // Surface the error up so outer catch() sets the user-visible error state
        throw err;
      }

      if (typeof nextRate === 'number') {
        setPrevRate(rate);
        setRate(nextRate);
        setLastUpdated(fetchedAt || new Date().toISOString());
      } else {
        throw new Error('No rate returned');
      }
    } catch (e) {
      const msg = (e as Error).message || 'Unknown error';
      console.warn('Rate fetch error', msg);
      setRateError(msg);
    } finally {
      setRateLoading(false);
    }
  }

  useEffect(() => {
    fetchRate();
    rateTimer.current = setInterval(() => fetchRate(false), 60_000);
    return () => { if (rateTimer.current) clearInterval(rateTimer.current); };
  }, []);

  const [activeInput, setActiveInput] = useState<'from' | 'to'>('from');
  const isUpdatingRef = useRef(false);

  function formatCurrencyInput(e: React.ChangeEvent<HTMLInputElement>, type: 'from' | 'to') {
    const raw = e.target.value || '';
    if (type === 'from') {
      const normalized = raw.replace(/,/g, '.');
      const cleaned = normalized.replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1');
      const parts = cleaned.split('.');
      parts[0] = parts[0].replace(/^0+/, '') || '0';
      if (parts[0].length > 5) parts[0] = parts[0].slice(0, 5);
      if (parts[1]) parts[1] = parts[1].slice(0, 2);
      const limited = parts.join('.');
      const display = limited === '0' ? '' : limited;
      setActiveInput('from');
      setAmountFrom(display);
    } else if (type === 'to') {
      // VND: integers only, format with thousand separators for display
      const cleaned = raw.replace(/[^0-9]/g, '');
      // strip leading zeros, but allow empty input
      const normalized = cleaned.replace(/^0+/, '') || '0';
      // cap length to 9 digits (maximum VNĐ digits allowed)
      const capped = normalized.slice(0, 9);
      const display = capped === '0' ? '' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(capped));
      setActiveInput('to');
      setAmountTo(display);
    }
  }

  // Effective rate used for calculations = base backend rate (includes any backend margin)
  const effectiveRate = useMemo(() => (typeof rate === 'number' ? Number(rate) : null), [rate]);

  // Keep amountTo in sync when user edits amountFrom (CAD -> VND)
  useEffect(() => {
    if (activeInput !== 'from' || isUpdatingRef.current) return;
    const val = parseFloat((amountFrom || '').toString().replace(/,/g, ''));
    if (!isNaN(val) && effectiveRate && effectiveRate > 0) {
      const rawNext = val * effectiveRate;
      const nextNum = Math.round(rawNext);
      if (lastComputedToRef.current !== nextNum) {
        isUpdatingRef.current = true;
        lastComputedToRef.current = nextNum;
        setAmountTo(new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(rawNext));
        setTimeout(() => { isUpdatingRef.current = false; }, 0);
      }
    } else {
      lastComputedToRef.current = NaN;
      setAmountTo('');
    }
  }, [amountFrom, effectiveRate, activeInput]);

  // Keep amountFrom in sync when user edits amountTo (VND -> CAD)
  useEffect(() => {
    if (activeInput !== 'to' || isUpdatingRef.current) return;
    const val = parseFloat((amountTo || '').toString().replace(/,/g, ''));
    if (!isNaN(val) && effectiveRate && effectiveRate > 0) {
      const rawNext = val / effectiveRate;
      const nextNum = Math.round(rawNext * 100) / 100; // Round to 2 decimals
      if (lastComputedFromRef.current !== nextNum) {
        isUpdatingRef.current = true;
        lastComputedFromRef.current = nextNum;
        setAmountFrom(nextNum.toFixed(2));
        setTimeout(() => { isUpdatingRef.current = false; }, 0);
      }
    } else {
      lastComputedFromRef.current = NaN;
      setAmountFrom('');
    }
  }, [amountTo, effectiveRate, activeInput]);

  // Redirect logged-in users to /transfers
  useEffect(() => {
    if (!loading && user) {
      router.replace('/transfers');
    }
  }, [user, loading, router]);

  // Hero video: two-source playback with React-controlled controls
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Detect mobile devices for responsive video serving
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Serve compressed mobile versions when available. Use public folder absolute paths.
  const heroSources = useMemo(() => {
    const list = isMobile
      ? [
          '/mainpage/CanViet_Exchange_Video_Banner_Extension.mp4',
          '/mainpage/Banner_Video_Remake_With_Better_Soundtrack.mp4'
        ]
      : [
          '/mainpage/Banner_Video_Remake_With_Better_Soundtrack.mp4',
          '/mainpage/CanViet_Exchange_Video_Banner_Extension.mp4'

        ];
    return list.filter(Boolean);
  }, [isMobile]);
  const [heroSourceIndex, setHeroSourceIndex] = useState(0);
  const [heroMuted, setHeroMuted] = useState(true);
  const [heroPaused, setHeroPaused] = useState(false);

  // Attach ended listener once to advance source index
  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    const onEnded = () => {
      const len = Math.max(1, heroSources.length);
      setHeroSourceIndex((idx) => (idx + 1) % len);
    };
    v.addEventListener('ended', onEnded);
    return () => v.removeEventListener('ended', onEnded);
  }, [heroSources.length]);

  // Sync play/pause state with the video element
  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    const onPlay = () => setHeroPaused(false);
    const onPause = () => setHeroPaused(true);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, []);

  // When source index changes, load and autoplay the new source
  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    const src = heroSources[heroSourceIndex] || '';
    v.pause();
    v.src = src;
    try { v.load(); } catch (e) {}
    v.play().catch(() => {});
    setHeroPaused(false);
  }, [heroSourceIndex, heroSources]);

  // Mirror muted state to the element
  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    v.muted = !!heroMuted;
  }, [heroMuted]);

  const togglePlay = () => {
    const v = heroVideoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setHeroPaused(false);
    } else {
      v.pause();
      setHeroPaused(true);
    }
  };

  const toggleMute = () => setHeroMuted((m) => !m);

  // Show loading state while checking auth
  if (loading) {
    return null;
  }
  // If user is logged in, don't render (redirect happening)
  if (user) {
    return null;
  }

  // Guest home page content
  const rateStr = effectiveRate ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(effectiveRate) : null;
  return (
    <div>
      <div className="wrapper d-flex flex-column min-vh-100 align-centre">
        <AppHeader />


        <div className="body flex-grow-1 home-full-bleed centered">
          <div className="home-container-fullwidth">
            <div className="row g-0">
              <div className="col-12 w-100 home-col-no-padding">
                
                {/* Testimonials / Reviews Section (Trustpilot link only) */}
                <section className="testimonials-section">
                  <div className="container">
                    <div className="text-center">
                      <div className="logo">
                        <img src="/logo.png" alt="CanViet Exchange" className="logo-img" />
                      </div>
                      <h2 className="section-title">{t('home.hero.title')}</h2>
                      <div className="trust-badge">
                        <p className="mb-0">
                          <a
                            href="https://www.trustpilot.com/review/canvietexchange.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="trustpilot-link"
                          >
                            See our reviews on <img src="/flags/Trustpilot_Logo.svg" alt="Trustpilot" className="trustpilot-icon" /> Trustpilot!
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
                
                 <div className="main mb-4 border-0t">
                  <div className="main text-center py-4">
                      <h1 className="display-4 mb-3">
                        {rate ? `1 CAD = ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate)} VND` : t('home.exchangeFallback')}
                      </h1>

                  </div>
                </div>

                    <div className="hero-content">
                    </div>
                <div className="hero-fullwidth-wrapper">
                  <div className="main-body hero-section text-center">
                    <div className="hero-media">
                      <div className="hero-video-frame">
                        {/* Controlled video that plays two sources consecutively */}
                        {/* Sources: 1) CanViet_Exchange_Video_Banner_Extension.mp4 2) Banner_Video_Remake_With_Better_Soundtrack.mp4 */}
                        <video
                          ref={(el) => { heroVideoRef.current = el; }}
                          className="hero-video"
                          autoPlay
                          muted={heroMuted}
                          playsInline
                          controls={false}
                        >
                          <source src={heroSources[0]} type="video/mp4" />
                        </video>

                        {/* Buttons: Pause/Play and Mute/Unmute */}
                        <div className="hero-video-controls">
                          <button
                            aria-label="Pause or play video"
                            title="Pause / Play"
                            className="btn btn-sm hero-video-btn"
                            onClick={togglePlay}
                          >
                            {heroPaused ? '▶️' : '⏸'}
                          </button>

                          <button
                            aria-label="Mute or unmute video"
                            title="Mute / Unmute"
                            className="btn btn-sm hero-video-btn"
                            onClick={toggleMute}
                          >
                            {heroMuted ? '🔇' : '🔊'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hero-card">

                  <section className="main mb-4">
                    <div className="main-body">
                      <div className="row align-items-center">
                        <div className="col-md-6 mb-3 mb-md-0">
                          <h1 className="h3">{t('home.calculator.title')}</h1>
                          <p className="text-medium-emphasis">{t('home.hero.subtitle')}</p>
                          <hr />

                          <div className="d-flex align-items-center gap-3">
                            <div className="fs-1">💰</div>
                            <div>
                              <strong>{t('home.features.bestRates')}</strong>
                              <div className="small text-medium-emphasis">{t('home.calculator.rateUpdated')}</div>
                            </div>
                          </div>
                          <img src="/mainpage/hero-section.jpg" alt="Hero section" className="img-fluid home-hero-img mt-3" />
                        </div>

                        <div className="col-md-6">


                          <div>
                            <div className="form-group">
                                
                                  <div className="top-block">
                                    {rate && (
                                      <div className="form-group mb-2">
                                        <div className="label-inline-info">
                                          1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate)} VND <strong>{t('home.bestRateLabel')}</strong>
                                          <button
                                            type="button"
                                            aria-label="Rate details"
                                            title="Get a quote!"
                                            onClick={() => setShowRateModal(true)}
                                            className="rate-info-btn ms-2"
                                          >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                              <circle cx="12" cy="12" r="10"></circle>
                                              <line x1="12" y1="16" x2="12" y2="12"></line>
                                              <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                            </svg>
                                          </button>
                                        </div>
                                        {amountFrom && parseFloat(amountFrom) > 0 && effectiveRate && (
                                          <div className="label-inline-info mt-1">{t('home.calculator.yourRate')}: 1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(effectiveRate)} VND</div>
                                        )}
                                      </div>
                                    )}
                                    {/* Top input: YOU SEND with CAD input */}
                                    <div className="form-group mt-3">
                                      <div className="currency-input" role="group" aria-label="You send amount in CAD">
                                        <input
                                          type="number"
                                          id="amountFrom"
                                          name="amountFrom"
                                          placeholder={t('home.placeholders.youSend')}
                                          min={20}
                                          max={9999}
                                          step="0.01"
                                          value={amountFrom}
                                          onChange={(e) => formatCurrencyInput(e, 'from')}
                                          inputMode="decimal"
                                          aria-label={t('home.calculator.youSend')}
                                        />
                                        <div className="currency-suffix" aria-hidden="true">
                                          <img className="flag" src="/flags/Flag_of_Canada.png" alt="" />
                                          <span className="code">CAD</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bottom-block">
                                    <div className="form-group">
                                      <div className="currency-input" role="group" aria-label="They receive amount in VND">
                                        <input
                                          type="text"
                                          id="amountTo"
                                          name="amountTo"
                                          placeholder={t('home.placeholders.theyReceive')}
                                          value={amountTo}
                                          onChange={(e) => formatCurrencyInput(e, 'to')}
                                          inputMode="numeric"
                                          pattern="[0-9,]*"
                                          aria-label={t('home.calculator.recipientGets')}
                                        />
                                        <div className="currency-suffix" aria-hidden="true">
                                          <img className="flag" src="/flags/Flag_of_Vietnam.png" alt="" />
                                          <span className="code">VND</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="d-flex gap-3 justify-content-center flex-wrap w-100">
                                  <a href="/register" className="btn btn-primary btn-lg">
                                    {t('home.hero.getStarted')}
                                  </a>
                                  {/* <a href="/login" className="btn btn-outline-primary btn-lg">
                                    {t('auth.signIn')}
                                  </a> */}
                              </div>
                                {/* Payment Methods Display */}
                                <div className="payment-methods-preview mt-4">
                                  <div className="text-center mb-3">
                                    <strong className="d-block mb-2">{t('home.paymentMethodsLabel')}</strong>
                                    <div className="payment-icons d-flex justify-content-center gap-3 flex-wrap">
                                      <div className="payment-icon" title="Interac e-Transfer">
                                        <div>
                                          <img src="/bank-icons/interac-etransfer.jpeg" alt="Interac e-Transfer" width="40" height="40" className="interac-icon-rounded" />
                                        </div>
                                        <span className="small">Interac</span>
                                      </div>
                                      <div className="payment-icon" title="Credit Card">
                                        <div>
                                          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                            <rect width="40" height="40" rx="8" fill="#4A90E2"/>
                                            <rect x="8" y="12" width="24" height="16" rx="2" fill="#fff"/>
                                            <rect x="8" y="15" width="24" height="3" fill="#4A90E2"/>
                                          </svg>
                                        </div>
                                        <span className="small">{t('home.payment.card')}</span>
                                      </div>
                                      <div className="payment-icon" title="Bank Transfer">
                                        <div>
                                          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                            <rect width="40" height="40" rx="8" fill="#34C759"/>
                                            <g transform="translate(7, 8)">
                                              <path d="M13 2 L1 8 L25 8 Z" fill="#fff" stroke="#fff" strokeWidth="0.5"/>
                                              <rect x="1" y="8" width="24" height="1" fill="#fff"/>
                                              <rect x="3" y="10" width="3" height="10" fill="#fff" rx="0.5"/>
                                              <rect x="8" y="10" width="3" height="10" fill="#fff" rx="0.5"/>
                                              <rect x="13" y="10" width="3" height="10" fill="#fff" rx="0.5"/>
                                              <rect x="18" y="10" width="3" height="10" fill="#fff" rx="0.5"/>
                                              <rect x="1" y="20" width="24" height="2" fill="#fff" rx="0.5"/>
                                              <circle cx="13" cy="4.5" r="0.8" fill="#34C759"/>
                                            </g>
                                          </svg>
                                        </div>
                                        <span className="small">{t('home.payment.bank')}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="fee-mini" role="note">
                                  {t('home.feeLabel')} <strong>$1.50</strong> CAD
                                </div>

                          <p className="main-text">{t('home.mainText')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  </section>
                </div>

                {/* Vietnamese Receiving Methods Section */}
                <section className="receiving-methods-section mb-5">
                  <div className="container">
                    <div className="text-center mb-4">
                      <h2 className="section-title">{t('home.receiving.title')}</h2>
                      <p className="text-medium-emphasis">{t('home.receiving.subtitle')}</p>
                    </div>
                    <div className="row g-4">
                      <div className="col-6 col-md-3">
                        <div className="receiving-method-card">
                          <div className="method-icon bank-icon">
                            <div>
                              <svg width="50" height="50" viewBox="0 0 50 50" fill="currentColor">
                                <path d="M25 8L5 18v3h40v-3L25 8zM8 24v14h5V24H8zm9 0v14h5V24h-5zm9 0v14h5V24h-5zm9 0v14h5V24h-5zM5 41v3h40v-3H5z"/>
                              </svg>
                            </div>
                          </div>
                          <strong className="d-block mt-2">{t('home.receiving.bankTransfer')}</strong>
                          <p className="small text-muted mb-0">{t('home.receiving.bankList')}</p>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="receiving-method-card">
                          <div className="method-icon momo-icon">
                            <div>
                              <svg width="50" height="50" viewBox="0 0 50 50">
                                <circle cx="25" cy="25" r="22" fill="#A50064"/>
                                <text x="25" y="32" fontSize="20" fill="#fff" textAnchor="middle" fontWeight="bold">M</text>
                              </svg>
                            </div>
                          </div>
                          <strong className="d-block mt-2">{t('home.receiving.momo')}</strong>
                          <p className="small text-muted mb-0">{t('home.receiving.momoDesc')}</p>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="receiving-method-card">
                          <div className="method-icon zalopay-icon">
                            <div>
                              <svg width="50" height="50" viewBox="0 0 50 50">
                                <circle cx="25" cy="25" r="22" fill="#008FE5"/>
                                <text x="25" y="32" fontSize="18" fill="#fff" textAnchor="middle" fontWeight="bold">Z</text>
                              </svg>
                            </div>
                          </div>
                          <strong className="d-block mt-2">{t('home.receiving.zalopay')}</strong>
                          <p className="small text-muted mb-0">{t('home.receiving.zalopayDesc')}</p>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="receiving-method-card">
                          <div className="method-icon cash-icon">
                            <div>
                              <svg width="50" height="50" viewBox="0 0 50 50" fill="currentColor">
                                <rect x="5" y="15" width="40" height="20" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                                <circle cx="25" cy="25" r="5"/>
                                <path d="M10 20h5M35 20h5M10 30h5M35 30h5"/>
                              </svg>
                            </div>
                          </div>
                          <strong className="d-block mt-2">{t('home.receiving.cashPickup')}</strong>
                          <p className="small text-muted mb-0">{t('home.receiving.cashPickupDesc')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Why choose us */}
                <div className="main mt-4">
                  <div className="main-header">
                    <h4 className="mb-0 text-center">{t('home.why.title')}</h4>
                  </div>
                  <div className="main-body">
                    <div className="row">
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">1️⃣</div>
                        <h6>{t('home.why.bestRate')}</h6>
                        <p className="text-medium-emphasis small">{t('home.why.bestRateDesc')}</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">2️⃣</div>
                        <h6>{t('home.why.lowestFee')}</h6>
                        <p className="text-medium-emphasis small">{t('home.why.lowestFeeDesc')}</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">3️⃣</div>
                        <h6>{t('home.why.guaranteed')}</h6>
                        <p className="text-medium-emphasis small">{t('home.why.guaranteedDesc')}</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">4️⃣</div>
                        <h6>{t('home.why.track')}</h6>
                        <p className="text-medium-emphasis small">{t('home.why.trackDesc')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Section - Dynamic Two Column Layout */}
                <section className="referral-section mt-5 mb-5">
                  <div className="container">
                    <div className="referral-card">
                      <div className="row align-items-center g-4">
                        <div className="col-md-6 mb-3 mb-md-0">
                          <div className="referral-image-wrapper">
                            <img 
                              src="/mainpage/referal-pic.jpg" 
                              alt="Refer a friend" 
                              className="img-fluid rounded-4 referral-img"
                            />
                            <div className="referral-badge">
                              <span className="badge-icon">🎁</span>
                              <span className="badge-text">Earn Together</span>

                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="referral-content">
                            <div className="referral-tag mb-3">
                              <span>💝 {t('home.referralSection.specialOfferTag')}</span>
                            </div>
                            <h2 className="referral-title mb-3">{t('home.referralSection.title')}</h2>
                            <p className="referral-description mb-4">{t('home.referralSection.description')}</p>
                            <div className="referral-benefits mb-4">
                              <div className="benefit-item">
                                <div className="benefit-icon">✨</div>
                                <div>
                                  <strong>{t('home.referralSection.instantBonus')}</strong>
                                  <p className="mb-0 small">{t('home.referralSection.instantBonusDesc')}</p>
                                </div>
                              </div>
                              <div className="benefit-item">
                                <div className="benefit-icon">🚀</div>
                                <div>
                                  <strong>{t('home.referralSection.unlimitedReferrals')}</strong>
                                  <p className="mb-0 small">{t('home.referralSection.unlimitedReferralsDesc')}</p>
                                </div>
                              </div>
                            </div>
                            <a href="/referral" className="btn btn-primary btn-lg referral-btn">
                              {t('home.referralSection.cta')}
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="ms-2">
                                <path d="M10 0l10 10-10 10-1.5-1.5L15.2 11H0V9h15.2L8.5 1.5z"/>
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
        {showRateModal && (
          <div className="rate-modal-overlay" role="dialog" aria-modal="true" aria-label="Exchange rate details" onClick={() => setShowRateModal(false)}>
            <div className="rate-modal" role="document" onClick={(e) => e.stopPropagation()}>
              <h3 className="rate-modal-title">{t('home.rateModal.title')}</h3>
              <p className="rate-modal-p">{t('home.rateModal.p1')}</p>
              <p className="rate-modal-p">{t('home.rateModal.currentRate')} <strong>{rateStr ? `${rateStr} VND` : (effectiveRate ? `${effectiveRate} VND` : '—')}</strong> {t('home.rateModal.perCAD') || t('home.rateModal.p1')}</p>
              <p className="rate-modal-p note">{t('home.rateModal.note')}</p>
              <div className="rate-modal-actions">
                <button className="btn" type="button" onClick={() => setShowRateModal(false)}>{t('home.rateModal.gotIt')}</button>
              </div>
            </div>
          </div>
        )}

        {/* How It Works Section */}
        <section className="how-it-works-section py-5">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="section-title">{t('home.howItWorksFull.title')}</h2>
              <p className="lead text-medium-emphasis">{t('home.howItWorksFull.subtitle')}</p>
            </div>
            
            {/* 4 Steps Process */}
            <div className="row g-4 mb-5">
              <div className="col-md-6 col-lg-3">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <div className="step-icon">📝</div>
                  <h5 className="step-title">{t('home.howItWorksFull.step1Title')}</h5>
                  <p className="step-description">{t('home.howItWorksFull.step1Desc')}</p>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="step-card">
                  <div className="step-number">2</div>
                  <div className="step-icon">💳</div>
                  <h5 className="step-title">{t('home.howItWorksFull.step2Title')}</h5>
                  <p className="step-description">{t('home.howItWorksFull.step2Desc')}</p>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="step-card">
                  <div className="step-number">3</div>
                  <div className="step-icon">✅</div>
                  <h5 className="step-title">{t('home.howItWorksFull.step3Title')}</h5>
                  <p className="step-description">{t('home.howItWorksFull.step3Desc')}</p>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="step-card">
                  <div className="step-number">4</div>
                  <div className="step-icon">🚀</div>
                  <h5 className="step-title">{t('home.howItWorksFull.step4Title')}</h5>
                  <p className="step-description">{t('home.howItWorksFull.step4Desc')}</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="text-center">
              <h3 className="mb-4">{t('home.howItWorksFull.ctaTitle')}</h3>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                <a href="/register" className="btn btn-primary btn-lg px-5">
                  {t('home.howItWorksFull.ctaSignUp')}
                </a>
                <a href="/login" className="btn btn-outline-primary btn-lg px-5">
                  {t('home.howItWorksFull.ctaLogin')}
                </a>
              </div>
              <p className="mt-3 text-muted small">{t('home.howItWorksFull.ctaSubtitle')}</p>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section className="faq-section py-5">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="section-title">{t('home.faq.title')}</h2>
              <p className="text-medium-emphasis">{t('home.faq.subtitle')}</p>
            </div>
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="accordion" id="faqAccordion">
                  
                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq1">
                      <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapse1" aria-expanded="true" aria-controls="collapse1">
                        {t('home.faq.q1.q')}
                      </button>
                    </h3>
                    <div id="collapse1" className="accordion-collapse collapse show" aria-labelledby="faq1" data-bs-parent="#faqAccordion">
                      <div className="accordion-body" dangerouslySetInnerHTML={{ __html: t('home.faq.q1.a') }} />
                    </div>
                  </div>

                  {/* <div className="accordion-item">
                    <h3 className="accordion-header" id="faq2">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse2" aria-expanded="true" aria-controls="collapse2">
                        {t('home.faq.q2.q')}
                      </button>
                    </h3>
                    <div id="collapse2" className="accordion-collapse collapse show" aria-labelledby="faq2" data-bs-parent="#faqAccordion">
                      <div className="accordion-body" dangerouslySetInnerHTML={{ __html: t('home.faq.q2.a') }} />
                    </div>
                  </div> */}

                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq3">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse3" aria-expanded="false" aria-controls="collapse3">
                        {t('home.faq.q3.q')}
                      </button>
                    </h3>
                    <div id="collapse3" className="accordion-collapse collapse" aria-labelledby="faq3" data-bs-parent="#faqAccordion">
                      <div className="accordion-body" dangerouslySetInnerHTML={{ __html: t('home.faq.q3.a') }} />
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq4">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse4" aria-expanded="false" aria-controls="collapse4">
                        {t('home.faq.q4.q')}
                      </button>
                    </h3>
                    <div id="collapse4" className="accordion-collapse collapse" aria-labelledby="faq4" data-bs-parent="#faqAccordion">
                      <div className="accordion-body" dangerouslySetInnerHTML={{ __html: t('home.faq.q4.a') }} />
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq5">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse5" aria-expanded="false" aria-controls="collapse5">
                        {t('home.faq.q5.q')}
                      </button>
                    </h3>
                    <div id="collapse5" className="accordion-collapse collapse" aria-labelledby="faq5" data-bs-parent="#faqAccordion">
                      <div className="accordion-body" dangerouslySetInnerHTML={{ __html: t('home.faq.q5.a') }} />
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq6">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse6" aria-expanded="false" aria-controls="collapse6">
                        {t('home.faq.q6.q')}
                      </button>
                    </h3>
                    <div id="collapse6" className="accordion-collapse collapse" aria-labelledby="faq6" data-bs-parent="#faqAccordion">
                      <div className="accordion-body" dangerouslySetInnerHTML={{ __html: t('home.faq.q6.a') }} />
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq7">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse7" aria-expanded="false" aria-controls="collapse7">
                        {t('home.faq.q7.q')}
                      </button>
                    </h3>
                    <div id="collapse7" className="accordion-collapse collapse" aria-labelledby="faq7" data-bs-parent="#faqAccordion">
                      <div className="accordion-body" dangerouslySetInnerHTML={{ __html: t('home.faq.q7.a') }} />
                    </div>
                  </div>

                </div>
              </div>
            </div>
            <div className="text-center mt-4">
              <p className="text-medium-emphasis">{t('home.faq.stillHaveQuestions')} <a href="/general/help" className="text-primary">{t('home.faq.contactSupport')}</a></p>
            </div>
          </div>
        </section>

        <AppFooter />
      </div>
    </div>
  );
}
