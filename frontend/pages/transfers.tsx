import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const { user, token } = useAuth();
  // Transaction history
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(true);
  
  // Bank selection
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [customBankName, setCustomBankName] = useState<string>('');
  const [bankDropdownOpen, setBankDropdownOpen] = useState<boolean>(false);
  
  const vietnameseBanks = [
    { value: 'vietcombank', label: 'Vietcombank', icon: '/bank-icons/vietcombank.png' },
    { value: 'agribank', label: 'Agribank', icon: '/bank-icons/agribank.png' },
    { value: 'techcombank', label: 'Techcombank', icon: '/bank-icons/techcombank.png' },
    { value: 'mb', label: 'MB Bank', icon: '/bank-icons/mb.png' },
    { value: 'acb', label: 'ACB', icon: '/bank-icons/acb.png' },
    { value: 'vietinbank', label: 'VietinBank', icon: '/bank-icons/vietinbank.png' },
    { value: 'shinhan', label: 'Shinhan Bank', icon: '/bank-icons/shinhan.png' },
    { value: 'Others', label: 'Others', icon: undefined },
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
  const [activeInput, setActiveInput] = useState<'from' | 'to'>('from'); // Track which input user is editing
  const [submitting, setSubmitting] = useState(false);
  const [transferMethod, setTransferMethod] = useState<string>('e-transfer');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // Multi-step flow: 1=Recipient, 2=Amount, 3=Payment Method (with substeps 3.1 and 3.2), 4=Review
  const [step, setStep] = useState<number>(1);
  const [subStep, setSubStep] = useState<number>(0); // Substep within step 3 (0=payment, 1=receiver)
  // Recipient info
  const [recipientPhoneCode, setRecipientPhoneCode] = useState<string>('+84');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState<string>('');
  const [transferContent, setTransferContent] = useState<string>('');
  // Bank transfer details (wire transfer) - SAFE to store
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');
  const [bankTransitNumber, setBankTransitNumber] = useState<string>('');
  const [bankInstitutionNumber, setBankInstitutionNumber] = useState<string>('');
  // Billing address
  const [useHomeAddress, setUseHomeAddress] = useState(false);
  const [billingStreet, setBillingStreet] = useState<string>('');
  const [billingUnit, setBillingUnit] = useState<string>('');
  const [billingCity, setBillingCity] = useState<string>('');
  const [billingProvince, setBillingProvince] = useState<string>('');
  const [billingPostal, setBillingPostal] = useState<string>('');
  const [billingCountry, setBillingCountry] = useState<string>('Canada');
  // Draft restoration indicator
  const [draftRestored, setDraftRestored] = useState(false);
  // Flag to prevent saving during initial restoration
  const [isRestoringFromDraft, setIsRestoringFromDraft] = useState(true);

  // Customer-specific extra margin based on amountFrom (CAD)
  // Rules:
  // - amount < 300 CAD => +0 VND
  // - amount >= 300 and < 1000 => +50 VND
  // - amount >= 1000 => + 150 VND
  const extraMargin = useMemo(() => {
    const val = parseFloat((amountFrom || '').toString());
    if (isNaN(val) || val <= 0) return 0;
    if (val >= 1000) return 150;
    if (val >= 300) return 50;
    return 0;
  }, [amountFrom]);

  // Effective rate used for calculations = base backend rate (includes +200 margin) + customer extra margin
  const effectiveRate = useMemo(() => (typeof rate === 'number' ? Number(rate) + Number(extraMargin) : null), [rate, extraMargin]);

  // ============================================
  // SAFE DATA PERSISTENCE (localStorage)
  // ============================================
  // Save non-sensitive form data to localStorage
  // SECURITY: NEVER save card details (card number, CVV, expiration)
  useEffect(() => {
    // Don't save during initial restoration to avoid overwriting the draft
    if (isRestoringFromDraft) return;
    
    try {
      const transferDraft = {
        step,
        amountFrom,
        amountTo,
        transferMethod,
        recipientPhoneCode,
        recipientPhone,
        recipientName,
        recipientAccountNumber,
        transferContent,
        selectedBank,
        customBankName,
        // Bank transfer info (wire) - SAFE to store
        bankAccountNumber,
        bankTransitNumber,
        bankInstitutionNumber,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('transfer.draft', JSON.stringify(transferDraft));
    } catch (error) {
      console.warn('Failed to save transfer draft:', error);
    }
  }, [step, amountFrom, amountTo, transferMethod, recipientPhoneCode, recipientPhone, recipientName, recipientAccountNumber, transferContent, selectedBank, customBankName, bankAccountNumber, bankTransitNumber, bankInstitutionNumber, isRestoringFromDraft]);

  // Restore form data from localStorage on mount
  useEffect(() => {
    try {
      
      const saved = localStorage.getItem('transfer.draft');
      
      // If no draft exists, start fresh at step 1
      if (!saved) {
        setStep(1);
        setIsRestoringFromDraft(false); // Done restoring
        return;
      }
      
      const draft = JSON.parse(saved);
      const timestamp = new Date(draft.timestamp);
      const hoursSinceLastEdit = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
      
      // Clear old drafts (4+ hours)
      if (hoursSinceLastEdit >= 4) {
        localStorage.removeItem('transfer.draft');
        setStep(1);
        setIsRestoringFromDraft(false); // Done restoring
        return;
      }
      
      // Restore all form data (non-sensitive only)
      if (draft.amountFrom) setAmountFrom(draft.amountFrom);
      if (draft.amountTo) setAmountTo(draft.amountTo);
      if (draft.transferMethod) setTransferMethod(draft.transferMethod);
      if (draft.recipientPhoneCode) setRecipientPhoneCode(draft.recipientPhoneCode);
      if (draft.recipientPhone) setRecipientPhone(draft.recipientPhone);
      if (draft.recipientName) setRecipientName(draft.recipientName);
      if (draft.recipientAccountNumber) setRecipientAccountNumber(draft.recipientAccountNumber);
      if (draft.transferContent) setTransferContent(draft.transferContent);
      if (draft.selectedBank) setSelectedBank(draft.selectedBank);
      if (draft.customBankName) setCustomBankName(draft.customBankName);
      
      // Restore bank transfer details (wire) - SAFE to store
      if (draft.bankAccountNumber) setBankAccountNumber(draft.bankAccountNumber);
      if (draft.bankTransitNumber) setBankTransitNumber(draft.bankTransitNumber);
      if (draft.bankInstitutionNumber) setBankInstitutionNumber(draft.bankInstitutionNumber);
      
      // Restore to the exact step where they left off
      // Security rule: Never restore to step 4 (review) - requires fresh validation
      // Maximum step allowed to restore is step 3
      
      const savedStep = draft.step || 1;
      
      // If they were at step 4 (review), take them back to step 3 (payment method)
      if (savedStep === 4) {
        setStep(3);
      } else {
        // Otherwise restore exactly where they were (1, 2, or 3)
        setStep(savedStep);
      }
      
      // Show restoration notification
      setDraftRestored(true);
      setTimeout(() => setDraftRestored(false), 8000);
      
      // Allow saving from now on
      setIsRestoringFromDraft(false);
      
    } catch (error) {
      console.warn('Failed to restore transfer draft:', error);
      // On error, start fresh
      setStep(1);
      setIsRestoringFromDraft(false); // Done restoring
    }
  }, []); // Only run on mount

  // Auto-fill billing address from user's home address when checkbox is checked
  useEffect(() => {
    if (useHomeAddress && user && token) {
      // Fetch full user profile to get address
      const fetchUserAddress = async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/users/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            const userProfile = data.user;
            setBillingStreet(userProfile.address?.street || '');
            setBillingUnit(userProfile.address?.unit || '');
            setBillingCity(userProfile.address?.city || '');
            setBillingProvince(userProfile.address?.province || '');
            setBillingPostal(userProfile.address?.postalCode || '');
            setBillingCountry('Canada');
          }
        } catch (error) {
          console.error('Failed to fetch user address:', error);
        }
      };
      fetchUserAddress();
    } else if (!useHomeAddress) {
      // Clear fields when unchecked
      setBillingStreet('');
      setBillingUnit('');
      setBillingCity('');
      setBillingProvince('');
      setBillingPostal('');
      setBillingCountry('Canada');
    }
  }, [useHomeAddress, user, token]);

  // Clear draft after successful submission
  const clearTransferDraft = () => {
    try {
      localStorage.removeItem('transfer.draft');
    } catch (error) {
      console.warn('Failed to clear transfer draft:', error);
    }
  };

  // Auto-calc receive amount (CAD -> VND)
  useEffect(() => {
    if (activeInput !== 'from') return;
    const val = parseFloat(amountFrom.replace(/,/g, ''));
    if (!isNaN(val) && effectiveRate && effectiveRate > 0) {
      // Do NOT apply fee in Step 2. Show gross VND based on full amount using effectiveRate (includes extra margin).
      setAmountTo(new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val * effectiveRate));
    } else {
      setAmountTo('');
    }
  }, [amountFrom, effectiveRate, activeInput]);

  // Auto-calc send amount (VND -> CAD)
  useEffect(() => {
    if (activeInput !== 'to') return;
    const val = parseFloat(amountTo.replace(/,/g, ''));
    if (!isNaN(val) && effectiveRate && effectiveRate > 0) {
      setAmountFrom((val / effectiveRate).toFixed(2));
    } else {
      setAmountFrom('');
    }
  }, [amountTo, effectiveRate, activeInput]);

  function formatCurrencyInput(e: React.ChangeEvent<HTMLInputElement>, type: 'from' | 'to') {
    const raw = e.target.value || '';
    
    if (type === 'from') {
      // CAD: Allow decimals, limit to 5 digits before decimal, 2 decimals after, remove leading zeros
      const normalized = raw.replace(/,/g, '.');
      const cleaned = normalized.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
      const parts = cleaned.split('.');
      
      parts[0] = parts[0].replace(/^0+/, '') || '0';
      
      if (parts[0].length > 5) {
        parts[0] = parts[0].slice(0, 5);
      }
      
      if (parts[1]) {
        parts[1] = parts[1].slice(0, 2);
      }
      
      const limited = parts.join('.');
      const display = limited === '0' ? '' : limited;
      
      setActiveInput('from');
      setAmountFrom(display);
    } else {
      // VND: No decimals, limit to 9 digits, format with commas, remove leading zeros
      const cleaned = raw.replace(/[^0-9]/g, '');
      const limited = cleaned.slice(0, 9);
      const withoutLeadingZeros = limited.replace(/^0+/, '') || '0';
      const formatted = withoutLeadingZeros === '0' ? '' : new Intl.NumberFormat('en-US').format(parseInt(withoutLeadingZeros, 10));
      setActiveInput('to');
      setAmountTo(formatted);
    }
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

      // Ensure we have a valid exchange rate
      const finalExchangeRate = effectiveRate || rate || 0;
      
      if (!finalExchangeRate || finalExchangeRate <= 0) {
        alert('Exchange rate is not available. Please refresh the page and try again.');
        setSubmitting(false);
        return;
      }
      
      // Prepare request data
      const requestData = {
        userId: user?.id,
        userEmail: user?.email,
        userPhone: {
          countryCode: recipientPhoneCode,
          phoneNumber: recipientPhone
        },
        amountSent: parseFloat(amountFrom.replace(/,/g, '')),
        amountReceived: parseFloat(amountTo.replace(/,/g, '')),
        exchangeRate: finalExchangeRate,
        currencyFrom: 'CAD',
        currencyTo: 'VND',
        transferFee: 0, // Calculate based on your fee structure
        sendingMethod: {
          type: transferMethod,
          // Include bank transfer details if wire transfer
          ...(transferMethod === 'wire' && {
            bankTransfer: {
              institutionNumber: bankInstitutionNumber,
              transitNumber: bankTransitNumber,
              accountNumber: bankAccountNumber
            }
          })
        },
        recipientBank: {
          bankName: selectedBank === 'Others' ? customBankName : selectedBank,
          accountNumber: recipientAccountNumber,
          accountHolderName: recipientName,
          transferContent: transferContent
        },
        termAndServiceAccepted: agreedToTerms
      };


      // Submit to backend
      const response = await fetch('http://localhost:5000/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to submit transfer request');
      }

      // Clear the draft after successful submission
      clearTransferDraft();
      
      // Reset form
      setStep(1);
      setSubStep(0);
      setAmountFrom('');
      setAmountTo('');
      setTransferMethod('e-transfer');
      setRecipientPhoneCode('+84');
      setRecipientPhone('');
      setRecipientName('');
      setRecipientAccountNumber('');
      setTransferContent('');
      setSelectedBank('');
      setCustomBankName('');
      setBankAccountNumber('');
      setBankTransitNumber('');
      setBankInstitutionNumber('');
      setAgreedToTerms(false);
      setDraftRestored(false);

      // Redirect to receipt page with hash
      window.location.href = `/transfers/receipt/${data.receiptHash}`;

    } catch (error: any) {
      console.error('Transfer submission error:', error);
      alert(`Failed to submit transfer: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const isCard = transferMethod === 'debit' || transferMethod === 'credit';
  const isBank = transferMethod === 'e-transfer' || transferMethod === 'wire';
  const rateStr = typeof effectiveRate === 'number' ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(effectiveRate) : null;
  const baseRateStr = typeof rate === 'number' ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate) : null;
  const [showRateModal, setShowRateModal] = useState(false);

  return (
    <RequireAuth>
      <div>
        <AppSidebar />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          <div className="body flex-grow-1 transfers-page">
            {showRateModal && (
              <div className="rate-modal-overlay" role="dialog" aria-modal="true" aria-label="Exchange rate details" onClick={() => setShowRateModal(false)}>
                <div className="rate-modal" role="document" onClick={(e) => e.stopPropagation()}>
                  <h3 className="rate-modal-title">How we calculate your exchange rate</h3>
                  <p className="rate-modal-p">
                    Current's rate: {baseRateStr ? <strong>{baseRateStr} VND</strong> : <em>not available</em>}
                  </p>

                  <p className="rate-modal-p">Plus, you get a bonus rate when you send more:</p>
                  <ul className="rate-modal-list">
                    <li>Send less than $300 CAD → Standard rate</li>
                    <li>Send $300 - $999 CAD → Extra <strong>+50 VND/CAD</strong></li>
                    <li>Send $1,000+ CAD → Extra <strong>+150 VND/CAD</strong> with no transfer fee applied!</li>
                  </ul>
                  <p className="rate-modal-p">Your current bonus: <strong>+{extraMargin} VND</strong></p>
                  <p className="rate-modal-p">Your current exchange rate: <strong>{rateStr ? `${rateStr} VND` : (effectiveRate ? `${effectiveRate} VND` : '—')}</strong> per CAD</p>

                  <p className="rate-modal-p note">*Note: Exchange rate might be fluctuating due to market change, political events, and other factors in long or short term.</p>
                  <div className="rate-modal-actions">
                    <button className="btn" type="button" onClick={() => setShowRateModal(false)}>Got it</button>
                  </div>
                </div>
              </div>
            )}
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
              {/* Draft restored notification - only show if step > 1 */}
              {draftRestored && step > 1 && (
                <div className="alert alert-info d-flex align-items-center mb-4 mx-auto" style={{ maxWidth: '860px' }} role="alert">
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
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <div className="flex-grow-1">
                    <strong>Welcome back!</strong>Please continue where you are left off!
                  </div>
                  <button 
                    type="button" 
                    className="btn-close ms-2" 
                    onClick={() => setDraftRestored(false)}
                    aria-label="Close"
                  ></button>
                </div>
              )}
              
              {/* Progress bar + Back */}
              <div className="progress lt-phone:!py-[6px] lt-phone:!pr-[6px] lt-phone:!pl-[88px] lt-phone:!min-h-[40px]" role="region" aria-label="Transfer progress">
                <button 
                  className="back-btn z-20 pointer-events-auto lt-phone:!left-[8px] lt-phone:!p-1" 
                  onClick={() => {
                    if (step === 3 && subStep === 1) {
                      setSubStep(0);
                    } else {
                      setStep(prev => Math.max(1, prev - 1));
                      setSubStep(0);
                    }
                  }} 
                  disabled={step <= 1}
                >
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
                  <li className={`step ${step === 3 ? 'active' : step > 3 ? 'completed' : ''} ${step === 3 && subStep === 1 ? 'half-completed' : ''}`}>
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
                          {rate && (
                            <span className="label-inline-info">

                              1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate + 150)} VND <strong>Best Rate</strong>
                              <button
                                type="button"
                                aria-label="Rate details"
                                onClick={() => setShowRateModal(true)}
                                className="rate-info-btn"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="16" x2="12" y2="12"></line>
                                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                              </button>
                            </span>
                          )}
                          {amountFrom && parseFloat(amountFrom) > 0 && effectiveRate && (
                            <span className="label-inline-info" style={{ color: '#059669', fontWeight: 500 }}>
                              Your rate: 1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(effectiveRate)} VND
                            </span>
                          )}
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
                            onChange={(e) => formatCurrencyInput(e, 'from')}
                            onInput={(e) => formatCurrencyInput(e as unknown as React.ChangeEvent<HTMLInputElement>, 'from')}
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
                            placeholder="Enter VND amount"
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

                {/* Step 3.1 - Payment Method */}
                {step === 3 && subStep === 0 && (
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
                                <span className="payment-note">2% processing fee might be applied</span>
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
                                <input 
                                  type="checkbox" 
                                  name="useHomeAddress" 
                                  checked={useHomeAddress}
                                  onChange={(e) => setUseHomeAddress(e.target.checked)}
                                />
                                <span>Use home address</span>
                              </label>
                            </div>

                            <div className="form-group">
                              <label>Street address</label>
                              <input 
                                type="text" 
                                name="street" 
                                value={billingStreet}
                                readOnly
                                disabled
                              />
                            </div>
                            <div className="form-group">
                              <label>Apartment, suite, unit, etc. (optional)</label>
                              <input 
                                type="text" 
                                name="unit" 
                                value={billingUnit}
                                readOnly
                                disabled
                              />
                            </div>
                            <div className="form-group two-col lt-phone:!grid-cols-1">
                              <div>
                                <label>City</label>
                                <input 
                                  type="text" 
                                  name="city" 
                                  value={billingCity}
                                  readOnly
                                  disabled
                                />
                              </div>
                              <div>
                                <label>Province/State</label>
                                <input 
                                  type="text" 
                                  name="province" 
                                  value={billingProvince}
                                  readOnly
                                  disabled
                                />
                              </div>
                            </div>
                            <div className="form-group two-col lt-phone:!grid-cols-1">
                              <div>
                                <label>Postal code</label>
                                <input 
                                  type="text" 
                                  name="postal" 
                                  value={billingPostal}
                                  readOnly
                                  disabled
                                />
                              </div>
                              <div>
                                <label>Country</label>
                                <input 
                                  type="text" 
                                  name="country" 
                                  value={billingCountry}
                                  readOnly
                                  disabled
                                />
                              </div>
                            </div>

                            <div className="form-group delivery-notice">
                              <p className="notice-text">
                                <strong>Expected delivery:</strong> 24-48 business hours
                              </p>
                              <p className="notice-subtext">
                                Note: Processing speed may vary based on your payment method, delivery method, bank's policies and other factors such as third-party delays. 
                                Consider that your transfer might take longer than expected—this is normal!
                              </p>
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
                                <span className="payment-label">Bank Transfer</span><strong>RECOMMENDED</strong>
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
                                  <input 
                                    type="text" 
                                    name="senderBankAccount" 
                                    placeholder="e.g., 0123498765" 
                                    value={bankAccountNumber}
                                    onChange={(e) => setBankAccountNumber(e.target.value)}
                                    required 
                                  />
                                </div>
                                <div>
                                  <label>Transit Number</label>
                                  <input 
                                    type="text" 
                                    name="senderTransitNumber" 
                                    placeholder="e.g., 012" 
                                    value={bankTransitNumber}
                                    onChange={(e) => setBankTransitNumber(e.target.value)}
                                    required 
                                  />
                                </div>
                                <div>
                                  <label>Institution Number</label>
                                  <input 
                                    type="text" 
                                    name="senderInstitutionNumber" 
                                    placeholder="e.g., 01234" 
                                    value={bankInstitutionNumber}
                                    onChange={(e) => setBankInstitutionNumber(e.target.value)}
                                    required 
                                  />
                                </div>
                              </div>
                            )}

                            <div className="form-group delivery-notice">
                              <p className="notice-text">
                                <strong>Expected delivery:</strong> {transferMethod === 'e-transfer' ? 'Within 24 hours' : '5-7 business days'}
                              </p>
                              <p className="notice-subtext">
                                Note: Processing speed may vary based on your payment method, delivery method, bank's policies and other factors such as third-party delays. 
                                Consider that your transfer might take longer than expected—this is normal!
                              </p>
                            </div>
                          </>
                        )}
                      </form>
                    </section>
                  </>
                )}

                {step === 3 && subStep === 0 && (
                  <div className="step-actions">
                    <button 
                      type="button" 
                      className="btn primary w-full" 
                      onClick={() => {
                        // Validate billing address checkbox for card payments
                        if (isCard && !useHomeAddress) {
                          alert('Please check "Use home address" to fill in your billing address before continuing.');
                          return;
                        }
                        setSubStep(1);
                      }}
                    >
                      Continue to Receiver Details
                    </button>
                  </div>
                )}

                {/* Step 3.2 - Receiver Bank Details */}
                {step === 3 && subStep === 1 && (
                  <>
                    <h2>Receiver Bank Details</h2>

                    <section id="receiver" className="card transfer-details scroll-reveal">
                      <div className="dropdown-content expanded">

                        <div className="form-group">
                          <label>Recipient Full Name</label>
                          <input 
                            type="text" 
                            name="receiverName" 
                            placeholder="Recipient Full Name" 
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            required 
                          />
                        </div>

                        <div className="form-group">
                          <label>Recipient Phone Number</label>
                          <div className="phone-row">
                            <select className="code themed" value={recipientPhoneCode} onChange={(e) => setRecipientPhoneCode(e.target.value)}>
                              <option value="+1">+1</option>
                              <option value="+84">+84</option>
                            </select>
                            <input 
                              className="phone themed" 
                              type="tel"
                              value={recipientPhone} 
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                if (value.length <= 10) {
                                  setRecipientPhone(value);
                                }
                              }} 
                              placeholder="Recipient phone number" 
                              maxLength={10}
                              pattern="[0-9]{10}"
                              required 
                            />
                          </div>
                          <input type="hidden" name="receiverPhoneNumber" value={`${recipientPhoneCode}${recipientPhone}`} />
                          <p>Please enter the correct recipient's phone number!</p>
                        </div>

                        <div className="form-group">
                          <label>Receiver Bank:</label>
                          <div className={`custom-bank-select ${bankDropdownOpen ? 'dropdown-open' : ''}`}>
                            <button
                              type="button"
                              className="bank-select-trigger"
                              onClick={() => setBankDropdownOpen(!bankDropdownOpen)}
                            >
                              {selectedBank ? (
                                <div className="bank-option-display">
                                  {selectedBank === 'Others' ? (
                                    <span>{customBankName || 'Others'}</span>
                                  ) : (
                                    <>
                                      <img 
                                        src={vietnameseBanks.find(b => b.value === selectedBank)?.icon} 
                                        alt=""
                                        className="bank-icon"
                                      />
                                      <span>{vietnameseBanks.find(b => b.value === selectedBank)?.label}</span>
                                    </>
                                  )}
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
                                      if (bank.value !== 'Others') {
                                        setCustomBankName(''); // Clear custom name if not Others
                                      }
                                    }}
                                  >
                                    {bank.icon ? (
                                      <img src={bank.icon} alt="" className="bank-icon" />
                                    ) : (
                                      <span className="bank-icon-placeholder"></span>
                                    )}
                                    <span>{bank.label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <input type="hidden" name="receiverBank" value={selectedBank === 'Others' ? customBankName : selectedBank} required />
                        </div>

                        {/* Show custom bank name input if "Others" is selected */}
                        {selectedBank === 'Others' && (
                          <div className="form-group">
                            <label>Bank Name</label>
                            <input 
                              type="text" 
                              name="customBankName" 
                              placeholder="Enter bank name" 
                              value={customBankName}
                              onChange={(e) => setCustomBankName(e.target.value)}
                              required 
                            />
                          </div>
                        )}

                        <div className="form-group">
                          <label>Account #</label>
                          <input 
                            type="text" 
                            name="receiverBankAccount" 
                            placeholder="Account Number" 
                            value={recipientAccountNumber}
                            onChange={(e) => setRecipientAccountNumber(e.target.value)}
                            required 
                          />
                        </div>

                        <div className="form-group">
                          <label>Content</label>
                          <input 
                            type="text" 
                            name="transferContent" 
                            placeholder="Message to recipient (Optional)" 
                            value={transferContent}
                            onChange={(e) => setTransferContent(e.target.value)}
                          />
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {step === 3 && subStep === 1 && (
                  <div className="step-actions">
                    <button type="button" className="btn primary w-full" onClick={() => setStep(4)}>
                      Continue to Review
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
                        if (!isNaN(val) && typeof effectiveRate === 'number') {
                          const fee = val > 0 && val < FEE_THRESHOLD ? FEE_CAD : 0;
                          const net = Math.max(val - fee, 0);
                          const vnd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(net * (effectiveRate || 0));
                          const rateFormatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(effectiveRate || 0);
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
                      <div><strong>Recipient:</strong> {recipientName || '-'}</div>
                      <div><strong>Bank:</strong> {selectedBank === 'Others' ? customBankName || 'Others' : selectedBank}</div>
                      <div><strong>Account #:</strong> {recipientAccountNumber || '-'}</div>
                    </div>
                    
                    <div className="form-group checkbox-row">
                      <label className="checkbox">
                        <input 
                          type="checkbox" 
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          required
                        />
                        <span>
                          <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> Read & Agreed!
                        </span>
                      </label>
                    </div>
                    
                    <div className="review-actions">
                      <button type="button" className="btn ghost" onClick={() => setStep(3)}>Back</button>
                      <form onSubmit={onTransferSubmit}>
                        <button type="submit" className="btn primary" disabled={submitting || !agreedToTerms}>
                          {submitting ? 'Submitting…' : 'Submit Transfer'}
                        </button>
                      </form>
                    </div>
                  </section>
                )}
              </div>

            {/* Modal styles moved to frontend/scss/style.scss */}

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
