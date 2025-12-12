import React, { useState, useEffect, useRef, useMemo } from 'react';
import RequireAuth from '../components/RequireAuth';
import AppSidebar from '../components/AppSidebar';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import CIcon from '@coreui/icons-react';
import { cilArrowCircleLeft } from '@coreui/icons';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '../components/StripePaymentForm';

// Load Stripe (only once, outside component)
const stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY || '');

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
  const router = useRouter();
  const { user, token } = useAuth();
  const { t } = useLanguage();
  // Transaction history
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(true);
  
  // KYC success notification
  const [kycSuccess, setKycSuccess] = useState(false);
  
  // Bank selection
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [customBankName, setCustomBankName] = useState<string>('');
  const [bankDropdownOpen, setBankDropdownOpen] = useState<boolean>(false);
  const [receivingMethodDropdownOpen, setReceivingMethodDropdownOpen] = useState<boolean>(false);
  
  const receivingMethods = [
    { value: 'bank', label: t('transfers.bankTransfer'), icon: '/bank-icons/bank-svgrepo-com.svg' },
    { value: 'momo', label: t('transfers.momoWallet'), icon: '/bank-icons/momo.png' },
    { value: 'zalopay', label: t('transfers.zalopayWallet'), icon: '/bank-icons/zalopay.jpeg' },
    { value: 'cash', label: t('transfers.cashPickup'), icon: '/bank-icons/cash.png' },
  ];
  
  const vietnameseBanks = [
    { value: 'Vietcombank', label: 'Vietcombank', icon: '/bank-icons/vietcombank.png' },
    { value: 'Agribank', label: 'Agribank', icon: '/bank-icons/agribank.png' },
    { value: 'Techcombank', label: 'Techcombank', icon: '/bank-icons/techcombank.png' },
    { value: 'MB', label: 'MB Bank', icon: '/bank-icons/mb.png' },
    { value: 'ACB', label: 'ACB', icon: '/bank-icons/acb.png' },
    { value: 'BIDV', label: 'BIDV', icon: '/bank-icons/bidv.jpg' },
    { value: 'Vietinbank', label: 'VietinBank', icon: '/bank-icons/vietinbank.png' },
    { value: 'Shinhan', label: 'Shinhan Bank', icon: '/bank-icons/shinhan.png' },
    { value: 'Others', label: 'Others', icon: '/bank-icons/bank-svgrepo-com.svg' },
  ];
  
  // Fee rules
  const FEE_CAD = 1.5; // Always charge $1.50 CAD fee
  // Live CAD->VND rate handling
  const [rate, setRate] = useState<number | null>(null);
  const [prevRate, setPrevRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState<boolean>(true);
  const [rateError, setRateError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const rateTimer = useRef<NodeJS.Timeout | null>(null);

  // Display rate adjusted by -250 VND (base rate - 250)
  const displayRate = typeof rate === 'number' ? Math.max(0, Number((rate - 250).toFixed(2))) : null;
  const displayRateFormatted = displayRate !== null ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayRate) : null;
  const baseRateFormatted = typeof rate === 'number' ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate) : null;
  
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
      // Request a reasonable page of recent requests and filter client-side for approved/completed
      const response = await fetch(`/api/requests?limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const reqs = Array.isArray(data.requests) ? data.requests : [];
        // Only include requests that belong to this user (server also filters when auth is present)
        const mine = reqs.filter(r => String(r.userId) === String(user.id) || !r.userId);
        // Keep only approved or completed statuses
        const filtered = mine.filter(r => r.status === 'approved' || r.status === 'completed');
        // Take the 5 most recent (requests are returned sorted desc by createdAt)
        setTransactions(filtered.slice(0, 5));
      }
    } catch (error) {
    } finally {
      setTransactionsLoading(false);
    }
  }

  useEffect(() => {
    fetchRate();
    fetchTransactionHistory();
    rateTimer.current = setInterval(() => fetchRate(false), 60_000);
    // Fetch user profile to get points
    (async () => {
      if (!token) return;
      try {
        const resp = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.user && typeof data.user.points === 'number') {
            setUserPoints(data.user.points);
          }
        }
      } catch (e) {
      }
    })();

    return () => { if (rateTimer.current) clearInterval(rateTimer.current); };
  }, [user?.id]);

  // KYC status is checked only when user clicks "Start verifying" button

  const [amountFrom, setAmountFrom] = useState<string>('');
  const [amountTo, setAmountTo] = useState<string>('');
  const [activeInput, setActiveInput] = useState<'from' | 'to'>('from'); // Track which input user is editing
  const lastComputedToRef = useRef<number>(NaN);
  const lastComputedFromRef = useRef<number>(NaN);
  const isUpdatingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [removeFeeChecked, setRemoveFeeChecked] = useState<boolean>(false);
  const [buffExchangeChecked, setBuffExchangeChecked] = useState<boolean>(false);
  const [transferMethod, setTransferMethod] = useState<string>('e-transfer');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Stripe payment state
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const stripeFormRef = useRef<any>(null);
  const [paymentFlowBusy, setPaymentFlowBusy] = useState(false);
  // Transfer fee & tax (populated from backend when creating PaymentIntent)
  // Default to 0; will be set by backend for card payments or computed locally for non-card.
  const [transferFee, setTransferFee] = useState<number>(0);
  const [transferTax, setTransferTax] = useState<number>(0);
  
  // KYC reminder popup state
  const [showKycReminder, setShowKycReminder] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>('unverified');
  
  // Multi-step flow: 1=Recipient, 2=Amount, 3=Payment Method (with substeps 3.1 and 3.2), 4=Review
  const [step, setStep] = useState<number>(1);
  const [subStep, setSubStep] = useState<number>(0); // Substep within step 3 (0=payment, 1=receiver)
  // Recipient info
  const [recipientPhoneCode, setRecipientPhoneCode] = useState<string>('+84');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState<string>('');
  const [recipientReceivingMethod, setRecipientReceivingMethod] = useState<string>('bank');
  const [transferContent, setTransferContent] = useState<string>('');
  // EFT details (EFT transfer) - SAFE to store
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

  // Coming soon modal for unsupported receiving methods (e.g., Cash pick-up)
  const [showComingSoon, setShowComingSoon] = useState(false);
  const prevReceivingMethodRef = useRef<string | null>(null);

  useEffect(() => {
    // track previous non-cash selection
    if (recipientReceivingMethod && recipientReceivingMethod !== 'cash') {
      prevReceivingMethodRef.current = recipientReceivingMethod;
    }
    if (recipientReceivingMethod === 'cash') {
      // show coming soon and revert selection so user must choose again
      setShowComingSoon(true);
      // revert to previous selection or default to 'bank'
      const prev = prevReceivingMethodRef.current || 'bank';
      // Small timeout to allow UI selection event to complete before reverting
      setTimeout(() => {
        setRecipientReceivingMethod(prev);
      }, 50);
      // auto-dismiss modal after 2.5s
      setTimeout(() => setShowComingSoon(false), 2500);
    }
  }, [recipientReceivingMethod]);

  // Check for KYC success URL parameter
  useEffect(() => {
    if (router.query.kycSuccess === 'true') {
      setKycSuccess(true);
      
      // Remove the URL parameter without page reload
      const { kycSuccess: _, ...rest } = router.query;
      try {
        const params = new URLSearchParams(rest as Record<string, string>);
        const newPath = router.pathname + (params.toString() ? `?${params.toString()}` : '');
        if (newPath !== router.asPath) {
          router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
        }
      } catch (e) {
        // fallback: attempt replace but avoid crashing
        try { router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true }); } catch (_) {}
      }
      
      // Auto-dismiss after 10 seconds
      setTimeout(() => setKycSuccess(false), 10000);
    }
  }, [router.query.kycSuccess]);

  // Fetch KYC status on mount
  useEffect(() => {
    if (!token) return;
    
    const fetchKycStatus = async () => {
      try {
        const response = await fetch('/api/kyc/status', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.kycStatus) {
            setKycStatus(data.kycStatus);
          }
        }
      } catch (error) {
      }
    };
    
    fetchKycStatus();
  }, [token]);

  // NOTE: When the user reaches Step 4 (Review) and card payment is selected,
  // we initialize the PaymentIntent so the Stripe `PaymentElement` can mount
  // and the customer can enter card details prior to final confirmation.
  // Payment confirmation (charging the card) still happens only during final submit.
  useEffect(() => {
    const isCardPayment = transferMethod === 'debit' || transferMethod === 'credit';
    // Reset payment state when switching away from card payments
    if (!isCardPayment) {
      setClientSecret('');
      setPaymentIntentId('');
      setPaymentStatus('pending');
    }
  }, [transferMethod]);

  // KYC reminder will be shown based on kycStatus state set when user starts KYC flow

  // Effective rate used for calculations. If user selected card in Step 2 and
  // has progressed to the next steps (3 or 4), apply -250 VND per CAD.
  const effectiveRate = useMemo(() => {
    if (typeof rate !== 'number') return null;
    const isCardSelected = transferMethod === 'debit' || transferMethod === 'credit';
    const applyDiscount = isCardSelected && (step >= 3 || (step === 2 && subStep === 1));
    const val = applyDiscount ? Number((rate - 250).toFixed(6)) : Number(rate);
    return val;
  }, [rate, transferMethod, step, subStep]);

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
        recipientReceivingMethod,
        transferContent,
        selectedBank,
        customBankName,
        // EFT info (EFT transfer) - SAFE to store
        bankAccountNumber,
        bankTransitNumber,
        bankInstitutionNumber,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('transfer.draft', JSON.stringify(transferDraft));
    } catch (error) {
    }
  }, [step, amountFrom, amountTo, transferMethod, recipientPhoneCode, recipientPhone, recipientName, recipientAccountNumber, recipientReceivingMethod, transferContent, selectedBank, customBankName, bankAccountNumber, bankTransitNumber, bankInstitutionNumber, isRestoringFromDraft]);

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
      if (draft.recipientReceivingMethod) setRecipientReceivingMethod(draft.recipientReceivingMethod);
      if (draft.transferContent) setTransferContent(draft.transferContent);
      if (draft.selectedBank) setSelectedBank(draft.selectedBank);
      if (draft.customBankName) setCustomBankName(draft.customBankName);
      
      // Restore EFT details (EFT) - SAFE to store
      if (draft.bankAccountNumber) setBankAccountNumber(draft.bankAccountNumber);
      if (draft.bankTransitNumber) setBankTransitNumber(draft.bankTransitNumber);
      if (draft.bankInstitutionNumber) setBankInstitutionNumber(draft.bankInstitutionNumber);
      
      // Restore to the exact step where they left off.
      // Previously we prevented restoring to step 4 for safety; update: allow
      // restoration to step 4 so the PaymentElement can initialize there
      // (the PaymentElement will be created on Step 4 mount and confirmation
      // still only happens on final submit).
      const savedStep = draft.step || 1;
      // Allow restoring to step 4 now (user will continue where they left off)
      setStep(savedStep);
      
      // Show restoration notification
      setDraftRestored(true);
      setTimeout(() => setDraftRestored(false), 8000);
      
      // Allow saving from now on
      setIsRestoringFromDraft(false);
      
    } catch (error) {
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
          const response = await fetch(`/api/users/me`, {
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
    }
  };
  // Unified KYC start flow (same-tab redirect; preserves draft)
  const startKycVerification = async () => {
    if (!token) {
      alert('Please login first.');
      router.push('/login');
      return;
    }
    try {
      const draft = {
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
        bankAccountNumber,
        bankTransitNumber,
        bankInstitutionNumber,
        savedAt: new Date().toISOString(),
        pendingKyc: true
      };
      try { localStorage.setItem('pendingTransferDraft', JSON.stringify(draft)); } catch {}
      const response = await fetch('/api/kyc/create-verification', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok || !data.verificationUrl) {
        alert(data.message || 'Failed to start verification.');
        return;
      }
      window.location.href = data.verificationUrl; // same-tab navigation
    } catch (err) {
      alert('Unable to start verification. Please try again.');
    }
  };

  // Auto-calc receive amount (CAD -> VND)
  useEffect(() => {
    if (activeInput !== 'from' || isUpdatingRef.current) return;
    const val = parseFloat(amountFrom.replace(/,/g, ''));
    if (!isNaN(val) && effectiveRate && effectiveRate > 0) {
      // Do NOT apply fee in Step 2. Show gross VND based on full amount using effectiveRate (includes extra margin).
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

  // Auto-calc send amount (VND -> CAD) when user edits the VND input
  useEffect(() => {
    if (activeInput !== 'to' || isUpdatingRef.current) return;
    const val = parseInt((amountTo || '').toString().replace(/,/g, ''), 10);
    if (!isNaN(val) && effectiveRate && effectiveRate > 0) {
      const rawCad = val / effectiveRate;
      const nextNum = Math.round(rawCad * 100) / 100; // round to cents
      if (lastComputedFromRef.current !== nextNum) {
        isUpdatingRef.current = true;
        lastComputedFromRef.current = nextNum;
        const display = (nextNum % 1 === 0) ? nextNum.toFixed(0) : nextNum.toFixed(2);
        setAmountFrom(display === '0' ? '' : display);
        setTimeout(() => { isUpdatingRef.current = false; }, 0);
      }
    } else {
      lastComputedFromRef.current = NaN;
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

  async function onCalcSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep(3);
  }

  async function onDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubStep(1);
  }

  // Create Stripe PaymentIntent when user selects card payment
  async function createPaymentIntent() {
    if (!amountFrom || parseFloat(amountFrom.replace(/,/g, '')) <= 0) {
      alert('Please enter a valid amount before proceeding with card payment.');
      return;
    }

    setPaymentProcessing(true);
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amountFrom.replace(/,/g, ''))
        })
      });

      const data = await response.json();

      if (!response.ok || !data.clientSecret) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setPaymentStatus('pending');
      // Update fee/tax from backend breakdown so UI and final request use canonical values
      try {
        if (data.breakdown) {
          setTransferFee(Number(data.breakdown.transferFee) || 0);
          setTransferTax(Number(data.breakdown.tax) || 0);
        }
      } catch (bErr) {
      }
      return { clientSecret: data.clientSecret, paymentIntentId: data.paymentIntentId };
    } catch (error) {
      alert('Failed to initialize payment. Please try again.');
      // Reset back to e-transfer if payment init fails
      setTransferMethod('e-transfer');
    } finally {
      setPaymentProcessing(false);
    }
  }

  // Handle successful payment confirmation
  function handlePaymentSuccess(confirmedPaymentIntentId: string) {
    setPaymentIntentId(confirmedPaymentIntentId);
    setPaymentStatus('succeeded');
    // If payment was completed during earlier steps, guide user to receiver details.
    // If payment confirmed during final review (step 4), do not change the UI here —
    // the submit flow will continue and post the transfer request.
    if (step !== 4) {
      alert('Payment successful! Please complete the recipient details.');
      setSubStep(1);
    }
  }

  // Handle payment errors
  function handlePaymentError(errorMessage: string) {
    alert(`Payment failed: ${errorMessage}`);
    setPaymentStatus('failed');
  }

  // When user reaches Step 4 and card payment is selected, create the PaymentIntent
  // so the PaymentElement can mount and the customer can enter card details.
  // We still only confirm the payment when the user submits the final form.
  React.useEffect(() => {
    // compute card flag from transferMethod here to avoid referencing variables
    // declared later in the file (prevents SSR ReferenceError)
    const isCardLocal = transferMethod === 'debit' || transferMethod === 'credit';
    if (step === 4 && isCardLocal && kycStatus === 'verified' && !clientSecret && !paymentProcessing) {
      // initialize payment form in background so PaymentElement is visible
      createPaymentIntent().catch((err) => {
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, transferMethod, kycStatus, clientSecret, paymentProcessing]);


  async function onTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {

      // Check KYC status before allowing transfer submission
      const kycResponse = await fetch('/api/kyc/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const kycData = await kycResponse.json();
      
      if (!kycResponse.ok || !kycData.ok) {
        alert('Failed to verify KYC status. Please try again.');
        setSubmitting(false);
        return;
      }

      // If KYC not verified, show reminder modal
      if (kycData.kycStatus !== 'verified') {
        setSubmitting(false);
        setShowKycReminder(true);
        return;
      }

      // Check 24-hour limit for regular users (not admin)
      if (user?.role !== 'admin') {
        const currentAmount = parseFloat(amountFrom.replace(/,/g, '')) || 0;
        
        try {
          const response = await fetch('/api/requests', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const allRequests = data.requests || [];
            
            // Calculate cutoff time (24 hours + 1 minute ago)
            const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000 + 60 * 1000));
            
            // Sum all amounts from requests within the last 24 hours + 1 minute
            const recentTotal = allRequests
              .filter((req: RequestItem) => new Date(req.createdAt) > cutoffTime)
              .reduce((sum: number, req: RequestItem) => sum + (req.amountSent || 0), 0);
            
            const totalWithCurrent = recentTotal + currentAmount;
            
            if (totalWithCurrent > 9999) {
              alert(
                `Transfer Limit Exceeded!\n\n` +
                `Daily limit: $9,999 CAD\n` +
                `Please come back tomorrow!\n` 
              );
              setSubmitting(false);
              return;
            }
          }
        } catch (error) {
          // Continue with submission if limit check fails (graceful degradation)
        }
      }

      // Ensure we have a valid exchange rate and include any buff selected by the user
      const baseFinalRate = effectiveRate || rate || 0;
      const finalExchangeRate = baseFinalRate + (buffExchangeChecked ? 100 : 0);
      
      if (!finalExchangeRate || finalExchangeRate <= 0) {
        alert('Exchange rate is not available. Please refresh the page and try again.');
        setSubmitting(false);
        return;
      }
      
      // If card payment is selected, create PaymentIntent and confirm payment during submit
      if (isCard) {
        setPaymentFlowBusy(true);
        // Create payment intent if not present yet
        if (!clientSecret) {
          const created = await createPaymentIntent();
          if (!created) {
            alert('Failed to initialize payment. Please try again.');
            setPaymentFlowBusy(false);
            setSubmitting(false);
            return;
          }
        }

        // Wait for the Stripe form component to mount and expose confirmPayment
        const waitForStripeFormReady = async (timeout = 5000) => {
          const start = Date.now();
          while (Date.now() - start < timeout) {
            if (stripeFormRef && stripeFormRef.current && typeof stripeFormRef.current.confirmPayment === 'function') {
              return true;
            }
            // small delay
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 100));
          }
          return false;
        };

        const ready = await waitForStripeFormReady(7000);
        if (!ready) {
          alert('Payment form did not initialize in time. Please try again.');
          setPaymentFlowBusy(false);
          setSubmitting(false);
          return;
        }

        // Confirm payment via the StripePaymentForm imperative handle
        try {
          const payResult = await stripeFormRef.current.confirmPayment();

          if (!payResult || !payResult.success) {
            // Error reported by StripePaymentForm via onPaymentError already; stop submission
            setPaymentFlowBusy(false);
            setSubmitting(false);
            return;
          }

          if (payResult.paymentIntentId) {
            setPaymentIntentId(payResult.paymentIntentId);
            setPaymentStatus('succeeded');
          }
          // Done with the payment flow
          setPaymentFlowBusy(false);
        } catch (err) {
          alert('Payment confirmation failed. Please try again.');
          setPaymentFlowBusy(false);
          setSubmitting(false);
          return;
        }
      }

      // Ensure transfer fee/tax are present in request body. For non-card flows compute locally.
      try {
        const numericAmount = parseFloat(amountFrom.replace(/,/g, '')) || 0;
        if (!isCard) {
          // Compute fee client-side to show in UI and include in request.
          // Respect user perk: if they removed the fee, fee is 0.
          const localFee = removeFeeChecked ? 0 : ((!isNaN(numericAmount) && numericAmount > 0) ? FEE_CAD : 0);
          setTransferFee(localFee);
          setTransferTax(Number((localFee * 0.13).toFixed(2)));
        }
      } catch (pfErr) {
      }

      // Prepare request data
      // Compute canonical principal and VNĐ amountReceived using the finalExchangeRate
      const principalAmount = parseFloat(amountFrom.replace(/,/g, '')) || 0;
      const computedAmountReceived = Math.round(principalAmount * finalExchangeRate);

      const requestData = {
        userId: user?.id,
        userEmail: user?.email,
        userPhone: {
          countryCode: recipientPhoneCode,
          phoneNumber: recipientPhone
        },
        amountSent: parseFloat(amountFrom.replace(/,/g, '')),
        // amountReceived stored as canonical integer VNĐ computed from principal × finalExchangeRate
        amountReceived: computedAmountReceived,
        exchangeRate: finalExchangeRate,
        currencyFrom: 'CAD',
        currencyTo: 'VND',
        transferFee: transferFee, // populated from backend for card payments or computed locally for non-card
        transferTax: transferTax,
        sendingMethod: {
          type: transferMethod,
          // Include EFT details if EFT transfer
          ...(transferMethod === 'EFT' && {
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
        termAndServiceAccepted: agreedToTerms,
        // User-selected perks paid by points
        removeFee: removeFeeChecked,
        buffExchangeRate: buffExchangeChecked,
        // Include Stripe payment information if card payment
        ...(isCard && paymentIntentId && {
          paymentIntentId: paymentIntentId,
          paymentStatus: paymentStatus
        })
      };


      // Submit to backend (use relative path so Next.js rewrites/proxy forwards to backend)
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

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
      setRecipientReceivingMethod('bank');
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
      alert(`Failed to submit transfer: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const isCard = transferMethod === 'debit' || transferMethod === 'credit';
  const isBank = transferMethod === 'e-transfer' || transferMethod === 'EFT';
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
            {showKycReminder && (
              <div className="rate-modal-overlay" role="dialog" aria-modal="true" aria-label="KYC Reminder">
                <div className="rate-modal" role="document" onClick={(e) => e.stopPropagation()}>
                  <h3 className="rate-modal-title">{t('kyc.verificationRequired')}</h3>
                  <p className="rate-modal-p">
                    {t('kyc.verificationDescription')}
                  </p>
                  <p className="rate-modal-p">
                    <strong>{t('kyc.whyNeeded')}</strong><br/>
                    {t('kyc.securityReason')}
                  </p>
                  <div className="rate-modal-actions rate-modal-actions--row">
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => { setShowKycReminder(false); startKycVerification(); }}
                    >{t('kyc.startVerification')}</button>
                    <button 
                      className="btn btn-outline-secondary" 
                      type="button" 
                      onClick={() => setShowKycReminder(false)}
                    >
                      {t('kyc.remindLater')}
                    </button>
                  </div>
                </div>
              </div>
            )}
              {kycStatus !== 'verified' && (
                <div className="alert alert-warning d-flex align-items-center mb-4 mx-auto alert-maxwide" role="alert">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <div className="flex-grow-1">
                    <strong>{t('kyc.verifyIdentity')}</strong> {t('kyc.toSubmitTransfers')}
                  </div>
                  <button type="button" className="btn btn-sm btn-primary ms-3" onClick={startKycVerification}>{t('kyc.startVerifying')}</button>
                </div>
              )}
            
            {showRateModal && (
              <div className="rate-modal-overlay" role="dialog" aria-modal="true" aria-label="Exchange rate details" onClick={() => setShowRateModal(false)}>
                <div className="rate-modal" role="document" onClick={(e) => e.stopPropagation()}>
                  <h3 className="rate-modal-title">{t('transfers.rateCalculation')}</h3>
                  <p className="rate-modal-p">{t('transfers.competitiveRates')}</p>
                  <p className="rate-modal-p">{t('transfers.currentRate')}: <strong>{rateStr ? `${rateStr} VND` : (effectiveRate ? `${effectiveRate} VND` : '—')}</strong> {t('transfers.perCAD')}</p>
                  <p className="rate-modal-p">{t('transfers.noFeePromo')}</p>
                  <p className="rate-modal-p note">*{t('transfers.rateFluctuation')}</p>
                  <div className="rate-modal-actions">
                    <button className="btn" type="button" onClick={() => setShowRateModal(false)}>{t('common.gotIt')}</button>
                  </div>
                </div>
              </div>
            )}
            <section className="introduction lt-md2:!pt-[52px] lt-md2:!pb-[36px] lt-md2:!px-[20px]">
              <div className="intro-inner">
                <h1 className="trf">{t('transfers.title')}</h1>
                <p className="intro-lead">
                  {t('transfers.sendMoney')}
                  <img className="flag" src="/flags/Flag_of_Canada.png" alt="Canada" title="Canada" />
                  {' '}{t('transfers.toVietnam')}
                  <img className="flag" src="/flags/Flag_of_Vietnam.png" alt="Vietnam" title="Vietnam" />
                  {' '}{t('transfers.withTransparentRates')}
                </p>

                <div className="intro-cta lt-phone:flex-col lt-phone:items-stretch">
                  <a href="#exchange" className="btn primary">{t('home.hero.getStarted')}</a>
                </div>
              </div>
              <div className="intro-decor" aria-hidden />
            </section>

            <main className="main-content lt-md2:!pt-[46px] lt-md2:!pb-[36px] lt-md2:!px-[18px]">
              {/* Draft restored notification - only show if step > 1 */}
              {draftRestored && step > 1 && (
                <div className="alert alert-info d-flex align-items-center mb-4 mx-auto alert-maxwide" role="alert">
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
                    <strong>{t('transfers.welcomeBack')}</strong> {t('transfers.continueWhereLeft')}
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
                    if (step === 2 && subStep === 1) {
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
                    <span className="label">{t('transfers.step1')}</span>
                  </li>
                  <li className={`step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''} ${step === 2 && subStep === 1 ? 'half-completed' : ''}`}>
                    <span className="dot lt-phone:!w-[22px] lt-phone:!h-[22px] lt-phone:!text-[11px]">2</span>
                    <span className="label">{t('transfers.step2')}</span>
                  </li>
                  <li className={`step ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
                    <span className="dot lt-phone:!w-[22px] lt-phone:!h-[22px] lt-phone:!text-[11px]">3</span>
                    <span className="label">{t('transfers.step3')}</span>
                  </li>
                  <li className={`step ${step === 4 ? 'active' : ''}`}>
                    <span className="dot lt-phone:!w-[22px] lt-phone:!h-[22px] lt-phone:!text-[11px]">4</span>
                    <span className="label">{t('transfers.step4')}</span>
                  </li>
                </ol>
              </div>

              <div className="grid">
                {/* KYC Success Notification */}
                {kycSuccess && (
                  <div className="alert alert-success d-flex align-items-center mb-4 mx-auto alert-maxwide" role="alert">
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
                    <div className="flex-grow-1">
                      <strong>{t('kyc.identityVerified')}</strong> {t('kyc.verificationComplete')} {t('kyc.canSendMoney')}
                    </div>
                    <button 
                      type="button" 
                      className="btn-close ms-2" 
                      onClick={() => setKycSuccess(false)}
                      aria-label="Close"
                    ></button>
                  </div>
                )}
                
                {/* Step 1 */}
                {step === 1 && (
                  <section id="new-recipient" className="card exchange-form scroll-reveal">
                    <h2>{t('transfers.newRecipient')}<img className="flag" src="/flags/Flag_of_Vietnam.png" alt="Vietnam" title="Vietnam" />{' '}</h2>
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
                        {t('transfers.newRecipient')}
                      </button>
                    </form>
                  </section>
                )}

                {step === 1 && (
                  <section id="recent-transfer" className="card exchange-form scroll-reveal">
                    <h2>{t('transfers.recentTransfers')}</h2>
                    
                    {transactionsLoading ? (
                      <div className="text-center py-4">
                        <p className="text-medium-emphasis">{t('common.loading')}</p>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-medium-emphasis mb-3">
                          {t('transfers.noTransfersYet')}
                        </p>
                        <button 
                          type="button" 
                          className="btn primary" 
                          onClick={() => setStep(2)}
                        >
                          {t('transfers.startFirstTransfer')}
                        </button>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>{t('dashboard.date')}</th>
                              <th>{t('transfers.recipient')}</th>
                              <th>{t('transfers.amountSent')}</th>
                              <th>{t('transfers.amountReceived')}</th>
                              <th>{t('dashboard.status')}</th>
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
                              {t('transfers.viewAllTransfers')}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {/* Step 2.1 - Payment Method */}
                {step === 2 && subStep === 0 && (
                  <>
                    <h2>{t('transfers.selectPaymentMethod')}</h2>

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
                          <h3>{t('transfers.proceedViaCard')}</h3>
                          <div className="dropdown-header-details">
                            <span className="delivery-info">{t('transfers.fastestDelivery')}</span>
                            {displayRateFormatted && (
                              <span className="exchange-rate">1 CAD = {displayRateFormatted} VND</span>
                            )}
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
                                onChange={(e) => setTransferMethod(e.target.value)}
                              />
                              <div className="radio-content">
                                <svg className="payment-icon" width="32" height="24" viewBox="0 0 32 24" fill="none">
                                  <rect x="1" y="3" width="30" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                  <rect x="1" y="7" width="30" height="4" fill="currentColor" />
                                </svg>
                                <span className="payment-label">{t('transfers.debitCard')}</span>
                              </div>
                            </label>
                            <label className="radio payment-radio">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="credit"
                                checked={transferMethod === 'credit'}
                                onChange={(e) => setTransferMethod(e.target.value)}
                              />
                              <div className="radio-content">
                                <svg className="payment-icon" width="32" height="24" viewBox="0 0 32 24" fill="none">
                                  <rect x="1" y="3" width="30" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                  <rect x="1" y="7" width="30" height="4" fill="currentColor" />
                                </svg>
                                <span className="payment-label">{t('transfers.creditCard')}</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {isCard && (
                          <div className="form-group delivery-notice">
                            <p className="notice-text">
                              <strong>{t('transfers.expectedDelivery')}:</strong>{' '}
                              {transferMethod === 'e-transfer' || transferMethod === 'debit' || transferMethod === 'credit'
                                ? t('transfers.within24Hours')
                                : t('transfers.businessDays')}
                            </p>
                            <p className="notice-subtext">
                              {t('transfers.processingNote')}
                            </p>
                          </div>
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
                            <span className="best-value-badge">{t('transfers.bestValue')}</span>
                            <h3>{t('transfers.proceedViaBank')}</h3>
                          </div>
                          {baseRateFormatted && (
                            <span className="exchange-rate">1 CAD = {baseRateFormatted} VND</span>
                          )}
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
                                <span className="payment-label">{t('transfers.eTransfer')}</span>
                              </div>
                            </label>
                            <label className="radio payment-radio">
                              <input
                                type="radio"
                                name="bankMethod"
                                value="EFT"
                                checked={transferMethod === 'EFT'}
                                onChange={(e)=>setTransferMethod(e.target.value)}
                              />
                              <div className="radio-content">
                                <svg className="payment-icon" width="32" height="24" viewBox="0 0 32 24" fill="none">
                                  <rect x="2" y="4" width="28" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                                  <circle cx="22" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                <span className="payment-label">{t('transfers.eft')}</span><strong>{t('transfers.recommended')}</strong>
                              </div>
                            </label>
                          </div>
                        </div>

                        {isBank && (
                          <>
                            <div className="form-group">
                              <label>{t('transfers.userEmail')}:</label>
                              <input type="email" value={user?.email || ''} disabled />
                            </div>

                            {transferMethod === 'EFT' && (
                              <div className="form-group two-col eft lt-phone:!grid-cols-1">
                                <div>
                                  <label>{t('transfers.accountNumber')}</label>
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
                                  <label>{t('transfers.transitNumber')}</label>
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
                                  <label>{t('transfers.institutionNumber')}</label>
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

                            {isBank && (
                              <div className="form-group delivery-notice">
                                <p className="notice-text">
                                  <strong>{t('transfers.expectedDelivery')}:</strong> {transferMethod === 'e-transfer' || transferMethod === 'debit' || transferMethod === 'credit' ? t('transfers.within24Hours') : t('transfers.businessDays')}
                                </p>
                                <p className="notice-subtext">
                                  {t('transfers.processingNote')}
                                </p>
                              </div>
                            )}

                          </>
                        )}

                      </form>
                    </section>
                  </>
                )}
                {step === 2 && subStep === 0 && (
                  <div className="step-actions">
                    <button 
                      type="button" 
                      className="btn primary w-full" 
                      onClick={() => setSubStep(1)}
                    >
                      {t('transfers.continueToAmount')}
                    </button>
                  </div>
                )}

                {/* Step 2.2 - Amount */}
                {step === 2 && subStep === 1 && (
                  <section id="exchange" className="card exchange-form scroll-reveal">
                    <form id="moneyExchangeForm" onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
                      <div className="form-group">
                        <label htmlFor="amountFrom">{t('transfers.youSend')}:</label>
                          {rate && (
                            <span className="label-inline-info">

                              1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate)} VND <strong>{t('transfers.bestRate')}</strong>
                              <button
                                type="button"
                                aria-label="Rate details"
                                title="Get a quote!"
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
                            <span className="label-inline-info">
                              {t('transfers.yourRate')}: 1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(effectiveRate)} VND
                            </span>
                          )}
                        <div className="currency-input" role="group" aria-label="You send amount in CAD">
                          <input
                            type="number"
                            id="amountFrom"
                            name="amountFrom"
                            placeholder={t('transfers.enterAmount')}
                            min={20}
                            max={9999}
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
                      <div className="form-group">
                        <label htmlFor="amountTo">
                          {t('transfers.theyReceive')}:
                        </label>
                        <div className="currency-input" role="group" aria-label="They receive amount in VND">
                          <input
                            type="text"
                            id="amountTo"
                            name="amountTo"
                            placeholder={t('transfers.enterVNDAmount')}
                            value={amountTo}
                            inputMode="numeric"
                            pattern="[0-9,]*"
                            aria-label="They receive"
                            onChange={(e) => formatCurrencyInput(e as unknown as React.ChangeEvent<HTMLInputElement>, 'to')}
                            onInput={(e) => formatCurrencyInput(e as unknown as React.ChangeEvent<HTMLInputElement>, 'to')}
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
                        // Prefer canonical fee from backend (transferFee). If not available yet,
                        // estimate locally using same business rule (charge $1.50 when amount < threshold).
                        return (
                          <div className="fee-mini" role="note">{t('transfers.transferFee')}: <strong>${FEE_CAD.toFixed(2)}</strong> CAD</div>
                        );
                      })()}
                      <button type="submit" className="btn primary w-full">{t('transfers.continueToReceiverDetails')}</button>
                    </form>
                  </section>
                )}



                {/* Step 3 - Receiver Bank Details */}
                {step === 3 && (
                  <>
                    <h2>{t('transfers.receiverBankDetails')}</h2>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      // Check wallet limits before proceeding
                      const vndAmount = parseFloat((amountTo || '').replace(/,/g, ''));
                      const momoLimit = 10000000;
                      const zaloPayLimit = 5000000;
                      const isOverLimit = 
                        (recipientReceivingMethod === 'momo' && vndAmount > momoLimit) ||
                        (recipientReceivingMethod === 'zalopay' && vndAmount > zaloPayLimit);

                      if (isOverLimit) {
                        const limit = recipientReceivingMethod === 'momo' 
                          ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(momoLimit)
                          : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(zaloPayLimit);
                        const walletName = recipientReceivingMethod === 'momo' ? t('transfers.momoWallet') : t('transfers.zalopayWallet');
                        alert(`${t('transfers.amountExceedsLimit')} ${walletName} ${t('transfers.limitOf')} ${limit} VND. ${t('transfers.pleaseReduce')}`);
                        return;
                      }

                      // If user selected bank as receiving method, ensure a bank is chosen
                      if (recipientReceivingMethod === 'bank') {
                        if (!selectedBank) {
                          alert('Please select a bank before continuing.');
                          return;
                        }
                        if (selectedBank === 'Others' && !customBankName) {
                          alert('Please enter a correct bank name before continuing.');
                          return;
                        }
                      }

                      // All validations passed, proceed to next step
                      setStep(4);
                    }}>
                    <section id="receiver" className="card transfer-details scroll-reveal">
                      {displayRateFormatted && (
                        <div className="dropdown-header-details receiver-rate">
                          { (transferMethod === 'debit' || transferMethod === 'credit') ? (
                            displayRateFormatted ? <span className="exchange-rate">1 CAD = {displayRateFormatted} VND</span> : null
                          ) : (
                            baseRateFormatted ? <span className="exchange-rate">1 CAD = {baseRateFormatted} VND</span> : null
                          ) }
                        </div>
                      )}
                      <div className="dropdown-content expanded">

                        <div className="form-group">
                          <label>{t('transfers.receivingMethod')}</label>
                          <div className={`custom-bank-select ${receivingMethodDropdownOpen ? 'dropdown-open' : ''}`}>
                            <button
                              type="button"
                              className="bank-select-trigger"
                              onClick={() => setReceivingMethodDropdownOpen(!receivingMethodDropdownOpen)}
                            >
                              {recipientReceivingMethod ? (
                                <div className="bank-option-display">
                                  <img 
                                    src={receivingMethods.find(m => m.value === recipientReceivingMethod)?.icon} 
                                    alt=""
                                    className="bank-icon"
                                  />
                                  <span>{receivingMethods.find(m => m.value === recipientReceivingMethod)?.label}</span>
                                </div>
                              ) : (
                                <span className="placeholder">{t('transfers.selectReceivingMethod')}</span>
                              )}
                              <svg className="dropdown-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none">
                                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            
                            {receivingMethodDropdownOpen && (
                              <div className="bank-options-list">
                                {receivingMethods.map(method => (
                                  <button
                                    key={method.value}
                                    type="button"
                                    className={`bank-option ${recipientReceivingMethod === method.value ? 'selected' : ''}`}
                                    onClick={() => {
                                      setRecipientReceivingMethod(method.value);
                                      setReceivingMethodDropdownOpen(false);
                                    }}
                                  >
                                    <img src={method.icon} alt="" className="bank-icon" />
                                    <span>{method.label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <input type="hidden" name="receivingMethod" value={recipientReceivingMethod} required />
                        </div>

                        <div className="form-group">
                          <label>{t('transfers.recipientFullName')}</label>
                          <input 
                            type="text" 
                            name="receiverName" 
                            placeholder={t('transfers.recipientFullName')} 
                            value={recipientName}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Only allow letters (A-Z, a-z) and spaces, max 30 characters
                              const filtered = value.replace(/[^A-Za-z\s]/g, '');
                              if (filtered.length <= 30) {
                                setRecipientName(filtered);
                              }
                            }}
                            maxLength={30}
                            pattern="[A-Za-z\s]*"
                            required 
                          />
                        </div>

                        {(() => {
                          const vndAmount = parseFloat((amountTo || '').replace(/,/g, ''));
                          const momoLimit = 10000000; // 10M VND
                          const zaloPayLimit = 5000000; // 5M VND
                          const isOverLimit = 
                            (recipientReceivingMethod === 'momo' && vndAmount > momoLimit) ||
                            (recipientReceivingMethod === 'zalopay' && vndAmount > zaloPayLimit);
                          
                          if (isOverLimit) {
                            const limit = recipientReceivingMethod === 'momo' 
                              ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(momoLimit)
                              : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(zaloPayLimit);
                            const walletName = recipientReceivingMethod === 'momo' ? t('transfers.momoWallet') : t('transfers.zalopayWallet');
                            
                            return (
                              <div className="alert alert-danger d-flex align-items-center mt-3" role="alert">
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
                                  <line x1="15" y1="9" x2="9" y2="15"></line>
                                  <line x1="9" y1="9" x2="15" y2="15"></line>
                                </svg>
                                <div>
                                  <strong>{t('transfers.amountExceedsLimit')} {walletName} {t('transfers.limit')}!</strong>
                                  <p className="mb-0 small">{t('transfers.limitedAmount')} {walletName} {t('transfers.is')} {limit} VND.</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        <div className="form-group">
                          <label>
                            Tel: {recipientReceivingMethod === 'bank' ? t('transfers.phoneExample') : 
                             recipientReceivingMethod === 'momo' ? t('transfers.phoneExample') : 
                             t('transfers.phoneExample')}
                          </label>
                          <div className="phone-row">
                            <select 
                              className="code themed" 
                              value={recipientPhoneCode} 
                              onChange={(e) => setRecipientPhoneCode(e.target.value)}
                              disabled={(() => {
                                const vndAmount = parseFloat((amountTo || '').replace(/,/g, ''));
                                return (
                                  (recipientReceivingMethod === 'momo' && vndAmount > 10000000) ||
                                  (recipientReceivingMethod === 'zalopay' && vndAmount > 5000000)
                                );
                              })()}
                            >
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
                              placeholder={
                                recipientReceivingMethod === 'bank' ? t('transfers.recipientPhoneNumber') :
                                recipientReceivingMethod === 'momo' ? t('transfers.momoPhoneNumber') :
                                t('transfers.zalopayPhoneNumber')
                              }
                              maxLength={10}
                              pattern="[0-9]{10}"
                              required
                              disabled={(() => {
                                const vndAmount = parseFloat((amountTo || '').replace(/,/g, ''));
                                return (
                                  (recipientReceivingMethod === 'momo' && vndAmount > 10000000) ||
                                  (recipientReceivingMethod === 'zalopay' && vndAmount > 5000000)
                                );
                              })()}
                            />
                          </div>
                          <input type="hidden" name="receiverPhoneNumber" value={`${recipientPhoneCode}${recipientPhone}`} />
                          <p>{t('transfers.enterCorrectPhone')}</p>
                        </div>

                        {recipientReceivingMethod === 'bank' && (
                          <div className="form-group">
                            <label>{t('transfers.bank')}:</label>
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
                                  <span className="placeholder">{t('transfers.selectBank')}</span>
                                )}
                                <svg className="dropdown-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none">
                                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            
                            {bankDropdownOpen && (
                              <div className="bank-options-list">
                                <div className="bank-option-placeholder">{t('transfers.selectBank')}</div>
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
                        )}

                        {/* Show custom bank name input if "Others" is selected */}
                        {recipientReceivingMethod === 'bank' && selectedBank === 'Others' && (
                          <div className="form-group">
                            <label>{t('transfers.bankName')}</label>
                            <input 
                              type="text" 
                              name="customBankName" 
                              placeholder={t('transfers.enterBankName')} 
                              value={customBankName}
                              onChange={(e) => setCustomBankName(e.target.value)}
                              required 
                            />
                          </div>
                        )}

                        {recipientReceivingMethod === 'bank' && (
                          <div className="form-group">
                            <label>{t('transfers.bankAccountNumber')}</label>
                            <input 
                              type="text" 
                              name="receiverBankAccount" 
                              placeholder="1234 5678 9012 345"
                              value={recipientAccountNumber}
                            onChange={(e) => {
                              // Remove all non-digit characters
                              const value = e.target.value.replace(/\D/g, '');
                              // Limit to 15 digits
                              if (value.length <= 15) {
                                // Format with space every 4 digits
                                const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                                setRecipientAccountNumber(formatted);
                              }
                            }}
                            maxLength={18}
                            inputMode="numeric"
                            pattern="[0-9\s]*"
                            required 
                          />
                          <small className="small-muted">{t('transfers.maxDigits')}</small>
                          </div>
                        )}

                        <div className="form-group">
                          <label>{t('transfers.content')}</label>
                          <input 
                            type="text" 
                            name="transferContent" 
                            placeholder={t('transfers.messageToRecipient')} 
                            value={transferContent}
                            onChange={(e) => setTransferContent(e.target.value)}
                          />
                        </div>
                      </div>
                    </section>

                    <div className="step-actions">
                      <button 
                        type="submit" 
                        className="btn primary w-full"
                      >
                        {t('transfers.continueToReview')}
                      </button>
                    </div>
                    </form>
                  </>
                )}

                {step === 4 && (
                  <section id="review" className="card scroll-reveal">
                    <h2>{t('transfers.reviewSubmit')}</h2>
                    <div className="review-grid">
                      <div><strong>{t('transfers.email')}:</strong> {user?.email || '-'}</div>
                      <div><strong>{t('transfers.amount')}:</strong> {(((parseFloat(amountFrom || '0') || 0) + (removeFeeChecked ? 0 : FEE_CAD))).toFixed(2)} CAD</div>
                      <div className="fee-review">
                        <span className="fee-label">{t('transfers.fee')}</span>
                        <span className={`fee-amount value ${removeFeeChecked ? 'zero' : ''}`}>${(removeFeeChecked ? 0 : FEE_CAD).toFixed(2)} CAD</span>
                        <span className="fee-badge charged">{t('transfers.charged')}</span>
                        <span className="fee-note">{t('transfers.feeNote')}</span>
                      </div>
                      {(() => {
                        const val = parseFloat(amountFrom);
                        if (!isNaN(val) && typeof effectiveRate === 'number') {
                          const principal = Math.max(val, 0);
                          const appliedRate = (effectiveRate || 0) + (buffExchangeChecked ? 100 : 0);
                          // Actual VNĐ received is based on the principal (fee is charged on top)
                          const vnd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(principal * appliedRate);
                          const rateFormatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(appliedRate);
                          return (
                            <div>
                              <strong>{t('transfers.theyReceive')}:</strong> {vnd} VNĐ{' '}
                              <span className="fee-note">(${principal.toFixed(2)} CAD × {rateFormatted})</span>
                            </div>
                          );
                        }
                        return <div><strong>{t('transfers.theyReceive')}:</strong> {amountTo || '0'} VNĐ</div>;
                      })()}
                      <div><strong>{t('transfers.method')}:</strong> {transferMethod}</div>
                      <div><strong>{t('transfers.recipient')}:</strong> {recipientName || '-'}</div>
                      <div><strong>{t('transfers.bank')}:</strong> {selectedBank === 'Others' ? customBankName || 'Others' : selectedBank}</div>
                      <div><strong>{t('transfers.accountNumber')}:</strong> {recipientAccountNumber || '-'}</div>
                    </div>
                    <div className="form-group delivery-notice">
                      <p className="notice-text">
                        <strong>{t('transfers.expectedDelivery')}:</strong> {transferMethod === 'e-transfer' || transferMethod === 'debit' || transferMethod === 'credit' ? t('transfers.within24Hours') : t('transfers.businessDays')}
                      </p>
                      <p className="notice-subtext">
                        {t('transfers.processingNote')}
                      </p>
                    </div>
                    {paymentFlowBusy && (
                      <div className="payment-overlay">
                        <div className="payment-overlay-inner">
                          <div className="spinner" aria-hidden />
                          <div className="payment-overlay-text">
                            {t('transfers.processingPayment')}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Stripe Payment Section - Only show for card payments and KYC verified users */}
                    {isCard && kycStatus === 'verified' && (
                      <div className="payment-section-review">
                        <h3>{t('transfers.payment')}</h3>
                        {clientSecret ? (
                          <div className="stripe-payment-wrapper">
                            <Elements stripe={stripePromise} options={{ clientSecret }}>
                              <StripePaymentForm
                                ref={stripeFormRef}
                                onPaymentSuccess={handlePaymentSuccess}
                                onPaymentError={handlePaymentError}
                                isProcessing={paymentProcessing}
                                setIsProcessing={setPaymentProcessing}
                              />
                            </Elements>
                          </div>
                        ) : (
                          <div className="form-group">
                            <p className="text-center">
                              {paymentProcessing ? t('transfers.initializingPayment') : t('transfers.loadingPaymentForm')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="form-group checkbox-row">
                      <div className="points-row">
                        <div className="points-header">
                          <strong>{t('transfers.yourPoint')}:</strong>
                          <span className="points-count">{userPoints}</span>
                        </div>
                        <div className="perks-list">
                          <label className={`perk-label ${!removeFeeChecked && ((removeFeeChecked ? 1 : 0) + (buffExchangeChecked ? 1 : 0) >= (userPoints || 0)) ? 'disabled' : ''}`}>
                            <input
                              type="checkbox"
                              checked={removeFeeChecked}
                              disabled={!removeFeeChecked && ((removeFeeChecked ? 1 : 0) + (buffExchangeChecked ? 1 : 0) >= (userPoints || 0))}
                              onChange={(e) => {
                                const willCheck = e.target.checked;
                                const currentSelected = (removeFeeChecked ? 1 : 0) + (buffExchangeChecked ? 1 : 0);
                                if (willCheck && currentSelected + 1 > (userPoints || 0)) {
                                  alert('Insufficient points for promotion use');
                                  return;
                                }
                                setRemoveFeeChecked(willCheck);
                              }}
                            />
                            <span className="perk-desc">Remove transfer fee (1 point)</span>
                          </label>

                          <label className={`perk-label ${!buffExchangeChecked && ((removeFeeChecked ? 1 : 0) + (buffExchangeChecked ? 1 : 0) >= (userPoints || 0)) ? 'disabled' : ''}`}>
                            <input
                              type="checkbox"
                              checked={buffExchangeChecked}
                              disabled={!buffExchangeChecked && ((removeFeeChecked ? 1 : 0) + (buffExchangeChecked ? 1 : 0) >= (userPoints || 0))}
                              onChange={(e) => {
                                const willCheck = e.target.checked;
                                const currentSelected = (removeFeeChecked ? 1 : 0) + (buffExchangeChecked ? 1 : 0);
                                if (willCheck && currentSelected + 1 > (userPoints || 0)) {
                                  alert('Insufficient points for promotion use');
                                  return;
                                }
                                setBuffExchangeChecked(willCheck);
                              }}
                            />
                            <span className="perk-desc">Add +100 VND to exchange rate (1 point)</span>
                          </label>
                        </div>
                      </div>
                      <label className="checkbox">
                        <input 
                          type="checkbox" 
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          required
                        />
                        <span>
                          <a href="/general/terms-and-conditions" target="_blank" rel="noopener noreferrer">{t('termsAndConditions.title')}</a> {t('transfers.readAgreed')}
                        </span>
                      </label>
                    </div>
                    
                    <div className="review-actions">
                      <button type="button" className="btn ghost" onClick={() => setStep(3)}>{t('transfers.back')}</button>
                      <form onSubmit={onTransferSubmit}>
                        <button 
                          type="submit" 
                          className={`btn primary ${kycStatus === 'verified' ? 'kyc-verified-btn' : ''}`}
                          disabled={submitting || !agreedToTerms}
                        >
                          {kycStatus === 'verified' && (
                            <svg 
                              className="me-2 icon-inline" 
                              width="20" 
                              height="20" 
                              viewBox="0 0 24 24" 
                              fill="currentColor"
                            >
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          )}
                          {submitting ? t('transfers.submitting') : kycStatus === 'verified' ? t('transfers.submitTransferVerified') : t('transfers.submitTransfer')}
                        </button>
                      </form>
                    </div>
                  </section>
                )}
              </div>

              <section className="features scroll-reveal">
                <h3>{t('transfers.whyChooseUs')}</h3>
                <div className="features-grid">
                  <div className="feature card">
                    <h4>{t('transfers.lowFees')}</h4>
                    <p>{t('transfers.lowFeesDesc')}</p>
                  </div>
                  <div className="feature card">
                    <h4>{t('transfers.fastDelivery')}</h4>

                  </div>
                  <div className="feature card">
                    <h4>{t('transfers.secure')}</h4>
                    <p>{t('transfers.secureDesc')}</p>
                  </div>
                </div>
              </section>

              <section className="testimonials scroll-reveal">
                <h3>{t('transfers.testimonials')}</h3>
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
