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
  const rateTimer = useRef<any | null>(null);
  const [amountFrom, setAmountFrom] = useState<string>('');
  const [amountTo, setAmountTo] = useState<string>('');
  const [showRateModal, setShowRateModal] = useState(false);

  // Fetch live CAD->VND rate from backend endpoint
  async function fetchRate(manual = false) {
    try {
      if (manual) setRateLoading(true);
      setRateError(null);
      let nextRate: number | null = null;
      let fetchedAt: string | null = null;

      try {
        const resp = await fetch('/api/fx/cad-vnd');
        if (!resp.ok) throw new Error('Backend FX HTTP error');
        const json = await resp.json();
        if (!json?.ok || typeof json.rate !== 'number') throw new Error('Backend FX invalid payload');
        nextRate = json.rate;
        fetchedAt = json.fetchedAt || null;
      } catch (err) {
        throw err;
      }

      if (typeof nextRate === 'number') {
        setPrevRate(rate);
        setRate(nextRate);
        setLastUpdated(fetchedAt || new Date().toISOString());
      } else {
        throw new Error('No rate returned');
      }
    } catch (e: any) {
      const msg = e?.message || 'Unknown error';
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
    } else {
      const cleaned = raw.replace(/[^0-9]/g, '');
      const limited = cleaned.slice(0, 9);
      const withoutLeadingZeros = limited.replace(/^0+/, '') || '0';
      const formatted = withoutLeadingZeros === '0' ? '' : new Intl.NumberFormat('en-US').format(parseInt(withoutLeadingZeros, 10));
      setActiveInput('to');
      setAmountTo(formatted);
    }
  }

  // Extra margin rules (same as transfers.tsx)
  const extraMargin = useMemo(() => {
    const val = parseFloat((amountFrom || '').toString());
    if (isNaN(val) || val <= 0) return 0;
    if (val >= 1000) return 90;
    if (val >= 300) return 40;
    return 0;
  }, [amountFrom]);

  const effective = useMemo(() => (typeof rate === 'number' ? Number(rate) + Number(extraMargin) : null), [rate, extraMargin]);
  const effectiveRate = effective;

  // Keep amountTo in sync when user edits amountFrom
  useEffect(() => {
    if (activeInput !== 'from') return;
    const val = parseFloat((amountFrom || '').toString().replace(/,/g, ''));
    if (!isNaN(val) && effective && effective > 0) {
      setAmountTo(new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val * effective));
    } else {
      setAmountTo('');
    }
  }, [amountFrom, effective, activeInput]);

  // Keep amountFrom in sync when user edits amountTo
  useEffect(() => {
    if (activeInput !== 'to') return;
    const val = parseFloat((amountTo || '').toString().replace(/,/g, ''));
    if (!isNaN(val) && effective && effective > 0) {
      setAmountFrom((val / effective).toFixed(2));
    } else {
      setAmountFrom('');
    }
  }, [amountTo, effective, activeInput]);

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
  return (
    <div>
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />

        <div className="body flex-grow-1 px-3 my-4">
          <div className="container-lg">
            <div className="row">
              <div className="col-12">
                {/* Hero Section */}
                <div className="card mb-4 border-0 bg-gradient">
                  <div className="card-body text-center py-5">
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
                {/* Exchange Quote Section */}  
                <section className="card mb-4">
                  <div className="card-body">
                    <div className="row align-items-center">
                      <div className="col-md-6 mb-3 mb-md-0">
                        <h1 className="h3">Fast Quote</h1>
                        <p className="text-medium-emphasis">Get an instant quote and preview how much your recipient would receive.</p>
                        <hr />
                        <div className="d-flex align-items-center gap-3">
                          <div className="fs-1">💱</div>
                          <div>
                            <strong>Transparent rates</strong>
                            <div className="small text-medium-emphasis">No surprises — see the rate before you continue</div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">


                        <div>
                          <div className="form-group">
                          
                          {amountFrom && parseFloat(amountFrom) > 0 && effectiveRate && (
                            <span className="label-inline-info">
                              Your rate: 1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(effectiveRate)} VND
                            </span>
                          )}

                               
                                <div className="top-block">
                                  {rate && (
                                    <div className="form-group mb-2">
                                      <label className="d-block text-muted small">YOU SEND:</label>
                                      <div className="label-inline-info">
                                        1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((rate || 0) + 90)} VND <strong>Best Rate</strong>
                                        <button
                                          type="button"
                                          aria-label="Rate details"
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
                                        placeholder="Enter Amount"
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

                                <hr />

                                {/* Bottom inputs block (aligned under HR) */}
                                <div className="bottom-block">
                                  <div className="form-group">
                                    <label htmlFor="amountTo">THEY RECEIVE:</label>
                                    <div className="currency-input" role="group" aria-label="They receive amount in VND">
                                      <input
                                        type="text"
                                        id="amountTo"
                                        name="amountTo"
                                        placeholder="Enter VND Amount"
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
                        <p className="card-text">Encrypted transfers and verified partners</p>
                      </div>
                    </div>
                  </div>
                </div>

                </section>

                {/* How It Works */}
                <div className="card mt-4">
                  <div className="card-header">
                    <h4 className="mb-0">How It Works</h4>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">1️⃣</div>
                        <h6>Sign Up</h6>
                        <p className="text-medium-emphasis small">Create your free account</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">2️⃣</div>
                        <h6>Enter Details</h6>
                        <p className="text-medium-emphasis small">Add recipient information</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">3️⃣</div>
                        <h6>Pay Securely</h6>
                        <p className="text-medium-emphasis small">Choose your payment method</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">4️⃣</div>
                        <h6>Track Transfer</h6>
                        <p className="text-medium-emphasis small">Monitor your transaction</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <AppFooter />
      </div>
    </div>
  );
}
