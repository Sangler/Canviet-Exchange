import React, { useState, useEffect, useRef, useMemo } from 'react';
import RequireAuth from '../components/RequireAuth';
import AppSidebar from '../components/AppSidebar';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { useAuth } from '../context/AuthContext';
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
  // Transaction history
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(true);
  
  // KYC success notification
  const [kycSuccess, setKycSuccess] = useState(false);
  
  // Bank selection
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [customBankName, setCustomBankName] = useState<string>('');
  const [bankDropdownOpen, setBankDropdownOpen] = useState<boolean>(false);
  
  const vietnameseBanks = [
    { value: 'Vietcombank', label: 'Vietcombank', icon: '/bank-icons/vietcombank.png' },
    { value: 'Agribank', label: 'Agribank', icon: '/bank-icons/agribank.png' },
    { value: 'Techcombank', label: 'Techcombank', icon: '/bank-icons/techcombank.png' },
    { value: 'MB', label: 'MB Bank', icon: '/bank-icons/mb.png' },
    { value: 'ACB', label: 'ACB', icon: '/bank-icons/acb.png' },
    { value: 'Vietinbank', label: 'VietinBank', icon: '/bank-icons/vietinbank.png' },
    { value: 'Shinhan', label: 'Shinhan Bank', icon: '/bank-icons/shinhan.png' },
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

  // Fetch KYC status on mount
  useEffect(() => {
    async function fetchKycStatus() {
      if (!user || !token) return;
      
      try {
        const response = await fetch('/api/kyc/status', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.ok) {
          setKycStatus(data.kycStatus || 'unverified');
        }
      } catch (error) {
        console.error('Error fetching KYC status:', error);
      }
    }
    
    fetchKycStatus();
  }, [user, token]);

  const [amountFrom, setAmountFrom] = useState<string>('');
  const [amountTo, setAmountTo] = useState<string>('');
  const [activeInput, setActiveInput] = useState<'from' | 'to'>('from'); // Track which input user is editing
  const lastComputedToRef = useRef<number>(NaN);
  const lastComputedFromRef = useRef<number>(NaN);
  const isUpdatingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
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

  // Check for KYC success URL parameter
  useEffect(() => {
    if (router.query.kycSuccess === 'true') {
      setKycSuccess(true);
      
      // Remove the URL parameter without page reload
      const { kycSuccess: _, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
      
      // Auto-dismiss after 10 seconds
      setTimeout(() => setKycSuccess(false), 10000);
    }
  }, [router.query.kycSuccess]);

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

  // Show KYC reminder when user reaches Step 4 (Review) if not verified
  useEffect(() => {
    async function checkKycForReminder() {
      if (step !== 4 || !user || !token) return;
      
      try {
        const response = await fetch('/api/kyc/status', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.ok && data.kycStatus !== 'verified') {
          setShowKycReminder(true);
        }
      } catch (error) {
        console.error('Error checking KYC status:', error);
      }
    }
    
    checkKycForReminder();
  }, [step, user, token]);

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
        console.debug('Failed to parse breakdown from create-intent', bErr);
      }
      return { clientSecret: data.clientSecret, paymentIntentId: data.paymentIntentId };
    } catch (error) {
      console.error('Payment intent creation error:', error);
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
        // createPaymentIntent already handles user-facing errors; log for debugging
        console.debug('createPaymentIntent failed on step 4 mount', err);
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

      // If KYC not verified, create verification request and redirect
      if (kycData.kycStatus !== 'verified') {
        const confirmVerify = window.confirm(
          'You need to complete identity verification (KYC) before submitting transfers.\n\n' +
          'Click OK to start the verification process.'
        );
        
        if (confirmVerify) {
          try {
            // Save current transfer form state to localStorage before redirecting to KYC
            const transferDraft = {
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
              agreedToTerms,
              savedAt: new Date().toISOString(),
              pendingKyc: true // Flag to indicate this draft is waiting for KYC completion
            };
            localStorage.setItem('pendingTransferDraft', JSON.stringify(transferDraft));
            
            // Create new verification request
            const verifyResponse = await fetch('/api/kyc/create-verification', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok && verifyData.verificationUrl) {
              // Open Shufti Pro verification in new tab
              window.open(verifyData.verificationUrl, '_blank');
              alert('Please complete the verification process in the new window. Once completed, you can submit your transfer.');
            } else {
              alert(verifyData.message || 'Failed to create verification request. Please try again.');
            }
          } catch (verifyError) {
            console.error('Verification creation error:', verifyError);
            alert('Failed to start verification process. Please try again.');
          }
        }
        
        setSubmitting(false);
        return;
      }

      // Ensure we have a valid exchange rate
      const finalExchangeRate = effectiveRate || rate || 0;
      
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
          console.error('Payment confirmation error:', err);
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
          // Compute fee client-side to show in UI and include in request
          const localFee = (!isNaN(numericAmount) && numericAmount > 0 && numericAmount < FEE_THRESHOLD) ? FEE_CAD : 0;
          setTransferFee(localFee);
          setTransferTax(Number((localFee * 0.13).toFixed(2)));
        }
      } catch (pfErr) {
        console.debug('Failed to compute local fee/tax before submit', pfErr);
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
                  <h3 className="rate-modal-title">⚠️ Identity Verification Required</h3>
                  <p className="rate-modal-p">
                    To transfer money abroad, you need to complete a one-time process identity verification (KYC). 
                    that takes 2-5 minutes.
                  </p>
                  <p className="rate-modal-p">
                    <strong>Why do we need this?</strong><br/>
                    This process helps us keep your transfers secure and comply with countries regulations.
                  </p>
                  <div className="rate-modal-actions" style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn btn-primary" 
                      type="button" 
                      onClick={async () => {
                        setShowKycReminder(false);
                        try {
                          const response = await fetch('/api/kyc/create-verification', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            }
                          });
                          const data = await response.json();
                          if (response.ok && data.verificationUrl) {
                            window.open(data.verificationUrl, '_blank');
                          } else {
                            alert('Failed to start verification. Please try again.');
                          }
                        } catch (error) {
                          console.error('Verification error:', error);
                          alert('Failed to start verification. Please try again.');
                        }
                      }}
                    >
                      Start Verification
                    </button>
                    <button 
                      className="btn btn-outline-secondary" 
                      type="button" 
                      onClick={() => setShowKycReminder(false)}
                    >
                      Remind Me Later
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {showRateModal && (
              <div className="rate-modal-overlay" role="dialog" aria-modal="true" aria-label="Exchange rate details" onClick={() => setShowRateModal(false)}>
                <div className="rate-modal" role="document" onClick={(e) => e.stopPropagation()}>
                  <h3 className="rate-modal-title">How we calculate your exchange rate</h3>
                  <p className="rate-modal-p">We offer competitive exchange rates with a transparent margin applied to the market rate.</p>
                  <p className="rate-modal-p">Your current exchange rate: <strong>{rateStr ? `${rateStr} VND` : (effectiveRate ? `${effectiveRate} VND` : '—')}</strong> per CAD</p>
                  <p className="rate-modal-p">Send $1,000+ CAD to enjoy <strong>no transfer fee</strong>!</p>
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
                    <strong>Welcome back!</strong> Continue where you are left off!
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
                    <span className="label">Recipient</span>
                  </li>
                  <li className={`step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''} ${step === 2 && subStep === 1 ? 'half-completed' : ''}`}>
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
                      <strong>Identity Verified!</strong> Your KYC verification is complete. Please review your transfer details and submit.
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

                {/* Step 2.1 - Payment Method */}
                {step === 2 && subStep === 0 && (
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
                          <h3>Proceed via Card</h3>
                          <div className="dropdown-header-details">
                            <span className="delivery-info">Fastest Delivery</span>
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
                                <span className="payment-label">Debit card</span>
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
                                <span className="payment-label">Credit card</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {isCard && (
                          <div className="form-group delivery-notice">
                            <p className="notice-text">
                              <strong>Expected delivery:</strong>{' '}
                              {transferMethod === 'e-transfer' || transferMethod === 'debit' || transferMethod === 'credit'
                                ? 'Within 24 hours'
                                : '5-7 business days'}
                            </p>
                            <p className="notice-subtext">
                              Note: Processing speed may vary based on your payment method, delivery method, bank's policies and other factors such as third-party delays.
                              Consider that your transfer might take longer than expected—this is normal!
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
                            <span className="best-value-badge">BEST VALUE</span>
                            <h3>Proceed via bank</h3>
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
                                <span className="payment-label">E-Transfer</span>
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
                                <span className="payment-label">EFT</span><strong>RECOMMENDED</strong>
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

                            {transferMethod === 'EFT' && (
                              <div className="form-group two-col eft lt-phone:!grid-cols-1">
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

                            {isBank && (
                              <div className="form-group delivery-notice">
                                <p className="notice-text">
                                  <strong>Expected delivery:</strong> {transferMethod === 'e-transfer' || transferMethod === 'debit' || transferMethod === 'credit' ? 'Within 24 hours' : '5-7 business days'}
                                </p>
                                <p className="notice-subtext">
                                  Note: Processing speed may vary based on your payment method, delivery method, bank's policies and other factors such as third-party delays. 
                                  Consider that your transfer might take longer than expected—this is normal!
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
                      Continue to Amount
                    </button>
                  </div>
                )}

                {/* Step 2.2 - Amount */}
                {step === 2 && subStep === 1 && (
                  <section id="exchange" className="card exchange-form scroll-reveal">
                    <form id="moneyExchangeForm" onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
                      <div className="form-group">
                        <label htmlFor="amountFrom">YOU SEND:</label>
                          {rate && (
                            <span className="label-inline-info">

                              1 CAD = {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rate)} VND <strong>Best Rate</strong>
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
                          THEY RECEIVE:
                        </label>
                        <div className="currency-input" role="group" aria-label="They receive amount in VND">
                          <input
                            type="text"
                            id="amountTo"
                            name="amountTo"
                            placeholder="Enter VND amount"
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
                      {/* Transfer fee notification */}
                      {(() => {
                        const val = parseFloat(amountFrom);
                        // Prefer canonical fee from backend (transferFee). If not available yet,
                        // estimate locally using same business rule (charge $1.50 when amount < threshold).
                        const estimatedFee = (typeof transferFee === 'number' && transferFee >= 0) ? transferFee : ((!isNaN(val) && val >= FEE_THRESHOLD) ? 0 : FEE_CAD);

                        // Show congratulations message when estimated fee is zero
                        if (estimatedFee === 0) {
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

                        // Show fee warning and upsell by default or when estimated fee is non-zero
                        return (
                          <>
                            <div className="fee-mini" role="note">Transfer fee: <strong>${estimatedFee.toFixed(2)}</strong> CAD</div>
                            <div className="upsell-row" role="note" aria-live="polite">
                              <div className="upsell-text">
                                Tip: Send <strong>${FEE_THRESHOLD.toLocaleString()}</strong> CAD to enjoy no transfer fee.
                              </div>
                              <button type="button" className="upsell-btn" onClick={() => setAmountFrom(String(FEE_THRESHOLD))}>GET GOOD RATE</button>
                            </div>
                          </>
                        );
                      })()}
                      <button type="submit" className="btn primary w-full">Continue to Receiver Details</button>
                    </form>
                  </section>
                )}



                {/* Step 3 - Receiver Bank Details */}
                {step === 3 && (
                  <>
                    <h2>Receiver Bank Details</h2>

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

                {step === 3 && (
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
                        const fee = (typeof transferFee === 'number' && transferFee >= 0)
                          ? transferFee
                          : (val > 0 && val < FEE_THRESHOLD ? FEE_CAD : 0);
                        const isApplied = fee === 0; // Show "Applied" when fee is 0.00
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
                          const fee = (typeof transferFee === 'number' && transferFee >= 0) ? transferFee : (val > 0 && val < FEE_THRESHOLD ? FEE_CAD : 0);
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
                    <div className="form-group delivery-notice">
                      <p className="notice-text">
                        <strong>Expected delivery:</strong> {transferMethod === 'e-transfer' || transferMethod === 'debit' || transferMethod === 'credit' ? 'Within 24 hours' : '5-7 business days'}
                      </p>
                      <p className="notice-subtext">
                        Note: Processing speed may vary based on your payment method, delivery method, bank's policies and other factors such as third-party delays. 
                        Consider that your transfer might take longer than expected—this is normal!
                      </p>
                    </div>
                    {paymentFlowBusy && (
                      <div className="payment-overlay">
                        <div className="payment-overlay-inner">
                          <div className="spinner" aria-hidden />
                          <div className="payment-overlay-text">
                            Processing payment — please do not close this window.
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Stripe Payment Section - Only show for card payments and KYC verified users */}
                    {isCard && kycStatus === 'verified' && (
                      <div className="payment-section-review">
                        <h3>Payment</h3>
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
                              {paymentProcessing ? 'Initializing secure payment...' : 'Loading payment form...'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="form-group checkbox-row">
                      <label className="checkbox">
                        <input 
                          type="checkbox" 
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          required
                        />
                        <span>
                          <a href="/general/terms-and-conditions" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> Read & Agreed!
                        </span>
                      </label>
                    </div>
                    
                    <div className="review-actions">
                      <button type="button" className="btn ghost" onClick={() => setStep(3)}>Back</button>
                      <form onSubmit={onTransferSubmit}>
                        <button 
                          type="submit" 
                          className={`btn primary ${kycStatus === 'verified' ? 'kyc-verified-btn' : ''}`}
                          disabled={submitting || !agreedToTerms}
                        >
                          {kycStatus === 'verified' && (
                            <svg 
                              className="me-2" 
                              width="20" 
                              height="20" 
                              viewBox="0 0 24 24" 
                              fill="currentColor"
                              style={{ display: 'inline-block', verticalAlign: 'middle' }}
                            >
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          )}
                          {submitting ? 'Submitting…' : kycStatus === 'verified' ? 'Submit Transfer (Verified)' : 'Submit Transfer'}
                        </button>
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
