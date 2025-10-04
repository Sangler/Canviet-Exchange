import React, { useState, useEffect } from 'react';
import RequireAuth from '../components/RequireAuth';
import AppSidebar from '../components/AppSidebar';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { useAuth } from '../context/AuthContext';

export default function Transfer() {
  const { user } = useAuth();
  const [rate, setRate] = useState<number>(18800); // example static rate
  const [amountFrom, setAmountFrom] = useState<string>('');
  const [amountTo, setAmountTo] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-calc receive amount
  useEffect(() => {
    const val = parseFloat(amountFrom);
    if (!isNaN(val)) {
      setAmountTo(new Intl.NumberFormat('en-US').format(val * rate));
    } else {
      setAmountTo('');
    }
  }, [amountFrom, rate]);

  function formatNumberInput(e: React.ChangeEvent<HTMLInputElement>) {
    setAmountFrom(e.target.value);
  }

  async function onCalcSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Could call backend quote endpoint here
  }

  async function onTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // TODO: hook to backend create transfer endpoint
      await new Promise(r => setTimeout(r, 900));
      alert('Transfer submitted (placeholder)');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth>
      <div>
        <AppSidebar />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          <div className="body flex-grow-1 transfers-page">
            <section className="introduction">
              <div className="intro-inner">
                <h1>Fast, Secure, Friendly Transfers</h1>
                <p className="intro-lead">Send money from Canada to Vietnam with transparent rates and fast delivery.</p>
                <div className="intro-cta">
                  <a href="#exchange" className="btn primary">Get Started</a>
                  <a href="#info" className="btn ghost">How it works</a>
                </div>
              </div>
              <div className="intro-decor" aria-hidden />
            </section>

            <main className="main-content">
              <div className="grid">
                <section id="exchange" className="card exchange-form scroll-reveal">
                  <h2>Send Money</h2>
                  <form id="moneyExchangeForm" onSubmit={onCalcSubmit}>
                    <p className="rate-info">Current exchange rate: <strong>1 CAD = {rate.toLocaleString()} VND</strong></p>
                    <div className="form-group">
                      <label htmlFor="amountFrom">Amount to Send (CAD):</label>
                      <input type="number" id="amountFrom" name="amountFrom" placeholder="Enter amount" min={100} max={10000} step="0.01" required value={amountFrom} onChange={formatNumberInput} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="amountTo">Amount to Receive (VND):</label>
                      <input type="text" id="amountTo" name="amountTo" placeholder="Auto-calculated" readOnly value={amountTo} />
                    </div>
                    <button type="submit" className="btn primary w-full">Calculate &amp; Continue</button>
                  </form>
                </section>

                <aside id="info" className="card transfer-details scroll-reveal">
                  <h2>Transfer Information</h2>
                  <form id="transferInfoForm" onSubmit={onTransferSubmit}>
                    <div className="form-group">
                      <label>User Email:</label>
                      <input type="email" value={user?.email || ''} disabled />
                    </div>
                    <div className="form-group">
                      <label>Expected Received Amount:</label>
                      <input type="text" value={(amountTo || '0') + ' VND'} disabled />
                    </div>
                    <div className="form-group">
                      <label>Sender Phone Number:</label>
                      <input type="tel" name="senderPhone" placeholder="" required />
                    </div>
                    <div className="form-group">
                      <label>Receiver Phone Number:</label>
                      <input type="tel" name="receiverPhone" placeholder="" required />
                    </div>
                    <div className="form-group two-col">
                      <div>
                        <label>Sender Bank:</label>
                        <select name="senderBank" required>
                          <option value="">Select a Bank</option>
                          <option value="cibc">CIBC</option>
                          <option value="rbc">RBC</option>
                          <option value="td">TD</option>
                          <option value="bmo">BMO</option>
                          <option value="scotiabank">Scotiabank</option>
                        </select>
                      </div>
                      <div>
                        <label>Account #</label>
                        <input type="text" name="senderBankAccount" placeholder="Account Number" required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Transfer Method:</label>
                      <select name="transferMethod" required>
                        <option value="e-transfer">E-Transfer</option>
                        <option value="wire">Wire Transfer</option>
                      </select>
                    </div>
                    <div className="form-group two-col">
                      <div>
                        <label>Receiver Bank:</label>
                        <select name="receiverBank" required>
                          <option value="">Select a Bank</option>
                          <option value="vietcombank">Vietcombank</option>
                          <option value="agribank">Agribank</option>
                          <option value="techcombank">Techcombank</option>
                          <option value="mb">MB Bank</option>
                          <option value="acb">ACB</option>
                          <option value="vietinbank">VietinBank</option>
                          <option value="shinhan">Shinhan Bank</option>
                        </select>
                      </div>
                      <div>
                        <label>Account #</label>
                        <input type="text" name="receiverBankAccount" placeholder="Account Number" required />
                      </div>
                    </div>
                    <button type="submit" className="btn primary w-full" disabled={submitting}>{submitting ? 'Submitting…' : 'Confirm Transfer'}</button>
                  </form>
                </aside>
              </div>

              <section className="features scroll-reveal">
                <h3>Why choose us</h3>
                <div className="features-grid">
                  <div className="feature card">
                    <h4>Low Fees</h4>
                    <p>Competitive rates and transparent fees. No hidden charges.</p>
                  </div>
                  <div className="feature card">
                    <h4>Fast Delivery</h4>
                    <p>Most transfers delivered within 24–48 hours.</p>
                  </div>
                  <div className="feature card">
                    <h4>Secure</h4>
                    <p>Encrypted transfers and verified partners.</p>
                  </div>
                </div>
              </section>

              <section className="testimonials scroll-reveal">
                <h3>What customers say</h3>
                <div className="testimonials-grid">
                  <blockquote className="card">“Great service — fast and easy!” <a href="https://www.facebook.com/momo.16111997" target="_blank" rel="noreferrer"><cite>- Momo</cite></a></blockquote>
                  <blockquote className="card">“Transparent fees and quick confirmation.” <a href="https://www.facebook.com/toan.lam.9" target="_blank" rel="noreferrer"><cite>- Tony Lam</cite></a></blockquote>
                  <blockquote className="card">“No fee with good exchange rate better than Remitly!” <a href="https://www.facebook.com/vanlythuc1202" target="_blank" rel="noreferrer"><cite>- Thuc Van</cite></a></blockquote>
                  <blockquote className="card">“Best exchange rate on the market but only for one-way transfers.” <a href="https://www.facebook.com/nhanle164" target="_blank" rel="noreferrer"><cite>- Nhan Le</cite></a></blockquote>
                </div>
              </section>
            </main>
          </div>
          <AppFooter />
        </div>
      </div>
      <style jsx>{`
        .transfers-page { --accent:#2563eb; --accent-rgb:37,99,235; --bg-soft:#f1f5f9; }
        .introduction { position:relative; padding:60px 28px 40px; background:linear-gradient(135deg,#1d4ed8,#0f172a); color:#fff; overflow:hidden; }
        .intro-inner { max-width:860px; margin:0 auto; position:relative; z-index:2; }
        .introduction h1 { font-size:clamp(2rem,4.5vw,3.2rem); margin:0 0 16px; font-weight:700; letter-spacing:-1px; line-height:1.05; }
        .intro-lead { font-size:clamp(1rem,1.7vw,1.25rem); max-width:560px; line-height:1.45; margin:0 0 28px; color:#e2e8f0; }
        .intro-cta { display:flex; gap:14px; flex-wrap:wrap; }
        .btn { --btn-bg:#fff; --btn-color:#0f172a; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; font-weight:600; padding:12px 22px; border-radius:10px; font-size:14px; transition:background .18s, color .18s, box-shadow .18s, border-color .18s; border:1px solid transparent; }
        .btn.primary { background:rgba(255,255,255,0.12); color:#fff; border-color:rgba(255,255,255,0.25); backdrop-filter:blur(4px); }
        .btn.primary:hover { background:#fff; color:#0f172a; }
        .btn.ghost { background:rgba(255,255,255,0.04); color:#fff; border-color:rgba(255,255,255,0.18); }
        .btn.ghost:hover { background:rgba(255,255,255,.18); }
        .w-full { width:100%; }
        .intro-decor { position:absolute; inset:0; background:radial-gradient(circle at 70% 30%,rgba(255,255,255,0.18),transparent 60%), radial-gradient(circle at 30% 70%,rgba(255,255,255,0.15),transparent 55%); opacity:.55; }
        .main-content { padding:50px 24px 40px; background:#f8fafc; }
        .grid { display:grid; gap:32px; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); align-items:start; max-width:1200px; margin:0 auto 50px; }
        .card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:24px 24px 28px; box-shadow:0 4px 12px -2px rgba(0,0,0,.05),0 12px 28px -6px rgba(0,0,0,.04); position:relative; overflow:hidden; }
        .card h2, .card h3, .card h4 { margin:0 0 14px; font-weight:600; letter-spacing:-.5px; }
        .exchange-form h2 { font-size:24px; }
        form { display:flex; flex-direction:column; gap:18px; }
        .rate-info { margin:-4px 0 4px; font-size:13px; color:#334155; }
        .form-group { display:flex; flex-direction:column; gap:6px; }
        label { font-size:13px; font-weight:600; color:#334155; letter-spacing:.4px; text-transform:uppercase; }
        input, select { font:inherit; padding:12px 14px; border:1px solid #cbd5e1; background:#f8fafc; border-radius:10px; transition:border-color .18s, background .18s, box-shadow .18s; }
        input:focus, select:focus { outline:none; border-color:var(--accent); background:#fff; box-shadow:0 0 0 2px rgba(var(--accent-rgb),.15); }
        input[disabled], select[disabled] { opacity:.8; cursor:not-allowed; }
        .two-col { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px; }
        button.btn.primary { background:var(--accent); color:#fff; border:none; font-weight:600; letter-spacing:.6px; box-shadow:0 6px 18px -4px rgba(var(--accent-rgb),.5); position:relative; overflow:hidden; }
        button.btn.primary::after { content:""; position:absolute; inset:0; background:linear-gradient(120deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.25) 60%,rgba(255,255,255,0)); transform:translateX(-100%); transition:transform .6s; }
        button.btn.primary:hover::after { transform:translateX(100%); }
        button.btn.primary:hover { filter:brightness(1.05); }
        button[disabled] { opacity:.7; cursor:wait; }
        .features, .testimonials { max-width:1200px; margin:0 auto 60px; }
        .features h3, .testimonials h3 { font-size:22px; margin-bottom:20px; }
        .features-grid, .testimonials-grid { display:grid; gap:22px; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); }
        .feature p { margin:4px 0 0; font-size:14px; line-height:1.45; color:#475569; }
        blockquote { margin:0; font-size:14px; line-height:1.5; font-style:italic; color:#334155; position:relative; }
        blockquote cite { font-style:normal; font-weight:600; margin-left:4px; }
        blockquote a { color:var(--accent); text-decoration:none; }
        blockquote a:hover { text-decoration:underline; }
        /* Scroll reveal (simple fade/slide) placeholder */
        .scroll-reveal { animation:fadeUp .55s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        /* Dark mode */
        @media (prefers-color-scheme:dark) {
          .main-content { background:#0f172a; }
          .card { background:#1e293b; border-color:#334155; box-shadow:0 6px 18px -6px rgba(0,0,0,.6),0 2px 6px -2px rgba(0,0,0,.5); }
          label { color:#cbd5e1; }
          input, select { background:#1e293b; border-color:#475569; color:#e2e8f0; }
          input:focus, select:focus { background:#24324a; }
          .rate-info { color:#94a3b8; }
          .feature p { color:#cbd5e1; }
          blockquote { color:#cbd5e1; }
          .intro-lead { color:#cbd5e1; }
        }
        @media (max-width:880px) { .introduction { padding:52px 20px 36px; } .main-content { padding:46px 18px 36px; } }
        @media (max-width:580px) { .intro-cta { flex-direction:column; align-items:stretch; } .two-col { grid-template-columns:1fr; } }
      `}</style>
    </RequireAuth>
  );
}
