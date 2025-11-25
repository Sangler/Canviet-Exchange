import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
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
      const cleaned = normalized.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
      const parts = cleaned.split('.');
      parts[0] = parts[0].replace(/^0+/, '') || '0';
      if (parts[0].length > 5) parts[0] = parts[0].slice(0, 5);
      if (parts[1]) parts[1] = parts[1].slice(0, 2);
      const limited = parts.join('.');
      const display = limited === '0' ? '' : limited;
      setActiveInput('from');
      setAmountFrom(display);
    }
  }

  // Extra margin rules (same as transfers.tsx)
  // - amount < 300 CAD => +0 VND
  // - amount >= 300 and < 1000 => +50 VND
  // - amount >= 1000 => +100 VND
  const extraMargin = useMemo(() => {
    const val = parseFloat((amountFrom || '').toString());
    if (isNaN(val) || val <= 0) return 0;
    if (val >= 1000) return 100;
    if (val >= 300) return 50;
    return 0;
  }, [amountFrom]);

  const effective = useMemo(() => (typeof rate === 'number' ? Number(rate) + Number(extraMargin) : null), [rate, extraMargin]);
  const effectiveRate = effective;

  // Keep amountTo in sync when user edits amountFrom
  useEffect(() => {
    if (activeInput !== 'from' || isUpdatingRef.current) return;
    const val = parseFloat((amountFrom || '').toString().replace(/,/g, ''));
    if (!isNaN(val) && effective && effective > 0) {
      const rawNext = val * effective;
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
  }, [amountFrom, effective, activeInput]);

  // Redirect logged-in users to /transfers
  useEffect(() => {
    if (!loading && user) {
      router.replace('/transfers');
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return null;
  }

  // If user is logged in, don't render (redirect happening)
  if (user) {
    return null;
  }

  // Guest home page content
  const baseRateStr = rate ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate) : null;
  const rateStr = effectiveRate ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(effectiveRate) : null;
  return (
    <div>
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />

        <div className="body flex-grow-1 px-0 my-4 home-full-bleed">
          <div className="container">
            <div className="row g-0">
              <div className="col-12 w-100">
                
                 <div className="main mb-4 border-0t">
                  <div className="main text-center py-5">
                      <h1 className="display-4 mb-3">Welcome to CanViet Exchange</h1>
                      <p className="lead text-medium-emphasis mb-4">
                        Send money from Canada{' '}
                        <img 
                          src="/flags/Flag_of_Canada.png" 
                          alt="Canada" 
                          className="icon-small" 
                        />
                        {' '}to Vietnam{' '}
                        <img 
                          src="/flags/Flag_of_Vietnam.png" 
                          alt="Vietnam" 
                          className="icon-small" 
                        />
                        {' '}with transparent rates and fast delivery.
                      </p>
                  </div>
                </div>
                
                <div className="main mb-4 border-0 bg-gradient">
                  <div className="main-body hero-section text-center py-5">
                    <div className="hero-media" aria-hidden="true">
                      <img className="hero-img-base" src="/mainpage/banner_vietname_1920%C3%971080.jpg" alt="" />
                      <img className="hero-img-blur" src="/mainpage/banner_vietname_1920%C3%971080.jpg" alt="" />
                    </div>
                    <div className="hero-content">

                      <div className="d-flex gap-3 justify-content-center flex-wrap">
                        <a href="/register" className="btn btn-primary btn-lg">
                          Get Started
                        </a>
                        <a href="/login" className="btn btn-outline-primary btn-lg">
                          Sign In
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                
                <section className="main mb-4">
                  <div className="main-body">
                    <div className="row align-items-center">
                      <div className="col-md-6 mb-3 mb-md-0">
                        <h1 className="h3">Fast Quote</h1>
                        <p className="text-medium-emphasis">Get an instant quote and preview how much your recipient would receive.</p>
                        <hr />
                        <div className="d-flex align-items-center gap-3">
                          <div className="fs-1">🧾</div>
                          <div>
                            <strong>Transparent rates</strong>
                            <div className="small text-medium-emphasis">Review the rate before you continue</div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">


                        <div>
                          <div className="form-group">
                               
                                <div className="top-block">
                                  {rate && (
                                    <div className="form-group mb-2">
                                      <div className="label-inline-info">
                                        1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((rate || 0) + 100)} VND <strong>Best Rate</strong>
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
                                        <div className="label-inline-info mt-1">Your rate: 1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(effectiveRate)} VND</div>
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
                                        placeholder="You Send CAD"
                                        min={20}
                                        max={9999}
                                        step="0.01"
                                        value={amountFrom}
                                        onChange={(e) => formatCurrencyInput(e, 'from')}
                                        inputMode="decimal"
                                        aria-label="You send"
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
                                        placeholder="They Receive VND"
                                        value={amountTo}
                                        readOnly
                                        disabled
                                        inputMode="numeric"
                                        pattern="[0-9,]*"
                                        aria-label="They receive"
                                      />
                                      <div className="currency-suffix" aria-hidden="true">
                                        <img className="flag" src="/flags/Flag_of_Vietnam.png" alt="" />
                                        <span className="code">VND</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {(() => {
                                const val = parseFloat((amountFrom || '').toString().replace(/,/g, ''));
                                const FEE_CAD = 1.5;
                                const FEE_THRESHOLD = 1000;
                                if (!isNaN(val) && val >= FEE_THRESHOLD) {
                                  return (
                                    <div className="alert alert-success d-flex align-items-center mt-3" role="alert">
                                      <svg 
                                        width="24" 
                                        height="24" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                        className="me-2"
                                      >
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                      </svg>
                                      <div>
                                        <strong>Congrats!</strong> NO Transfer fee applied.
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="fee-mini" role="note">Transfer fee: <strong>${FEE_CAD.toFixed(2)}</strong> CAD - No fee if sending 1000 CAD</div>
                                );
                              })()}

                        <p className="main-text">Secure transfers and verified partners</p>
                      </div>
                    </div>
                  </div>
                </div>

                </section>

                {/* Why choose us */}
                <div className="main mt-4">
                  <div className="main-header">
                    <h4 className="mb-0 text-center">Why choose us?</h4>
                  </div>
                  <div className="main-body">
                    <div className="row">
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">1️⃣</div>
                        <h6>Best rate</h6>
                        <p className="text-medium-emphasis small"> Enjoy one of the most competitive exchange rates on the market.</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">2️⃣</div>
                        <h6>Lowest fee</h6>
                        <p className="text-medium-emphasis small">Save more with transparent & low transfer fees.</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">3️⃣</div>
                        <h6>Guaranteed Delivered</h6>
                        <p className="text-medium-emphasis small">Your money arrives safely and reliably every single time.</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">4️⃣</div>
                        <h6>Track Transfer</h6>
                        <p className="text-medium-emphasis small">Monitor your transfers and resend easily</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Section - Two Column Layout */}
                <div className="main mt-4">
                  <div className="main-body">
                    <div className="row align-items-center">
                      <div className="col-md-6 mb-3 mb-md-0">
                        <img 
                          src="/mainpage/referal-pic.jpg" 
                          alt="Refer a friend" 
                          className="img-fluid rounded"
                          style={{ width: '100%', height: 'auto' }}
                        />
                      </div>
                      <div className="col-md-6">
                        <h2 className="h3 mb-3">Refer Friends & Earn Rewards</h2>
                        <p className="text-medium-emphasis mb-4">
                          Share the love and get rewarded! Invite your friends to use CanViet Exchange. 
                          When they complete their first transfer, you both earn exclusive bonuses. 
                          It's our way of saying thank you for spreading the word.
                        </p>
                        <a href="/register" className="btn btn-primary btn-lg">
                          Refer Now
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showRateModal && (
          <div className="rate-modal-overlay" role="dialog" aria-modal="true" aria-label="Exchange rate details" onClick={() => setShowRateModal(false)}>
            <div className="rate-modal" role="document" onClick={(e) => e.stopPropagation()}>
              <h3 className="rate-modal-title">How we calculate your rate</h3>
              <ul className="rate-modal-list">
                <li>Send less than $300 CAD → Standard rate</li>
                <li>Send $300 - $999 CAD → Extra <strong>+50 VND/CAD</strong></li>
                <li>Send $1,000+ CAD → Extra <strong>+100 VND/CAD</strong> with no transfer fee applied!</li>
              </ul>
              <p className="rate-modal-p">Your current exchange rate: <strong>{rateStr ? `${rateStr} VND` : (effectiveRate ? `${effectiveRate} VND` : '—')}</strong> per CAD</p>

              <p className="rate-modal-p note">*Note: Currency exchange rate might be fluctuating due to market change, political events, and other factors in long or short term.</p>
              <div className="rate-modal-actions">
                <button className="btn" type="button" onClick={() => setShowRateModal(false)}>Got it</button>
              </div>
            </div>
          </div>
        )}
        <AppFooter />
        <style jsx>{`
          .main-body { position: relative; overflow: hidden; color: #ffffff; }
          /* Hero area: keep 16:9 (1920x1080) aspect ratio and scale responsively */
          .hero-section {
            position: relative;
            width: 100%;
            aspect-ratio: 16 / 9;
            max-width: 100%;
            min-height: 220px; /* reasonable minimum on small screens */
            display: block;
          }
          /* Prevent accidental hero/background on blocks that should not show the banner */
          .no-hero { background: none !important; color: inherit !important; }
          .hero-media { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
          .hero-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
          .hero-img-base { z-index: 1; filter: none; transform: none; }
          /* blurred layer: fade/opacity mask reversed (now fades from 20% -> 100% from top to bottom) */
          .hero-img-blur {
            z-index: 2;
            filter: blur(8px);
            transform: scale(1.03);
            -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.2) 0%, rgba(0,0,0,1) 100%);
            mask-image: linear-gradient(to top, rgba(0,0,0,0.2) 0%, rgba(0,0,0,1) 100%);
            opacity: 0;
            animation: blurFadeIn 900ms ease forwards 120ms;
          }

          @keyframes blurFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .hero-content { position: relative; z-index: 3; }
          .hero-media img, .hero-content { will-change: transform; }
        `}</style>
      </div>
    </div>
  );
}
