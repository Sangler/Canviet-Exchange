import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import AppSidebar from '../../../components/AppSidebar';
import AppHeader from '../../../components/AppHeader';
import AppFooter from '../../../components/AppFooter';

interface Request {
  _id: string;
  referenceID: string;
  status: string;
  amountSent: number;
  amountReceived: number;
  currencyFrom: string;
  currencyTo: string;
  transferFee: number;
  sendingMethod: {
    type: string;
    senderBankAccount?: string;
    senderTransitNumber?: string;
    senderInstitutionNumber?: string;
    bankTransfer?: {
      institutionNumber?: string;
      transitNumber?: string;
      accountNumber?: string;
    };
  };
  recipientBank: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    transferContent?: string;
  };
  userEmail: string;
  userPhone: {
    countryCode?: string;
    phoneNumber?: string;
  } | string; // Support both old string format and new object format
  createdAt: string;
  updatedAt: string;
}

export default function ReceiptPage() {
  const router = useRouter();
  const { hash } = router.query;
  const { token, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  // Avoid using token during SSR — only consider authenticated state after mount
  const isAuthenticated = mounted && Boolean(token);
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // mark as mounted to enable client-only conditional rendering
    setMounted(true);

    if (!hash) return;

    async function fetchReceipt() {
      try {
        const response = await fetch(`/api/requests/receipt/${hash}`, { credentials: 'include' });

        // If token is invalid/expired the server will return 401 — force logout
        if (response.status === 401) {
          try { logout(); } catch {};
          return;
        }

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.message || 'Failed to load receipt');
        }

        setRequest(data.request);
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchReceipt();
  }, [hash]);

  const maskEmail = (email?: string) => {
    if (!email) return '';
    try {
      const [local, domain] = email.split('@');
      if (!domain) return email;
      if (local.length <= 2) return `${local[0]}***@${domain}`;
      return `${local[0]}***${local[local.length - 1]}@${domain}`;
    } catch { return email; }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 !text-yellow-700 dark:bg-yellow-900 dark:!text-yellow-200';
      case 'approved': return 'bg-blue-100 !text-blue-700 dark:bg-blue-900 dark:!text-blue-200';
      case 'completed': return 'bg-green-100 !text-green-700 dark:bg-green-900 dark:!text-green-200';
      case 'reject': return 'bg-red-100 !text-red-700 dark:bg-red-900 dark:!text-red-200';
      default: return 'bg-gray-100 !text-gray-700 dark:bg-gray-800 dark:!text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'approved': return 'Approved';
      case 'completed': return 'Completed';
      case 'reject': return 'Rejected';
      default: return status;
    }
  };

  if (loading) {
    return (
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppSidebar />
          <div className="wrapper d-flex flex-column min-vh-100 bg-light dark:bg-slate-900">
            <AppHeader />
            <div className="body flex-grow-1 px-3">
              <div className="container-lg py-4">
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Loading receipt...</p>
                </div>
              </div>
            </div>
            <AppFooter />
          </div>
        </div>
    );
  }

  if (error || !request) {
    return (
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppSidebar />
          <div className="wrapper d-flex flex-column min-vh-100 bg-light dark:bg-slate-900">
            <AppHeader />
            <div className="body flex-grow-1 px-3">
              <div className="container-lg py-4">
                <div className="alert alert-danger dark:bg-[#450a0a] dark:border-[#7f1d1d] dark:text-[#fca5a5]" role="alert">
                  <h4 className="alert-heading dark:text-[#fecaca]">Receipt Not Found</h4>
                  <p>{error || 'The receipt you are looking for does not exist or has been removed.'}</p>
                  <hr />
                  <button className="btn btn-primary" onClick={() => router.push('/transfers')}>
                    Back to Transfers
                  </button>
                </div>
              </div>
            </div>
            <AppFooter />
          </div>
        </div>
    );
  }

  return (
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppSidebar />
        <div className="wrapper d-flex flex-column min-vh-100 bg-light dark:bg-slate-900">
          <AppHeader />
          <div className="body flex-grow-1 px-3">
            <div className="container-lg py-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="h3 mb-0">Transfer Receipt</h1>
              <button className="btn btn-outline-primary" onClick={() => window.print()}>
                Print Receipt
              </button>
            </div>

            {/* Receipt Card */}
            <div className="card shadow-sm">
              <div className="card-body p-4">
                {/* Success Message */}
                <div className="alert alert-success dark:bg-[#064e3b] dark:border-[#065f46] dark:text-[#6ee7b7] mb-4">
                  <h4 className="alert-heading dark:text-[#86efac]">✓ Transfer Request Submitted Successfully!</h4>
                  <p className="mb-0">Your transfer request has been received and is being processed.</p>
                </div>

                {/* Reference Number */}
                <div className="mb-4 p-3 bg-light dark:bg-slate-700 rounded">
                  <div className="row">
                    <div className="col-md-6">
                      <small className="text-muted dark:text-slate-400 d-block">Reference Number</small>
                      <strong className="h5 dark:text-slate-100">{request.referenceID}</strong>
                    </div>
                    <div className="col-md-6 text-md-end">
                      <small className="text-muted dark:text-slate-400 d-block">Status</small>
                      <span className={`badge ${getStatusColor(request.status)} px-3 py-2`}>
                        {getStatusText(request.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <hr />

                {/* Transfer Details */}
                <h5 className="mb-3 dark:text-slate-200">Transfer Details</h5>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <small className="text-muted dark:text-slate-400">You Send</small>
                    <p className="mb-0 dark:text-slate-100">
                      <strong className="h4 dark:text-slate-50">
                        {new Intl.NumberFormat('en-CA', { style: 'currency', currency: request.currencyFrom }).format(request.amountSent)}
                      </strong>
                    </p>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted dark:text-slate-400">Recipient Receives</small>
                    <p className="mb-0 dark:text-slate-100">
                      <strong className="h4 dark:text-slate-50">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: request.currencyTo }).format(request.amountReceived)}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <small className="text-muted dark:text-slate-400">Transfer Fee</small>
                    <p className="mb-0 dark:text-slate-100">{new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(request.transferFee)}</p>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted dark:text-slate-400">Payment Method</small>
                    <p className="mb-0 text-capitalize dark:text-slate-100">{request.sendingMethod.type.replace('-', ' ')}</p>
                  </div>
                </div>

                <hr />

                {/* Sender Information */}
                <h5 className="mb-3 dark:text-slate-200">Sender Information</h5>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <small className="text-muted dark:text-slate-400">Email</small>
                    <p className="mb-0 dark:text-slate-100">{isAuthenticated ? request.userEmail : maskEmail(request.userEmail)}</p>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted dark:text-slate-400">Phone</small>
                    <p className="mb-0 dark:text-slate-100">
                      {isAuthenticated ? (typeof request.userPhone === 'object' 
                        ? `(${request.userPhone.countryCode || ''}) ${request.userPhone.phoneNumber || ''}`
                        : '') : ''}
                    </p>
                  </div>
                </div>

                {/* Only show bank/account/transit/institution numbers to authenticated users */}
                {isAuthenticated && request.sendingMethod.type === 'wire' && (request.sendingMethod.senderBankAccount || request.sendingMethod.bankTransfer) && (
                  <>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <small className="text-muted dark:text-slate-400">Account Number</small>
                        <p className="mb-0 dark:text-slate-100">
                          {request.sendingMethod.bankTransfer?.accountNumber || request.sendingMethod.senderBankAccount}
                        </p>
                      </div>
                      <div className="col-md-4">
                        <small className="text-muted dark:text-slate-400">Transit Number</small>
                        <p className="mb-0 dark:text-slate-100">
                          {request.sendingMethod.bankTransfer?.transitNumber || request.sendingMethod.senderTransitNumber}
                        </p>
                      </div>
                      <div className="col-md-4">
                        <small className="text-muted dark:text-slate-400">Institution Number</small>
                        <p className="mb-0 dark:text-slate-100">
                          {request.sendingMethod.bankTransfer?.institutionNumber || request.sendingMethod.senderInstitutionNumber}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <hr />

                {/* Recipient Information */}
                <h5 className="mb-3 dark:text-slate-200">Recipient Information</h5>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <small className="text-muted dark:text-slate-400">Account Holder Name</small>
                    <p className="mb-0 dark:text-slate-100">{request.recipientBank.accountHolderName}</p>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted dark:text-slate-400">Bank</small>
                    <p className="mb-0 dark:text-slate-100">{request.recipientBank.bankName}</p>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <small className="text-muted dark:text-slate-400">Account Number</small>
                    <p className="mb-0 dark:text-slate-100">{isAuthenticated ? request.recipientBank.accountNumber : ''}</p>
                  </div>
                  {request.recipientBank.transferContent && (
                    <div className="col-md-6">
                      <small className="text-muted dark:text-slate-400">Transfer Message</small>
                      <p className="mb-0 dark:text-slate-100">{request.recipientBank.transferContent}</p>
                    </div>
                  )}
                </div>

                {/* If user is not authenticated, show a limited-view banner */}
                {!isAuthenticated && (
                  <div className="alert alert-warning mt-3">
                    <strong>Limited view:</strong> You are viewing a public, redacted receipt. Sign in to see full details.
                  </div>
                )}
                <hr />

                {/* Timestamps */}
                <div className="row">
                  <div className="col-md-6">
                    <small className="text-muted dark:text-slate-400">Submitted On</small>
                    <p className="mb-0 dark:text-slate-100">{new Date(request.createdAt).toLocaleString('en-CA')}</p>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted dark:text-slate-400">Last Updated</small>
                    <p className="mb-0 dark:text-slate-100">{new Date(request.updatedAt).toLocaleString('en-CA')}</p>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="alert alert-info dark:bg-[#0c2340] dark:border-[#1e3a5f] dark:text-[#bae6fd] mt-4">
                  <h6 className="dark:text-[#7dd3fc]">What's Next?</h6>
                  <ul className="mb-0">
                    <li>We will review your transfer request within 24 hours.</li>
                    <li>You will receive an email notification once your transfer is approved.</li>
                    <li>You can track your transfer status in the <a href="/transfers-history" className="dark:text-[#38bdf8] dark:hover:text-[#7dd3fc]">Transfer History</a> page.</li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="d-flex gap-2 justify-content-center mt-4">
                  <button className="btn btn-primary" onClick={() => router.push('/transfers')}>
                    Make Another Transfer
                  </button>
                  <button className="btn btn-outline-secondary" onClick={() => router.push('/transfers-history')}>
                    View Transfer History
                  </button>
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
