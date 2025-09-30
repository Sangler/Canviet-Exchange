import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

export default function SiteFooter() {
  const [showTop, setShowTop] = useState(false);
  const year = useMemo(() => new Date().getFullYear(), []);
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || 'MyExchange';

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 240);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const backToTop = () => {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
  };

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-grid">
          <div className="col company">
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className="col product">
            <h4>Product</h4>
            <ul>
              <li><Link href="/features">Features</Link></li>
              <li><Link href="/ex-rate">Exchange rates</Link></li>
              <li><Link href="/developers">Developers</Link></li>
            </ul>
          </div>
          <div className="col support">
            <h4>Support</h4>
            <ul>
              <li><Link href="/help">Help Center</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
          <div className="col social">
            <h4>Social Media</h4>
            <div className="social-icons">
              <a href="https://facebook.com" aria-label="Facebook" className="social-link facebook" target="_blank" rel="noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22 12C22 6.48 17.52 2 12 2S2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88v-6.99H7.9v-2.89h2.54V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.25c-1.23 0-1.61.77-1.61 1.56v1.88h2.74l-.44 2.89h-2.3V22C18.34 21.12 22 16.99 22 12z"/></svg>
              </a>
              <a href="https://twitter.com" aria-label="X (Twitter)" className="social-link x" target="_blank" rel="noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.89-.53 1.57-1.38 1.89-2.39-.84.5-1.77.86-2.76 1.06A4.15 4.15 0 0015.5 4c-2.3 0-4.17 1.86-4.17 4.15 0 .33.04.66.11.98C7.7 9.02 4.07 7.13 1.64 4.15c-.36.62-.57 1.34-.57 2.11 0 1.46.74 2.75 1.86 3.5-.69-.02-1.34-.21-1.9-.52v.05c0 2.04 1.46 3.74 3.4 4.12-.36.1-.74.15-1.12.15-.27 0-.54-.03-.8-.07.54 1.67 2.1 2.88 3.96 2.92A8.34 8.34 0 011 19.54a11.78 11.78 0 006.29 1.84c7.55 0 11.69-6.27 11.69-11.71 0-.18-.01-.36-.02-.54.8-.58 1.49-1.3 2.04-2.12z"/></svg>
              </a>
              <a href="https://instagram.com" aria-label="Instagram" className="social-link instagram" target="_blank" rel="noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V7c0-1.66 1.34-3 3-3h10zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm4.5-3a1.5 1.5 0 11.001 3.001A1.5 1.5 0 0116.5 6z"/></svg>
              </a>
              <a href="https://zalo.me" aria-label="Zalo" className="social-link zalo" target="_blank" rel="noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 5.95 2 11c0 2.21.9 4.23 2.4 5.77L4 22l5.5-1.9C11.07 20.5 11.52 20.56 12 20.56c5.52 0 10-3.95 10-9s-4.48-9-10-9zM9 9h6v2H9V9zm0 4h4v2H9v-2z"/></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-legal">
          <p>© {year} {company}. All rights reserved.</p>
          <p><Link href="/terms">Terms of Service</Link> | <Link href="/privacy">Privacy Policy</Link></p>
        </div>
      </div>

      <button id="backToTop" className={`back-to-top ${showTop ? 'show' : ''}`} onClick={backToTop} aria-label="Back to Top">↑ Back to Top</button>

      <style jsx>{`
        .site-footer { background: #0b1220; color: #cbd5e1; margin-top: 32px; border-top: 1px solid #111827; }
        .footer-content { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
        .footer-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        @media (min-width: 768px) { .footer-grid { grid-template-columns: repeat(4, 1fr); } }
        h4 { color: #e5e7eb; margin-bottom: 10px; font-weight: 600; }
        ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        a { color: #9ca3af; text-decoration: none; }
        a:hover { color: #fff; }
        .social-icons { display: flex; gap: 10px; }
        .footer-legal { margin-top: 16px; border-top: 1px solid #111827; padding-top: 12px; font-size: 14px; color: #94a3b8; }
        .back-to-top { position: fixed; right: 16px; bottom: 16px; padding: 10px 12px; border-radius: 8px; border: 1px solid #1f2937; background: #111827; color: #e5e7eb; cursor: pointer; opacity: 0; pointer-events: none; transition: opacity .2s ease; }
        .back-to-top.show { opacity: 1; pointer-events: auto; }
        .back-to-top:hover { background: #0b1220; }
      `}</style>
    </footer>
  );
}
