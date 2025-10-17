import React, { useState, useEffect, useRef } from 'react';
import RequireAuth from '../components/RequireAuth';
import AppSidebar from '../components/AppSidebar';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { useAuth } from '../context/AuthContext';
import CIcon from '@coreui/icons-react';
import { cilArrowCircleLeft } from '@coreui/icons';

export default function Transfer() {
  const { user } = useAuth();
  // Fee rules
  const FEE_CAD = 1.5;
  const FEE_THRESHOLD = 1000;
  // Live CAD->VND rate handling
  const [rate, setRate] = useState<number | null>(null);
  const [prevRate, setPrevRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState<boolean>(true);
  const [rateError, setRateError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const rateTimer = useRef<NodeJS.Timeout | null>(null);
  async function fetchRate(manual = false) {
    try {
      if (manual) setRateLoading(true);
      setRateError(null);
      // Prefer direct ExchangeRate-API fetch; fallback to backend endpoint if needed
      const apiKey = process.env.NEXT_PUBLIC_EXCHANGE_API_KEY || '';
      let nextRate: number | null = null;
      let fetchedAt: string | null = null;

      try {
        const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/CAD`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Exchange API HTTP error');
        const data = await resp.json();
        // We expect { result: 'success', conversion_rates: { VND: number }, time_last_update_utc: string }
        if (data?.result === 'success' && typeof data?.conversion_rates?.VND === 'number') {
          nextRate = data.conversion_rates.VND;
          fetchedAt = data?.time_last_update_utc || null;
        } else {
          throw new Error('Exchange API invalid payload');
        }
      } catch (e) {
        // Fallback to backend if available
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const resp2 = await fetch(`${base}/api/fx/cad-vnd`);
        if (!resp2.ok) throw new Error('Rate fetch failed');
        const json2 = await resp2.json();
        if (json2?.ok && typeof json2.rate === 'number') {
          nextRate = json2.rate;
          fetchedAt = json2.fetchedAt || null;
        } else {
          throw new Error('Invalid payload');
        }
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

  const [amountFrom, setAmountFrom] = useState<string>('');
  const [amountTo, setAmountTo] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [transferMethod, setTransferMethod] = useState<string>('e-transfer');
  // Multi-step flow: 1=Recipient, 2=Amount, 3=Details, 4=Review
  const [step, setStep] = useState<number>(1);

  // Persist step in localStorage
  useEffect(() => {
    try { localStorage.setItem('transfer.step', String(step)); } catch {}
  }, [step]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('transfer.step');
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 1 && n <= 4) setStep(n);
      }
    } catch {}
  }, []);

  // Auto-calc receive amount
  useEffect(() => {
    const val = parseFloat(amountFrom);
    if (!isNaN(val) && rate) {
      // Do NOT apply fee in Step 2. Show gross VND based on full amount.
      setAmountTo(new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val * rate));
    } else {
      setAmountTo('');
    }
  }, [amountFrom, rate]);

  function formatNumberInput(e: React.ChangeEvent<HTMLInputElement>) {
    setAmountFrom(e.target.value);
  }

  async function onCalcSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep(3);
  }

  async function onDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep(4);
  }

  async function onTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      alert('Transfer submitted (placeholder)');
    } finally {
      setSubmitting(false);
    }
  }

  const isCard = transferMethod === 'debit' || transferMethod === 'credit';
  const isBank = transferMethod === 'e-transfer' || transferMethod === 'wire';
  const rateStr = typeof rate === 'number' ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate) : null;

  return (
    <RequireAuth>
      <div>
        <AppSidebar />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          <div className="body flex-grow-1 transfers-page">
            <section className="introduction">
              <div className="intro-inner">
                <h1>Fast, Secure, Friendly Transfers</h1>
                <p className="intro-lead">
                  Send money from Canada
                  <img className="flag" src="/flags/Flag_of_Canada.png" alt="Canada" title="Canada" />
                  {' '}to Vietnam
                  <img className="flag" src="/flags/Flag_of_Vietnam.png" alt="Vietnam" title="Vietnam" />
                  {' '}with transparent rates and fast delivery.
                </p>

                <div className="intro-cta">
                  <a href="#exchange" className="btn primary">Get Started</a>
                </div>
              </div>
              <div className="intro-decor" aria-hidden />
            </section>

            <main className="main-content">
              {/* Progress bar + Back */}
              <div className="progress" role="region" aria-label="Transfer progress">
                <button className="back-btn" onClick={() => setStep(prev => Math.max(1, prev - 1))} disabled={step <= 1}>
                  <CIcon icon={cilArrowCircleLeft} size="xl" className="back-icon" aria-hidden="true" />

                </button>
                <ol className="steps" aria-label="Transfer steps">
                  <li className={`step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
                    <span className="dot">1</span>
                    <span className="label">Recipient</span>
                  </li>
                  <li className={`step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
                    <span className="dot">2</span>
                    <span className="label">Amount</span>
                  </li>
                  <li className={`step ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
                    <span className="dot">3</span>
                    <span className="label">Details</span>
                  </li>
                  <li className={`step ${step === 4 ? 'active' : ''}`}>
                    <span className="dot">4</span>
                    <span className="label">Review</span>
                  </li>
                </ol>
              </div>

              <div className="grid">
                {/* Step 1 */}
                {step === 1 && (
                  <section id="new-recipient" className="card exchange-form scroll-reveal">
                    <h2>New Recipient in Vietnam<img className="flag" src="/flags/Flag_of_Vietnam.png" alt="Vietnam" title="Vietnam" />{' '}</h2>
                    <form id="newRecipient" onSubmit={(e)=>{e.preventDefault(); setStep(2);}}>
                      <button type="button" className="btn primary new-recipient-btn" onClick={() => setStep(2)}>
                        <svg
                          className="icon"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          focusable="false"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="9" cy="7" r="3" />
                          <path d="M2 21v-1a6 6 0 0 1 12 0v1" />
                          <path d="M16 8h6" />
                          <path d="M19 5v6" />
                        </svg>
                        New Recipient
                      </button>
                    </form>
                  </section>
                )}

                {step === 1 && (
                  <section id="recent-transfer" className="card exchange-form scroll-reveal">
                    <h2>Recent Transfers</h2>
                  </section>
                )}

                {/* Step 2 */}
                {step === 2 && (
                  <section id="exchange" className="card exchange-form scroll-reveal">
                    <form id="moneyExchangeForm" onSubmit={onCalcSubmit}>
                      <div className="form-group">
                        <label htmlFor="amountFrom">YOU SEND:</label>
                          {rateStr && (<span className="label-inline-info">1 CAD = {rateStr} VND</span>)}
                        <div className="currency-input" role="group" aria-label="You send amount in CAD">
                          <input
                            type="number"
                            id="amountFrom"
                            name="amountFrom"
                            placeholder="Enter amount"
                            min={50}
                            max={10000}
                            step="0.01"
                            required
                            value={amountFrom}
                            onChange={formatNumberInput}
                            aria-label="You send"
                          />
                          <div className="currency-suffix" aria-hidden="true">
                            <img className="flag" src="/flags/Flag_of_Canada.png" alt="" />
                            <span className="code">CAD</span>
                          </div>
                        </div>
                      </div>
                      <hr />
                      <div className="form-group">
                        <label htmlFor="amountTo">
                          THEY RECEIVE:
                        </label>
                        <div className="currency-input" role="group" aria-label="They receive amount in VND">
                          <input
                            type="text"
                            id="amountTo"
                            name="amountTo"
                            placeholder="Auto-calculated"
                            readOnly
                            value={amountTo}
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
                      {/* Put the transfer fee span here */}
                      {/* Fee not applied here; only calculated/shown at Review (Step 4) */}
                      {/* Upsell hint to reach threshold (with mini fee label) */}
                      {(() => {
                        const val = parseFloat(amountFrom);
                        if (isNaN(val) || val <= 0 || val >= FEE_THRESHOLD) return null;
                        return (
                          <>
                            <div className="fee-mini" role="note">Transfer fee: <strong>${FEE_CAD.toFixed(2)}</strong> CAD</div>
                            <div className="upsell-row" role="note" aria-live="polite">
                              <div className="upsell-text">
                                Tip: Send <strong>${FEE_THRESHOLD.toLocaleString()}</strong> CAD to enjoy no transfer fee.
                              </div>
                              <button type="button" className="upsell-btn" onClick={() => setAmountFrom(String(FEE_THRESHOLD))}>GET GOOD RATE</button>
                            </div>
                          </>
                        );
                      })()}
                      <button type="submit" className="btn primary w-full">Confirm send</button>
                    </form>
                  </section>
                )}

                {/* Step 3 */}
                {step === 3 && (
                  <>
                    <h2>Select payment method</h2>

                    <section id="card" className="card transfer-details scroll-reveal">
                      <h3>Pay with card</h3>
                      <form id="cardForm" onSubmit={onDetailsSubmit}>
                        <div className="form-group">
                          <label>Transfer Method:</label>
                          <div className="radio-group">
                            <label className="radio">
                              <input
                                type="radio"
                                name="cardMethod"
                                value="debit"
                                checked={transferMethod === 'debit'}
                                onChange={(e)=>setTransferMethod(e.target.value)}
                              />
                              <span>Debit</span>
                            </label>
                            <label className="radio">
                              <input
                                type="radio"
                                name="cardMethod"
                                value="credit"
                                checked={transferMethod === 'credit'}
                                onChange={(e)=>setTransferMethod(e.target.value)}
                              />
                              <span>Credit</span>
                            </label>
                          </div>
                        </div>

                        {isCard && (
                          <>
                            <div className="form-group">
                              <label>Card number</label>
                              <div className="currency-input">
                                <input type="text" name="cardNumber" inputMode="numeric" pattern="[0-9\s-]*" maxLength={19} placeholder="1234 5678 9012 3456" required />
                                <div className="currency-suffix card-brands" aria-hidden="true">
                                  <span className="brand visa">VISA</span>
                                  <span className="brand mc">MC</span>
                                </div>
                              </div>
                            </div>

                            <div className="form-group two-col">
                              <div>
                                <label>Expiration date</label>
                                <div className="expiry-group">
                                  <input type="text" name="expMonth" inputMode="numeric" pattern="[0-9]{2}" maxLength={2} placeholder="MM" required />
                                  <span className="slash">/</span>
                                  <input type="text" name="expYear" inputMode="numeric" pattern="[0-9]{2}" maxLength={2} placeholder="YY" required />
                                </div>
                              </div>
                              <div>
                                <label>Security code</label>
                                <input type="text" name="cvc" inputMode="numeric" pattern="[0-9]{3,4}" maxLength={4} placeholder="e.g., 123" required />
                              </div>
                            </div>

                            <div className="form-group">
                              <label>Your exact name on card</label>
                              <input type="text" name="cardName" placeholder="Full name on card" required />
                            </div>

                            <div className="form-group">
                              <label>Card nickname (optional)</label>
                              <input type="text" name="cardNickname" placeholder="e.g., My card" />
                            </div>

                            <h4>Billing address</h4>
                            <div className="form-group checkbox-row">
                              <label className="checkbox">
                                <input type="checkbox" name="useHomeAddress" />
                                <span>Use home address</span>
                              </label>
                            </div>

                            <div className="form-group">
                              <label>Street address</label>
                              <input type="text" name="street" placeholder="e.g., 100 W Georgia St" required />
                            </div>
                            <div className="form-group">
                              <label>Apartment, suite, unit, etc. (optional)</label>
                              <input type="text" name="unit" placeholder="e.g., Apt 74" />
                            </div>
                            <div className="form-group two-col">
                              <div>
                                <label>City</label>
                                <input type="text" name="city" placeholder="e.g., Vancouver" required />
                              </div>
                              <div>
                                <label>Province/State</label>
                                <input type="text" name="province" placeholder="e.g., BC" required />
                              </div>
                            </div>
                            <div className="form-group two-col">
                              <div>
                                <label>Postal code</label>
                                <input type="text" name="postal" placeholder="e.g., V6B 1X4" required />
                              </div>
                              <div>
                                <label>Country</label>
                                <input type="text" name="country" placeholder="e.g., Canada" defaultValue="Canada" required />
                              </div>
                            </div>
                          </>
                        )}
                      </form>
                    </section>

                    <section id="bank" className="card transfer-details scroll-reveal">
                      <h3>Transfer by Bank</h3>
                      <form id="bankForm" onSubmit={onDetailsSubmit}>
                        <div className="form-group">
                          <label>Transfer Method:</label>
                          <div className="radio-group">
                            <label className="radio">
                              <input
                                type="radio"
                                name="bankMethod"
                                value="e-transfer"
                                checked={transferMethod === 'e-transfer'}
                                onChange={(e)=>setTransferMethod(e.target.value)}
                              />
                              <span>E-Transfer</span>
                            </label>
                            <label className="radio">
                              <input
                                type="radio"
                                name="bankMethod"
                                value="wire"
                                checked={transferMethod === 'wire'}
                                onChange={(e)=>setTransferMethod(e.target.value)}
                              />
                              <span>Bank Transfer</span>
                            </label>
                          </div>
                        </div>

                        {isBank && (
                          <>
                            <div className="form-group">
                              <label>User Email:</label>
                              <input type="email" value={user?.email || ''} disabled />
                            </div>

                            {transferMethod === 'wire' && (
                              <div className="form-group two-col wire">
                                <div>
                                  <label>Account #</label>
                                  <input type="text" name="senderBankAccount" placeholder="e.g., 0123498765" required />
                                </div>
                                <div>
                                  <label>Transit Number</label>
                                  <input type="text" name="senderTransitNumber" placeholder="e.g., 012" required />
                                </div>
                                <div>
                                  <label>Institution Number</label>
                                  <input type="text" name="senderInstitutionNumber" placeholder="e.g., 01234" required />
                                </div>
                              </div>
                            )}

   
                          </>
                        )}
                      </form>
                    </section>
                  </>
                )}

                {step === 3 && (
                <section id="card" className="card transfer-details scroll-reveal">
                  <div>
                    <label>Receiver Bank:</label>
                    <select name="receiverBank" required>
                      <option value="">Select a Bank</option>
                      <option value="vietcombank">Vietcombank</option>
                      <option value="agribank">Agribank</option>
                      <option value="techcombank">Techcombank</option>
                      <option value="mb">MB Bank</option>
                      <option value="acb">ACB</option>
                      <option value="vietinbank">VietinBank</option>
                      <option value="shinhan">Shinhan Bank</option>
                    </select>
                  </div>

                  <div>
                    <label>Account #</label>
                    <input type="text" name="receiverBankAccount" placeholder="Account Number" required />
                  </div>

                </section>

                )}

                {step === 3 && (
                  <div className="step-actions">
                    <button type="button" className="btn primary w-full" onClick={() => setStep(4)}>
                      Confirm Transfer
                    </button>
                  </div>
                )}

                {step === 4 && (
                  <section id="review" className="card scroll-reveal">
                    <h2>Review &amp; Submit</h2>
                    <div className="review-grid">
                      <div><strong>Email:</strong> {user?.email || '-'}</div>
                      <div><strong>Amount:</strong> {amountFrom || '0'} CAD</div>
                      {(() => {
                        const val = parseFloat(amountFrom);
                        const fee = !isNaN(val) && val > 0 && val < FEE_THRESHOLD ? FEE_CAD : 0;
                        const isApplied = fee === 0; // As requested, show "Applied" when fee is 0.00
                        return (
                          <div
                            className="fee-review"
                            title={isApplied ? `No fee applied at $${FEE_THRESHOLD.toLocaleString()}+` : `Fee charged: $${fee.toFixed(2)} CAD`}
                          >
                            <span className="fee-label">Fee</span>

                            <span className={`fee-amount ${isApplied ? 'zero' : 'value'}`}>${fee.toFixed(2)} CAD</span>
                            <span className={`fee-badge ${isApplied ? 'applied' : 'charged'}`}>
                              {isApplied ? 'Applied' : 'Charged'}
                            </span>
                            <span className="fee-note">{`No fee at $${FEE_THRESHOLD.toLocaleString()} CAD`}</span>
                          </div>
                        );
                      })()}
                      {(() => {
                        const val = parseFloat(amountFrom);
                        if (!isNaN(val) && typeof rate === 'number') {
                          const fee = val > 0 && val < FEE_THRESHOLD ? FEE_CAD : 0;
                          const net = Math.max(val - fee, 0);
                          const vnd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(net * rate);
                          return <div><strong>They receive:</strong> {vnd} VND</div>;
                        }
                        return <div><strong>They receive:</strong> {amountTo || '0'} VND</div>;
                      })()}
                      <div><strong>Method:</strong> {transferMethod}</div>
                    </div>
                    <div className="review-actions">
                      <button type="button" className="btn ghost" onClick={() => setStep(3)}>Back</button>
                      <form onSubmit={onTransferSubmit}>
                        <button type="submit" className="btn primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Transfer'}</button>
                      </form>
                    </div>
                  </section>
                )}
              </div>

              <section className="features scroll-reveal">
                <h3>Why choose us</h3>
                <div className="features-grid">
                  <div className="feature card">
                    <h4>Low Fees</h4>
                    <p>Competitive rates and transparent fees. No hidden charges.</p>
                  </div>
                  <div className="feature card">
                    <h4>Fast Delivery</h4>
                    <p>Most transfers delivered within 24–48 hours.</p>
                  </div>
                  <div className="feature card">
                    <h4>Secure</h4>
                    <p>Encrypted transfers and verified partners.</p>
                  </div>
                </div>
              </section>

              <section className="testimonials scroll-reveal">
                <h3>What customers say</h3>
                <div className="testimonials-grid">
                  <blockquote className="card">“Great service — fast and easy!” <a href="https://www.facebook.com/momo.16111997" target="_blank" rel="noreferrer"><cite>- Momo</cite></a></blockquote>
                  <blockquote className="card">“Transparent fees and quick confirmation.” <a href="https://www.facebook.com/toan.lam.9" target="_blank" rel="noreferrer"><cite>- Tony Lam</cite></a></blockquote>
                  <blockquote className="card">“No fee with good exchange rate better than Remitly!” <a href="https://www.facebook.com/vanlythuc1202" target="_blank" rel="noreferrer"><cite>- Thuc Van</cite></a></blockquote>
                  <blockquote className="card">“Best exchange rate on the market but only for one-way transfers.” <a href="https://www.facebook.com/nhanle164" target="_blank" rel="noreferrer"><cite>- Nhan Le</cite></a></blockquote>
                </div>
              </section>
            </main>
          </div>
          <AppFooter />
        </div>
      </div>
      <style jsx>{`
        .transfers-page { --accent:#2563eb; --accent-rgb:37,99,235; --bg-soft:#f1f5f9; }
        .introduction { position:relative; padding:60px 28px 40px; background:linear-gradient(135deg,#1d4ed8,#0f172a); color:#fff; overflow:hidden; }
        .intro-inner { max-width:860px; margin:0 auto; position:relative; z-index:2; }
        .introduction h1 { font-size:clamp(2rem,4.5vw,3.2rem); margin:0 0 16px; font-weight:700; letter-spacing:-1px; line-height:1.05; }
        .intro-lead { font-size:clamp(1rem,1.7vw,1.25rem); max-width:560px; line-height:1.45; margin:0 0 28px; color:#e2e8f0; }
        .intro-cta { display:flex; gap:14px; flex-wrap:wrap; }
        .btn { --btn-bg:#fff; --btn-color:#0f172a; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; font-weight:600; padding:12px 22px; border-radius:10px; font-size:14px; transition:background .18s, color .18s, box-shadow .18s, border-color .18s; border:1px solid transparent; }
        .btn.primary { background:rgba(255,255,255,0.12); color:#fff; border-color:rgba(255,255,255,0.25); backdrop-filter:blur(4px); }
        .btn.primary:hover { background:#fff; color:#0f172a; }
        .btn.ghost { background:rgba(255,255,255,0.04); color:#fff; border-color:rgba(255,255,255,0.18); }
        .btn.ghost:hover { background:rgba(255,255,255,.18); }
        .w-full { width:100%; }
        .intro-decor { position:absolute; inset:0; background:radial-gradient(circle at 70% 30%,rgba(255,255,255,0.18),transparent 60%), radial-gradient(circle at 30% 70%,rgba(255,255,255,0.15),transparent 55%); opacity:.55; }
  .main-content { padding:50px 24px 40px; background:#f8fafc; }
  .progress { position:relative; max-width:860px; margin:0 auto 20px; padding:8px 8px; padding-left:48px; display:flex; align-items:center; min-height:48px; }
  .back-btn { position:absolute; left:8px; top:50%; transform:translateY(-50%); display:inline-flex; align-items:center; gap:6px; background:transparent; border:none; color:#334155; padding:6px 8px; border-radius:8px; cursor:pointer; }
  .back-btn:hover:not(:disabled) { background:#e2e8f0; }
  .back-btn:disabled { opacity:.45; cursor:not-allowed; }
  .back-btn .back-icon { width:24px; height:24px; }
  .steps { list-style:none; display:flex; gap:14px; padding:0; margin:0 auto; align-items:center; justify-content:center; width:100%; }
        .step { display:flex; align-items:center; gap:8px; color:#64748b; font-weight:600; }
        .step .dot { width:28px; height:28px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; background:#e2e8f0; color:#0f172a; font-size:13px; font-weight:700; }
        .step.active .dot { background:var(--accent); color:#fff; }
        .step.completed .dot { background:#22c55e; color:#fff; }
        .step .label { font-size:13px; letter-spacing:.3px; }
        .flag { display:inline-block; margin-left:6px; width:20px; height:auto; vertical-align:middle; }
        .grid { display:grid; gap:28px; grid-template-columns:1fr; align-items:start; max-width:860px; margin:0 auto 44px; }
        .new-recipient-btn { display:inline-flex; align-items:center; gap:10px; }
        .new-recipient-btn .icon { width:18px; height:18px; }
        .card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px 20px 24px; box-shadow:0 3px 10px -2px rgba(0,0,0,.05),0 10px 24px -8px rgba(0,0,0,.04); position:relative; overflow:hidden; transition:border-color .18s, box-shadow .18s; }
        .card:focus-within { border-color:var(--accent); box-shadow:0 0 0 2px rgba(var(--accent-rgb),.18), 0 4px 12px -2px rgba(0,0,0,.05), 0 12px 28px -6px rgba(0,0,0,.04); }
        .card h2, .card h3, .card h4 { margin:0 0 14px; font-weight:600; letter-spacing:-.5px; }
        .exchange-form h2 { font-size:24px; }
        form { display:flex; flex-direction:column; gap:18px; }
        .input-break { height:6px; }
        .rate-wrapper { display:flex; flex-direction:column; gap:4px; margin:-4px 0 6px; }
        .rate-info { margin:0; font-size:13px; color:#334155; display:flex; align-items:center; flex-wrap:wrap; gap:6px; }
        .delta { font-size:11px; padding:2px 6px; border-radius:20px; font-weight:600; letter-spacing:.5px; }
        .delta.up { background:#dcfce7; color:#166534; }
        .delta.down { background:#fee2e2; color:#991b1b; }
        .rate-meta { display:flex; align-items:center; gap:10px; font-size:11px; color:#64748b; }
        .timestamp { background:#f1f5f9; padding:4px 8px; border-radius:6px; }
        .mini-btn { border:1px solid #cbd5e1; background:#fff; padding:4px 8px; border-radius:6px; font-size:12px; cursor:pointer; line-height:1; }
        .mini-btn:hover:not(:disabled) { background:#f1f5f9; }
        .mini-btn:disabled { opacity:.5; cursor:wait; }
        .error { color:#b91c1c; font-weight:500; }
        .form-group { display:flex; flex-direction:column; gap:6px; }
  label { font-size:13px; font-weight:600; color:#334155; letter-spacing:.4px; text-transform:uppercase; display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
        select { font:inherit; padding:12px 14px; border:1px solid #cbd5e1; background:#f8fafc; border-radius:10px; transition:border-color .18s, background .18s, box-shadow .18s; }
        input { font:inherit; padding:12px 14px; border:none; background:#f8fafc; border-radius:10px; transition: background .18s; }
        .radio-group { display:flex; gap:14px; flex-wrap:wrap; }
        .radio { display:inline-flex; align-items:center; gap:8px; background:#f8fafc; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer; }
        .radio input { width:auto; padding:0; background:transparent; }
        .currency-input { position:relative; display:flex; align-items:center; }
        .currency-input input { width:100%; padding-right:86px; }
        .currency-suffix { position:absolute; right:6px; top:50%; transform:translateY(-50%); display:flex; align-items:center; gap:8px; padding:6px 10px; background:#eef2f7; border-radius:8px; border:1px solid #e2e8f0; }
        .currency-suffix .flag { margin-left:0; width:18px; height:auto; }
        .currency-suffix .code { font-weight:700; font-size:12px; color:#334155; letter-spacing:.6px; }
        /* Brand pills for card number suffix */
        .currency-suffix.card-brands { gap:6px; padding:6px 8px; }
        .currency-suffix.card-brands .brand { 
          display:inline-flex; align-items:center; justify-content:center;
          padding:4px 6px; font-size:10px; font-weight:800; letter-spacing:.6px;
          background:#e2e8f0; color:#0f172a; border:1px solid #cbd5e1; border-radius:6px;
          min-width:34px; text-transform:uppercase;
        }
        .currency-suffix.card-brands .brand.visa { }
        .currency-suffix.card-brands .brand.mc { }
        /* Expiry inputs group */
        .expiry-group { display:flex; align-items:center; gap:8px; }
        .expiry-group input { width:58px; text-align:center; }
        .expiry-group .slash { font-weight:700; color:#64748b; }
        /* Checkbox row styling */
        .checkbox-row .checkbox { display:inline-flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; cursor:pointer; }
        .checkbox-row input[type="checkbox"] { width:auto; height:auto; accent-color:var(--accent); }
        .review-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin:10px 0 14px; }
        .review-actions { display:flex; gap:12px; align-items:center; }
        .step-actions { max-width:860px; margin: -16px auto 36px; padding:0 4px; }
  .label-inline-info { margin-left:8px; font-weight:600; font-size:12px; color:#64748b; white-space:nowrap; }
  .fee-row { display:flex; align-items:center; justify-content:space-between; font-size:12px; color:#64748b; margin:6px 2px 0; }
  .fee-row .waived { text-decoration: line-through; opacity:.75; }
  .fee-row .fee-free { font-weight:700; color:#16a34a; }
  .fee-mini { margin-top:6px; font-size:12px; color:#334155; }
    /* Review fee styling */
    .fee-review { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:6px 8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; }
    .fee-label { font-weight:700; color:#334155; }
    .fee-badge { padding:2px 8px; border-radius:999px; font-size:12px; font-weight:800; letter-spacing:.3px; border:1px solid; }
    .fee-badge.applied { background:#dcfce7; color:#166534; border-color:#22c55e; }
    .fee-badge.charged { background:#fef3c7; color:#92400e; border-color:#f59e0b; }
    .fee-amount { font-weight:800; color:#0f172a; }
    .fee-amount.zero { text-decoration:line-through; opacity:.7; }
    .fee-note { font-size:12px; color:#64748b; }
  .upsell-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:6px; padding:8px 10px; border:1px dashed #cbd5e1; background:#f8fafc; border-radius:8px; font-size:12px; color:#334155; }
  .upsell-btn { background:transparent; border:1px solid #cbd5e1; padding:6px 10px; border-radius:8px; font-weight:700; cursor:pointer; color:#0f172a; }
  .upsell-btn:hover { background:#e2e8f0; }
        select:focus { outline:none; border-color:var(--accent); background:#fff; box-shadow:0 0 0 2px rgba(var(--accent-rgb),.15); }
        input:focus { outline:none; border:none; background:#fff; box-shadow:none; }
        input[disabled], select[disabled] { opacity:.8; cursor:not-allowed; }
        .two-col { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px; }
        .two-col.single { grid-template-columns:1fr; }
        .two-col.wire { grid-template-columns:1fr 1fr; }
        button.btn.primary { background:var(--accent); color:#fff; border:none; font-weight:600; letter-spacing:.6px; box-shadow:0 6px 18px -4px rgba(var(--accent-rgb),.5); position:relative; overflow:hidden; }
        button.btn.primary::after { content:""; position:absolute; inset:0; background:linear-gradient(120deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.25) 60%,rgba(255,255,255,0)); transform:translateX(-100%); transition:transform .6s; }
        button.btn.primary:hover::after { transform:translateX(100%); }
        button.btn.primary:hover { filter:brightness(1.05); }
        button[disabled] { opacity:.7; cursor:wait; }
        .features, .testimonials { max-width:860px; margin:0 auto 56px; }
        .features h3, .testimonials h3 { font-size:22px; margin-bottom:20px; }
        .features-grid, .testimonials-grid { display:grid; gap:22px; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); }
        .feature p { margin:4px 0 0; font-size:14px; line-height:1.45; color:#475569; }
        blockquote { margin:0; font-size:14px; line-height:1.5; font-style:italic; color:#334155; position:relative; }
        blockquote cite { font-style:normal; font-weight:600; margin-left:4px; }
        blockquote a { color:var(--accent); text-decoration:none; }
        blockquote a:hover { text-decoration:underline; }
        /* Hide number input spinners (Chrome, Safari, Edge, Opera) */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        /* Hide number input spinners (Firefox) */
        input[type="number"] { -moz-appearance: textfield; }
        /* Scroll reveal (simple fade/slide) placeholder */
        .scroll-reveal { animation:fadeUp .55s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        /* Dark mode */
        @media (prefers-color-scheme:dark) {
          .main-content { background:#0f172a; }
          .step { color:#94a3b8; }
          .step .dot { background:#334155; color:#e2e8f0; }
          .card { background:#1e293b; border-color:#334155; box-shadow:0 6px 18px -6px rgba(0,0,0,.6),0 2px 6px -2px rgba(0,0,0,.5); }
          .card:focus-within { border-color:var(--accent); box-shadow:0 0 0 2px rgba(var(--accent-rgb),.35), 0 6px 18px -6px rgba(0,0,0,.6), 0 2px 6px -2px rgba(0,0,0,.5); }
          label { color:#cbd5e1; }
          select { background:#1e293b; border-color:#475569; color:#e2e8f0; }
          input { background:#1e293b; border:none; color:#e2e8f0; }
          .radio { background:#1e293b; border-color:#475569; }
          .currency-suffix { background:#24324a; border-color:#334155; }
          .currency-suffix .code { color:#e2e8f0; }
          .currency-suffix.card-brands { background:#24324a; border-color:#334155; }
          .currency-suffix.card-brands .brand { background:#334155; border-color:#475569; color:#e2e8f0; }
          .expiry-group .slash { color:#94a3b8; }
          .checkbox-row .checkbox { background:#1e293b; border-color:#475569; }
          select:focus { background:#24324a; }
          input:focus { background:#24324a; box-shadow:none; }
          .rate-info { color:#94a3b8; }
          .timestamp { background:#334155; color:#cbd5e1; }
          .back-btn { color:#cbd5e1; }
          .back-btn:hover:not(:disabled) { background:#24324a; }
          .delta.up { background:#14532d; color:#4ade80; }
          .delta.down { background:#7f1d1d; color:#fca5a5; }
          .error { color:#f87171; }
          .feature p { color:#cbd5e1; }
          blockquote { color:#cbd5e1; }
          .intro-lead { color:#cbd5e1; }
          .label-inline-info { color:#94a3b8; }
          .fee-row { color:#94a3b8; }
          .fee-row .fee-free { color:#4ade80; }
          .fee-mini { color:#cbd5e1; }
           .fee-review { background:#1e293b; border-color:#334155; }
           .fee-label { color:#cbd5e1; }
           .fee-badge.applied { background:#0f3a1e; color:#86efac; border-color:#22c55e; }
           .fee-badge.charged { background:#3a2f1a; color:#f5d27b; border-color:#b98b2a; }
           .fee-amount { color:#e2e8f0; }
           .fee-note { color:#94a3b8; }
          .upsell-row { background:#1e293b; border-color:#334155; color:#e2e8f0; }
          .upsell-btn { border-color:#475569; color:#e2e8f0; }
          .upsell-btn:hover { background:#24324a; }
        }
        @media (max-width:880px) { .introduction { padding:52px 20px 36px; } .main-content { padding:46px 18px 36px; } }
        @media (max-width:580px) { 
          .intro-cta { flex-direction:column; align-items:stretch; }
          /* Progress bar compaction for phones */
          .progress { padding:6px 6px 6px 40px; min-height:40px; }
          .steps { gap:10px; }
          .step .label { display:none; }
          .step .dot { width:24px; height:24px; font-size:12px; }
          .back-btn { left:6px; }
          .back-btn .back-icon { width:20px; height:20px; }
          /* Force all multi-column groups to stack line-by-line on small screens */
          .two-col, .two-col.wire, .two-col.single { grid-template-columns:1fr !important; }
        }
      `}</style>
    </RequireAuth>
  );
}
