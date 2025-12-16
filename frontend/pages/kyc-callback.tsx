import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '../lib/auth';
import { useLanguage } from '../context/LanguageContext';
import Head from 'next/head';

export default function KycCallbackPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [status, setStatus] = useState<'checking' | 'verified' | 'pending' | 'failed'>('checking');
  const [message, setMessage] = useState(t('common.loading'));

  useEffect(() => {
    async function handleKycCallback() {
      try {
        // Check KYC status using cookie-based auth
        const kycResponse = await fetch('/api/kyc/status', { credentials: 'include' });

        const kycData = await kycResponse.json();

        if (!kycResponse.ok) {
          throw new Error(kycData.message || 'Failed to check KYC status');
        }

        if (kycData.kycStatus === 'verified') {
          setStatus('verified');
          setMessage(`✅ ${t('kyc.verificationComplete')}! ${t('auth.redirecting')}...`);

          // Simply redirect to transfers page with success flag
          setTimeout(() => {
            router.push('/transfers?kycSuccess=true');
          }, 1500);

        } else if (kycData.kycStatus === 'pending') {
          setStatus('pending');
          setMessage(`⏳ ${t('kyc.verificationInProgress')}. ${t('auth.redirecting')}...`);
          setTimeout(() => router.push('/transfers'), 3000);
        } else if (kycData.kycStatus === 'rejected') {
          setStatus('failed');
          
          // Handle different rejection reasons
          let rejectionMessage = `❌ ${t('auth.verificationFailed')}. `;
          if (kycData.code === 'duplicate_identity') {
            rejectionMessage += 'Duplicate user found. This identity is already registered with another account.';
          } else if (kycData.code === 'documentation_mismatch') {
            rejectionMessage += 'Documentation mismatched. Please try again with valid documents.';
          } else if (kycData.code === 'face_match_low_confidence') {
            rejectionMessage += 'Face match confidence too low. Please try again with better lighting.';
          } else {
            rejectionMessage += 'Please try again.';
          }
          
          if (kycData.remainingAttempts !== undefined) {
            rejectionMessage += ` Remaining attempts: ${kycData.remainingAttempts}`;
          }
          
          setMessage(rejectionMessage);
          setTimeout(() => router.push('/transfers'), 5000);
        } else if (kycData.kycStatus === 'suspended') {
          setStatus('failed');
          setMessage(`❌ ${t('suspended.title')}. ${t('suspended.contactSupport')}.`);
          setTimeout(() => router.push('/transfers'), 5000);
        } else {
          setStatus('failed');
          setMessage(`❌ ${t('auth.verificationFailed')}. Please try again.`);
          setTimeout(() => router.push('/transfers'), 3000);
        }

      } catch (error: any) {
        console.error('KYC callback error:', error);
        setStatus('failed');
        setMessage(`${t('common.error')}: ${error.message}. ${t('auth.redirecting')}...`);
        setTimeout(() => router.push('/transfers'), 3000);
      }
    }

    handleKycCallback();
  }, [router]);

  return (
    <>
      <Head>
        <title>Verifying Identity - CanViet Exchange</title>
      </Head>
      <div className="auth-container bg-auth min-h-screen flex items-center justify-center">
        <div className="auth-card max-w-md w-full text-center p-8">
          <div className="logo mb-6">
            <img src="/logo.png" alt="CanViet Exchange" className="logo-img mx-auto" style={{ maxWidth: '150px' }} />
          </div>
          
          <div className="mb-6">
            {status === 'checking' && (
              <div className="spinner mx-auto mb-4" style={{ width: '48px', height: '48px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            )}
            {status === 'verified' && (
              <div className="text-success text-6xl mb-4">✅</div>
            )}
            {status === 'pending' && (
              <div className="text-warning text-6xl mb-4">⏳</div>
            )}
            {status === 'failed' && (
              <div className="text-danger text-6xl mb-4">❌</div>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-4">
            {status === 'checking' && 'Processing Verification'}
            {status === 'verified' && 'Verification Successful'}
            {status === 'pending' && 'Verification Pending'}
            {status === 'failed' && 'Verification Issue'}
          </h1>
          
          <p className="text-muted mb-4">{message}</p>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
