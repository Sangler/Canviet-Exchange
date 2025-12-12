import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useLanguage } from '../context/LanguageContext';

export default function HelpRedirect() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    router.replace('/general/help');
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>{t('auth.redirecting')}...</p>
    </div>
  );
}
