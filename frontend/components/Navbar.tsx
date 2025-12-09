import Link from "next/link";
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const { t } = useLanguage();
  
  return (
    <nav className="bg-gray-800 p-4 text-white flex justify-between">
      <div className="font-bold">{t('navbar.brand') || 'CanViet Exchange'}</div>
      <div className="space-x-4">
        <Link href="/">{t('navbar.home')}</Link>
        <Link href="/transfers">{t('navbar.transfer')}</Link>
      </div>
    </nav>
  );
}
