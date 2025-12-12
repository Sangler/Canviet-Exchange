import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useLanguage } from '../context/LanguageContext';

export default function TermsRedirect() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    router.replace('/general/terms-and-conditions');
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>{t('auth.redirecting')}...</p>
    </div>
  );
}
