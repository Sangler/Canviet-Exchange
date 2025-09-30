import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function SiteHeader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const currentBase = useMemo(() => {
    // Build links like ?lng=en preserving current pathname (optional simplification)
    // For now, follow request and keep them as plain query links
    return router.pathname || '/';
  }, [router.pathname]);

  return (
    <header className="site-header">
      <div className="navbar">
        <div className="logo">
          {/* If you place a logo at /logo.png it will render; else fallback to text */}
          <img src={process.env.NEXT_PUBLIC_LOGO_URL || '/logo.png'} alt="MyExchange logo" className="site-logo" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <span className="site-name">SVN Transfer</span>
        </div>

        <button className="nav-toggle" aria-label="Toggle navigation" onClick={() => setOpen(v => !v)}>
          &#9776;
        </button>

        <ul className={`nav-links ${open ? 'open' : ''}`}>
          <li><Link href="/" className="link">Mainpage</Link></li>
          <li><Link href="/register" className="link">Register</Link></li>
          <li className="lang-switch">
            <a href={`${currentBase}?lng=en`} hrefLang="en" className="link">EN</a>
            <a href={`${currentBase}?lng=vi`} hrefLang="vi" className="link">VI</a>
          </li>
        </ul>
      </div>

      <style jsx>{`
        .site-header { position: sticky; top: 0; z-index: 40; background: #111827; color: #fff; }
        .navbar { max-width: 1100px; margin: 0 auto; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; }
        .logo { display: flex; align-items: center; gap: 10px; }
        .site-logo { height: 28px; width: auto; }
        .site-name { font-weight: 700; letter-spacing: 0.2px; }
        .nav-toggle { display: inline-flex; align-items: center; justify-content: center; font-size: 22px; background: transparent; color: #fff; border: none; cursor: pointer; }
        .nav-links { list-style: none; display: none; gap: 16px; align-items: center; margin: 0; padding: 0; }
        .nav-links .link { color: #e5e7eb; text-decoration: none; }
        .nav-links .link:hover { color: #fff; }
        .lang-switch { display: flex; gap: 10px; align-items: center; }
        @media (min-width: 768px) {
          .nav-links { display: flex; }
          .nav-toggle { display: none; }
        }
        /* Mobile open state */
        .nav-links.open { display: flex; position: absolute; top: 56px; left: 0; right: 0; background: #111827; padding: 12px 16px; flex-direction: column; gap: 12px; border-bottom: 1px solid #1f2937; }
      `}</style>
    </header>
  );
}
