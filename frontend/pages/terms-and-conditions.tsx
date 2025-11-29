import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TermsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/general/terms-and-conditions');
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>Redirecting to Terms and Conditions...</p>
    </div>
  );
}
