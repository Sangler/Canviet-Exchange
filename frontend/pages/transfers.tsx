import React, { useState, useEffect, useRef } from 'react';
import RequireAuth from '../components/RequireAuth';
import AppSidebar from '../components/AppSidebar';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { useAuth } from '../context/AuthContext';
import CIcon from '@coreui/icons-react';
import { cilArrowCircleLeft } from '@coreui/icons';

type TransactionHistory = {
  _id: string;
  amountSent: number;
  amountReceived: number;
  currencyFrom: string;
  currencyTo: string;
  status: string;
  createdAt: string;
  recipientBank: {
    accountHolderName?: string;
    bankName: string;
  };
};

export default function Transfer() {
  const { user } = useAuth();
  // Transaction history
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(true);
  
  // Bank selection
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [bankDropdownOpen, setBankDropdownOpen] = useState<boolean>(false);
  
  const vietnameseBanks = [
    { value: 'vietcombank', label: 'Vietcombank', icon: '/bank-icons/vietcombank.png' },
    { value: 'agribank', label: 'Agribank', icon: '/bank-icons/agribank.png' },
    { value: 'techcombank', label: 'Techcombank', icon: '/bank-icons/techcombank.png' },
    { value: 'mb', label: 'MB Bank', icon: '/bank-icons/mb.png' },
    { value: 'acb', label: 'ACB', icon: '/bank-icons/acb.png' },
    { value: 'vietinbank', label: 'VietinBank', icon: '/bank-icons/vietinbank.png' },
    { value: 'shinhan', label: 'Shinhan Bank', icon: '/bank-icons/shinhan.png' },
  ];
  
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
        // Same-origin fallback works over LAN/IP and in production
        const resp2 = await fetch(`/api/fx/cad-vnd`);
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

  // Fetch user's transaction history
  async function fetchTransactionHistory() {
    if (!user?.id) return;
    
    try {
      setTransactionsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/requests?userId=${user.id}&status=approved`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
    } finally {
      setTransactionsLoading(false);
    }
  }

  useEffect(() => {
    fetchRate();
    fetchTransactionHistory();
    rateTimer.current = setInterval(() => fetchRate(false), 60_000);
    return () => { if (rateTimer.current) clearInterval(rateTimer.current); };
  }, [user?.id]);

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
    // Normalize mobile input: support commas as decimal, strip invalid chars, keep single dot
    const raw = e.target.value || '';
    const normalized = raw.replace(/,/g, '.');
    const cleaned = normalized.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setAmountFrom(cleaned);
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
            <section className="introduction lt-md2:!pt-[52px] lt-md2:!pb-[36px] lt-md2:!px-[20px]">
              <div className="intro-inner">
                <h1 className="trf">Fast, Secure, Friendly Transfers</h1>
                <p className="intro-lead">
                  Send money from Canada
                  <img className="flag" src="/flags/Flag_of_Canada.png" alt="Canada" title="Canada" />
                  {' '}to Vietnam
                  <img className="flag" src="/flags/Flag_of_Vietnam.png" alt="Vietnam" title="Vietnam" />
                  {' '}with transparent rates and fast delivery.
                </p>

                <div className="intro-cta lt-phone:flex-col lt-phone:items-stretch">
                  <a href="#exchange" className="btn primary">Get Started</a>
                </div>
              </div>
              <div className="intro-decor" aria-hidden />
            </section>

            <main className="main-content lt-md2:!pt-[46px] lt-md2:!pb-[36px] lt-md2:!px-[18px]">
              {/* Progress bar + Back */}
              <div className="progress lt-phone:!py-[6px] lt-phone:!pr-[6px] lt-phone:!pl-[88px] lt-phone:!min-h-[40px]" role="region" aria-label="Transfer progress">
                <button className="back-btn z-20 pointer-events-auto lt-phone:!left-[8px] lt-phone:!p-1" onClick={() => setStep(prev => Math.max(1, prev - 1))} disabled={step <= 1}>
                  <CIcon icon={cilArrowCircleLeft} size="xl" className="back-icon lt-phone:!w-5 lt-phone:!h-5" aria-hidden="true" />

                </button>
                <ol className="steps relative z-0 lt-phone:!gap-[8px]" aria-label="Transfer steps">
                  <li className={`step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
                    <span className="dot lt-phone:!w-[22px] lt-phone:!h-[22px] lt-phone:!text-[11px]">1</span>
                    <span className="label">Recipient</span>
                  </li>
                  <li className={`step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
                    <span className="dot lt-phone:!w-[22px] lt-phone:!h-[22px] lt-phone:!text-[11px]">2</span>
                    <span className="label">Amount</span>
                  </li>
                  <li className={`step ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
                    <span className="dot lt-phone:!w-[22px] lt-phone:!h-[22px] lt-phone:!text-[11px]">3</span>
                    <span className="label">Details</span>
                  </li>
                  <li className={`step ${step === 4 ? 'active' : ''}`}>
                    <span className="dot lt-phone:!w-[22px] lt-phone:!h-[22px] lt-phone:!text-[11px]">4</span>
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
                    
                    {transactionsLoading ? (
                      <div className="text-center py-4">
                        <p className="text-medium-emphasis">Loading your transfer history...</p>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-medium-emphasis mb-3">
                          You have not sent any money back to Vietnam yet. Make your first transfer now!
                        </p>
                        <button 
                          type="button" 
                          className="btn primary" 
                          onClick={() => setStep(2)}
                        >
                          Start First Transfer
                        </button>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Recipient</th>
                              <th>Amount Sent</th>
                              <th>Amount Received</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactions.slice(0, 5).map((tx) => (
                              <tr key={tx._id}>
                                <td>
                                  {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td>
                                  <div>
                                    <strong>{tx.recipientBank?.accountHolderName || 'N/A'}</strong>
                                    <div className="small text-medium-emphasis">
                                      {tx.recipientBank?.bankName}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <strong>{tx.amountSent.toLocaleString()} {tx.currencyFrom}</strong>
                                </td>
                                <td>
                                  <strong>{tx.amountReceived.toLocaleString()} {tx.currencyTo}</strong>
                                </td>
                                <td>
                                  <span className={`badge ${
                                    tx.status === 'completed' ? 'bg-success' :
                                    tx.status === 'approved' ? 'bg-info' :
                                    tx.status === 'pending' ? 'bg-warning' :
                                    'bg-danger'
                                  }`}>
                                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {transactions.length > 5 && (
                          <div className="text-center mt-3">
                            <a href="/transfers-history" className="btn btn-outline-primary">
                              View All Transfers
                            </a>
                          </div>
                        )}
                      </div>
                    )}
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
                            min={20}
                            max={10000}
                            step="0.01"
                            required
                            value={amountFrom}
                            onChange={formatNumberInput}
                            onInput={formatNumberInput}
                            inputMode="decimal"
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
                      {/* Transfer fee notification */}
                      {(() => {
                        const val = parseFloat(amountFrom);
                        
                        // Show congratulations message when amount >= threshold
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
                                <strong>Congrats!</strong> NO Transfer fee applied. <strong> You Save ${FEE_CAD.toFixed(2)} CAD!</strong>.
                              </div>
                            </div>
                          );
                        }
                        
                        // Show fee warning and upsell by default or when amount is below threshold
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
                      <button 
                        type="button" 
                        className="dropdown-header"
                        onClick={() => {
                          const section = document.getElementById('cardForm');
                          section?.classList.toggle('expanded');
                        }}
                      >
                        <div className="dropdown-header-content">
                          <h3>Fast methods</h3>
                          <div className="dropdown-header-details">
                            <span className="delivery-info">Delivers instantly</span>
                            {amountTo && <span className="amount-preview">VND {amountTo}</span>}
                          </div>
                        </div>
                        <svg className="dropdown-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                      
                      <form id="cardForm" className="dropdown-content" onSubmit={onDetailsSubmit}>
                        <div className="form-group">
                          <div className="radio-group">
                            <label className="radio payment-radio">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="debit"
                                checked={transferMethod === 'debit'}
                                onChange={(e)=>setTransferMethod(e.target.value)}
                              />
                              <div className="radio-content">
                                <svg className="payment-icon" width="32" height="24" viewBox="0 0 32 24" fill="none">
                                  <rect x="1" y="3" width="30" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                                  <rect x="1" y="7" width="30" height="4" fill="currentColor"/>
                                </svg>
                                <span className="payment-label">Debit card</span>
                              </div>
                            </label>
                            <label className="radio payment-radio">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="credit"
                                checked={transferMethod === 'credit'}
                                onChange={(e)=>setTransferMethod(e.target.value)}
                              />
                              <div className="radio-content">
                                <svg className="payment-icon" width="32" height="24" viewBox="0 0 32 24" fill="none">
                                  <rect x="1" y="3" width="30" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                                  <rect x="1" y="7" width="30" height="4" fill="currentColor"/>
                                </svg>
                                <span className="payment-label">Credit card</span>
                                <span className="payment-note">2% processing fee applies</span>
                              </div>
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

                            <div className="form-group two-col lt-phone:!grid-cols-1">
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
                            <div className="form-group two-col lt-phone:!grid-cols-1">
                              <div>
                                <label>City</label>
                                <input type="text" name="city" placeholder="e.g., Vancouver" required />
                              </div>
                              <div>
                                <label>Province/State</label>
                                <input type="text" name="province" placeholder="e.g., BC" required />
                              </div>
                            </div>
                            <div className="form-group two-col lt-phone:!grid-cols-1">
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
                      <button 
                        type="button" 
                        className="dropdown-header"
                        onClick={() => {
                          const section = document.getElementById('bankForm');
                          section?.classList.toggle('expanded');
                        }}
                      >
                        <div className="dropdown-header-content">
                          <div className="dropdown-header-title">
                            <span className="best-value-badge">BEST VALUE</span>
                            <h3>Pay by bank</h3>
                          </div>
                          {amountTo && <span className="amount-preview">VND {amountTo}</span>}
                        </div>
                        <svg className="dropdown-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                      
                      <form id="bankForm" className="dropdown-content" onSubmit={onDetailsSubmit}>
                        <div className="form-group">
                          <div className="radio-group">
                            <label className="radio payment-radio">
                              <input
                                type="radio"
                                name="bankMethod"
                                value="e-transfer"
                                checked={transferMethod === 'e-transfer'}
                                onChange={(e)=>setTransferMethod(e.target.value)}
                              />
                              <div className="radio-content">
                                <svg className="payment-icon" width="32" height="24" viewBox="0 0 32 24" fill="none">
                                  <rect x="2" y="4" width="28" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                                  <path d="M6 8h8M6 12h12M6 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                <span className="payment-label">E-Transfer</span>
                              </div>
                            </label>
                            <label className="radio payment-radio">
                              <input
                                type="radio"
                                name="bankMethod"
                                value="wire"
                                checked={transferMethod === 'wire'}
                                onChange={(e)=>setTransferMethod(e.target.value)}
                              />
                              <div className="radio-content">
                                <svg className="payment-icon" width="32" height="24" viewBox="0 0 32 24" fill="none">
                                  <rect x="2" y="4" width="28" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                                  <circle cx="22" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                <span className="payment-label">Bank Transfer</span>
                              </div>
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
                              <div className="form-group two-col wire lt-phone:!grid-cols-1">
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

                    <section id="receiver" className="card transfer-details scroll-reveal">
                      <button 
                        type="button" 
                        className="dropdown-header"
                        onClick={() => {
                          const section = document.getElementById('receiverForm');
                          section?.classList.toggle('expanded');
                        }}
                      >
                        <div className="dropdown-header-content">
                          <div className="dropdown-header-title">
                            <svg className="payment-icon accent" width="32" height="24" viewBox="0 0 32 24" fill="none">
                              <rect x="2" y="4" width="28" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                              <path d="M2 9h28M8 14h4M8 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <h3>Receiver Bank Details</h3>
                          </div>
                          <span className="delivery-info">Required for transfer</span>
                        </div>
                        <svg className="dropdown-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                      
                      <div id="receiverForm" className="dropdown-content expanded">
                        <div className="form-group">
                          <label>Receiver Bank:</label>
                          <div className="custom-bank-select">
                            <button
                              type="button"
                              className="bank-select-trigger"
                              onClick={() => setBankDropdownOpen(!bankDropdownOpen)}
                            >
                              {selectedBank ? (
                                <div className="bank-option-display">
                                  <img 
                                    src={vietnameseBanks.find(b => b.value === selectedBank)?.icon} 
                                    alt=""
                                    className="bank-icon"
                                  />
                                  <span>{vietnameseBanks.find(b => b.value === selectedBank)?.label}</span>
                                </div>
                              ) : (
                                <span className="placeholder">Select a Bank</span>
                              )}
                              <svg className="dropdown-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none">
                                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            
                            {bankDropdownOpen && (
                              <div className="bank-options-list">
                                <div className="bank-option-placeholder">Select a Bank</div>
                                {vietnameseBanks.map((bank) => (
                                  <button
                                    key={bank.value}
                                    type="button"
                                    className={`bank-option ${selectedBank === bank.value ? 'selected' : ''}`}
                                    onClick={() => {
                                      setSelectedBank(bank.value);
                                      setBankDropdownOpen(false);
                                    }}
                                  >
                                    <img src={bank.icon} alt="" className="bank-icon" />
                                    <span>{bank.label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <input type="hidden" name="receiverBank" value={selectedBank} required />
                        </div>

                        <div className="form-group">
                          <label>Account #</label>
                          <input type="text" name="receiverBankAccount" placeholder="Account Number" required />
                        </div>

                        <div className="form-group">
                          <label>Content</label>
                          <input type="text" name="transferContent" placeholder="Message to recipient (Optional)" />
                        </div>
                      </div>
                    </section>
                  </>
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
                          const rateFormatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate);
                          return (
                            <div>
                              <strong>They receive:</strong> {vnd} VNĐ{' '}
                              <span className="fee-note">(${net.toFixed(2)} CAD × {rateFormatted})</span>
                            </div>
                          );
                        }
                        return <div><strong>They receive:</strong> {amountTo || '0'} VNĐ</div>;
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
    </RequireAuth>
  );
}
