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


        <div className="body flex-grow-1 px-0 home-full-bleed">
          <div className="container">
            <div className="row g-0">
              <div className="col-12 w-100">
                
                {/* Testimonials / Reviews Section */}
                <section className="testimonials-section">
                  <div className="container">
                    <div className="text-center">
                                  <div className="logo">
              <img src="/logo.png" alt="CanViet Exchange" className="logo-img" />
            </div>
                      <h2 className="section-title">What Our Customers Say</h2>
                      <div className="trust-badge">
                        <div className="stars">★★★★★</div>
                        <p className="mb-0"><strong>4.8 out of 5</strong> based on 1,200+ reviews</p>
                      </div>
                    </div>
                  </div>
                </section>
                
                 <div className="main mb-4 border-0t">
                  <div className="main text-center py-4">
                      <h1 className="display-4 mb-3">
                        {rate ? `1 CAD = ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate)} VND` : 'Exchange Rate'}
                      </h1>
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
                      <img className="hero-img-base" src="/mainpage/banner_vietname.png" alt="" />
                      <img className="hero-img-blur" src="/mainpage/banner_vietname.png" alt="" />
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

                
                <div className="hero-card">

                  <section className="main mb-4">
                    <div className="main-body">
                      <div className="row align-items-center">
                        <div className="col-md-6 mb-3 mb-md-0">
                          <h1 className="h3">See Your Rate Instantly</h1>
                          <p className="text-medium-emphasis">Calculate exactly how much your loved ones will receive. No surprises, no hidden fees.</p>
                          <hr />
                          <div className="d-flex align-items-center gap-3">
                            <div className="fs-1">💰</div>
                            <div>
                              <strong>What you see is what they get</strong>
                              <div className="small text-medium-emphasis">Live rates updated every minute</div>
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
                                          1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate)} VND <strong>Best Rate</strong>
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
                                          onChange={(e) => formatCurrencyInput(e, 'to')}
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

                                {/* Payment Methods Display */}
                                <div className="payment-methods-preview mt-4">
                                  <div className="text-center mb-3">
                                    <strong className="d-block mb-2">Payment Methods:</strong>
                                    <div className="payment-icons d-flex justify-content-center gap-3 flex-wrap">
                                      <div className="payment-icon" title="Interac e-Transfer">
                                        <div>
                                          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="icon-interac">
                                            <rect width="40" height="40" rx="8" fill="#FFC400"/>
                                            <g transform="translate(8, 10)">
                                              <path d="M8 15 L8 8 L11 8 L11 4 L14 4 L14 8 L17 8 L17 15" fill="#2B2B2B" stroke="#2B2B2B" strokeWidth="1.5" strokeLinejoin="round"/>
                                              <rect x="4" y="15" width="3" height="5" rx="1.5" fill="#2B2B2B"/>
                                              <rect x="7.5" y="15" width="3" height="5" rx="1.5" fill="#2B2B2B"/>
                                              <rect x="11" y="15" width="3" height="5" rx="1.5" fill="#2B2B2B"/>
                                              <rect x="14.5" y="15" width="3" height="5" rx="1.5" fill="#2B2B2B"/>
                                              <path d="M14 4 L14 0 L17 0 L17 3" fill="#2B2B2B"/>
                                              <circle cx="18" cy="0.5" r="1" fill="#2B2B2B"/>
                                            </g>
                                          </svg>
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
                                        <span className="small">Card</span>
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
                                        <span className="small">Bank</span>
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
                </div>

                {/* Vietnamese Receiving Methods Section */}
                <section className="receiving-methods-section mb-5">
                  <div className="container">
                    <div className="text-center mb-4">
                      <h2 className="section-title">Flexible Receiving Options in Vietnam</h2>
                      <p className="text-medium-emphasis">Your recipient can receive money through multiple convenient methods</p>
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
                          <strong className="d-block mt-2">Bank Transfer</strong>
                          <p className="small text-muted mb-0">Vietcombank, BIDV, Techcombank, VPBank...</p>
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
                          <strong className="d-block mt-2">Momo Wallet</strong>
                          <p className="small text-muted mb-0">Instant to e-wallet</p>
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
                          <strong className="d-block mt-2">ZaloPay</strong>
                          <p className="small text-muted mb-0">Fast e-wallet transfer</p>
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
                          <strong className="d-block mt-2">Cash Pickup</strong>
                          <p className="small text-muted mb-0">At partner locations</p>
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
                              <span>💝 SPECIAL OFFER</span>
                            </div>
                            <h2 className="referral-title mb-3">Refer Friends & Earn Rewards</h2>
                            <p className="referral-description mb-4">
                              Share the love and get rewarded! Invite your friends to use CanViet Exchange. 
                              When they complete their first transfer, <strong>you both earn exclusive bonuses</strong>. 
                              It's our way of saying thank you for spreading the word.
                            </p>
                            <div className="referral-benefits mb-4">
                              <div className="benefit-item">
                                <div className="benefit-icon">✨</div>
                                <div>
                                  <strong>Instant Bonus</strong>
                                  <p className="mb-0 small">Get rewards when your friend signs up</p>
                                </div>
                              </div>
                              <div className="benefit-item">
                                <div className="benefit-icon">🚀</div>
                                <div>
                                  <strong>Unlimited Referrals</strong>
                                  <p className="mb-0 small">No limit on how many friends you can refer</p>
                                </div>
                              </div>
                            </div>
                            <a href="/register" className="btn btn-primary btn-lg referral-btn">
                              Start Referring Now
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
              <h3 className="rate-modal-title">How we calculate your rate</h3>
              <p className="rate-modal-p">We offer competitive exchange rates with a transparent margin applied to the market rate.</p>
              <p className="rate-modal-p">Your current exchange rate: <strong>{rateStr ? `${rateStr} VND` : (effectiveRate ? `${effectiveRate} VND` : '—')}</strong> per CAD</p>
              <p className="rate-modal-p">Send $1,000+ CAD to enjoy <strong>no transfer fee</strong>!</p>

              <p className="rate-modal-p note">*Note: Currency exchange rate might be fluctuating due to market change, political events, and other factors in long or short term.</p>
              <div className="rate-modal-actions">
                <button className="btn" type="button" onClick={() => setShowRateModal(false)}>Got it</button>
              </div>
            </div>
          </div>
        )}

        {/* How It Works Section */}
        <section className="how-it-works-section py-5">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="section-title">How Money Transfer Works</h2>
              <p className="lead text-medium-emphasis">Send money to Vietnam in 4 simple steps</p>
            </div>
            
            {/* 4 Steps Process */}
            <div className="row g-4 mb-5">
              <div className="col-md-6 col-lg-3">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <div className="step-icon">📝</div>
                  <h5 className="step-title">Create Account</h5>
                  <p className="step-description">Sign up for free in under 2 minutes. No hidden fees or commitments.</p>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="step-card">
                  <div className="step-number">2</div>
                  <div className="step-icon">💳</div>
                  <h5 className="step-title">Enter Details</h5>
                  <p className="step-description">Add recipient information and choose payment method. We keep your data secure.</p>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="step-card">
                  <div className="step-number">3</div>
                  <div className="step-icon">✅</div>
                  <h5 className="step-title">Confirm & Pay</h5>
                  <p className="step-description">Review the rate and total, then complete your secure payment instantly.</p>
                </div>
              </div>
              <div className="col-md-6 col-lg-3">
                <div className="step-card">
                  <div className="step-number">4</div>
                  <div className="step-icon">🚀</div>
                  <h5 className="step-title">Money Delivered</h5>
                  <p className="step-description">Track your transfer in real-time. Money typically arrives within hours!</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="text-center">
              <h3 className="mb-4">Ready to send money?</h3>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                <a href="/register" className="btn btn-primary btn-lg px-5">
                  Sign Up Now
                </a>
                <a href="/login" className="btn btn-outline-primary btn-lg px-5">
                  Log In
                </a>
              </div>
              <p className="mt-3 text-muted small">Join thousands of satisfied customers sending money home</p>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section className="faq-section py-5">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="section-title">Frequently Asked Questions</h2>
              <p className="text-medium-emphasis">Everything you need to know about sending money to Vietnam</p>
            </div>
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="accordion" id="faqAccordion">
                  
                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq1">
                      <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapse1" aria-expanded="true" aria-controls="collapse1">
                        How long does it take for money to arrive in Vietnam?
                      </button>
                    </h3>
                    <div id="collapse1" className="accordion-collapse collapse show" aria-labelledby="faq1" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Most transfers arrive within <strong>1-4 hours</strong> during business hours in Vietnam. Bank transfers may take up to 24 hours depending on the receiving bank's processing time. E-wallet transfers (Momo, ZaloPay) are typically instant.
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq2">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse2" aria-expanded="false" aria-controls="collapse2">
                        What are the fees for sending money?
                      </button>
                    </h3>
                    <div id="collapse2" className="accordion-collapse collapse" aria-labelledby="faq2" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Our standard transfer fee is <strong>$1.50 CAD</strong>. However, if you send <strong>$1,000 CAD or more</strong>, we waive the transfer fee completely! There are no hidden charges - what you see is what you pay.
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq3">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse3" aria-expanded="false" aria-controls="collapse3">
                        Is my money safe and secure?
                      </button>
                    </h3>
                    <div id="collapse3" className="accordion-collapse collapse" aria-labelledby="faq3" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Absolutely! We use <strong>bank-level encryption</strong> and comply with Canadian financial regulations. Your personal and financial information is protected with industry-leading security measures. All transfers are tracked and guaranteed.
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq4">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse4" aria-expanded="false" aria-controls="collapse4">
                        What payment methods can I use?
                      </button>
                    </h3>
                    <div id="collapse4" className="accordion-collapse collapse" aria-labelledby="faq4" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        You can send money using <strong>Interac e-Transfer</strong>, <strong>Credit/Debit Card</strong>, or <strong>Bank Transfer</strong>. Each method is secure and processed quickly. Interac e-Transfer is typically the fastest option for Canadian customers.
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq5">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse5" aria-expanded="false" aria-controls="collapse5">
                        How do I track my transfer?
                      </button>
                    </h3>
                    <div id="collapse5" className="accordion-collapse collapse" aria-labelledby="faq5" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        After completing your transfer, you'll receive a <strong>tracking number</strong> via email. You can log into your account anytime to check the status in real-time. We'll also notify you when the money has been successfully delivered.
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq6">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse6" aria-expanded="false" aria-controls="collapse6">
                        What information do I need about the recipient?
                      </button>
                    </h3>
                    <div id="collapse6" className="accordion-collapse collapse" aria-labelledby="faq6" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        For <strong>bank transfers</strong>, you'll need the recipient's full name, bank account number, and bank name. For <strong>e-wallets</strong> (Momo/ZaloPay), you just need their registered phone number. We guide you through each step to make it easy.
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h3 className="accordion-header" id="faq7">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse7" aria-expanded="false" aria-controls="collapse7">
                        Can I cancel or modify a transfer?
                      </button>
                    </h3>
                    <div id="collapse7" className="accordion-collapse collapse" aria-labelledby="faq7" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        You can cancel a transfer <strong>within 30 minutes</strong> of initiating it, as long as the money hasn't been sent yet. Contact our support team immediately if you need to make changes. Once the transfer is processed, modifications are not possible, but our support team is here to help with any issues.
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
            <div className="text-center mt-4">
              <p className="text-medium-emphasis">Still have questions? <a href="/general/help" className="text-primary">Contact our support team</a></p>
            </div>
          </div>
        </section>

        <AppFooter />
      </div>
    </div>
  );
}
