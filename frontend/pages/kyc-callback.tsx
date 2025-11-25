import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '../lib/auth';
import Head from 'next/head';

export default function KycCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'verified' | 'pending' | 'failed'>('checking');
  const [message, setMessage] = useState('Checking your verification status...');

  useEffect(() => {
    async function handleKycCallback() {
      try {
        const token = getAuthToken();
        if (!token) {
          setStatus('failed');
          setMessage('Authentication required. Redirecting to login...');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        // Check KYC status
        const kycResponse = await fetch('/api/kyc/status', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const kycData = await kycResponse.json();

        if (!kycResponse.ok) {
          throw new Error(kycData.message || 'Failed to check KYC status');
        }

        if (kycData.kycStatus === 'verified') {
          setStatus('verified');
          setMessage('✅ Identity Verified! Redirecting you back to complete your transfer...');

          // Simply redirect to transfers page with success flag
          setTimeout(() => {
            router.push('/transfers?kycSuccess=true');
          }, 1500);

        } else if (kycData.kycStatus === 'pending') {
          setStatus('pending');
          setMessage('⏳ Your verification is still being processed. Please check back in a few minutes.');
          setTimeout(() => router.push('/transfers'), 3000);
        } else {
          setStatus('failed');
          setMessage('❌ Verification was not successful. Please try again.');
          setTimeout(() => router.push('/transfers'), 3000);
        }

      } catch (error: any) {
        console.error('KYC callback error:', error);
        setStatus('failed');
        setMessage(`Error: ${error.message}. Redirecting to transfers...`);
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
