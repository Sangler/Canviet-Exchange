import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function HelpRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/general/help');
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>Redirecting to Help Center...</p>
    </div>
  );
}
