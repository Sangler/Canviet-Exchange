import React, { useEffect, useMemo, useState } from "react";
import RequireAuth from "../components/RequireAuth";
import { useAuth } from "../context/AuthContext";

export default function TransfersPage() {
  const { user } = useAuth();

  // Exchange rate example: 1 CAD = 18,800 VND
  const [rate] = useState<number>(18800);
  const [amountFrom, setAmountFrom] = useState<string>(""); // CAD
  const [amountTo, setAmountTo] = useState<string>(""); // VND (calculated)

  // Sender / Receiver details
  const [senderPhone, setSenderPhone] = useState<string>("");
  const [receiverPhone, setReceiverPhone] = useState<string>("");
  const [senderBank, setSenderBank] = useState<string>("");
  const [senderBankAccount, setSenderBankAccount] = useState<string>("");
  const [transferMethod, setTransferMethod] = useState<string>("e-transfer");
  const [receiverBank, setReceiverBank] = useState<string>("");
  const [receiverBankAccount, setReceiverBankAccount] = useState<string>("");

  // Auto-calc received amount on change
  useEffect(() => {
    const n = parseFloat(amountFrom || "0");
    if (!isFinite(n) || n <= 0) {
      setAmountTo("");
      return;
    }
    const vnd = n * rate;
    // Format with thousands separators and suffix
    setAmountTo(
      new Intl.NumberFormat("vi-VN").format(Math.round(vnd)) + " VNĐ"
    );
  }, [amountFrom, rate]);

  const handleExchangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app: validate and maybe proceed to details/confirmation
    const section = document.getElementById("info");
    if (section)
      section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app: POST to backend with all payload
    alert("Transfer details submitted (demo). This would call the backend.");
  };

  const content = (
    <main className="main-content">
      <div className="grid">
        {/* Left: Exchange form */}
        <section id="exchange" className="card exchange-form scroll-reveal">
          <h2>Send Money</h2>
          <form id="moneyExchangeForm" onSubmit={handleExchangeSubmit}>
            <p className="rate-info">
              Current exchange rate:{" "}
              <strong>
                1 CAD = {rate.toLocaleString()} VND (example)
              </strong>
            </p>

            <div className="form-group">
              <label htmlFor="amountFrom">Amount to Send (CAD):</label>
              <input
                type="number"
                id="amountFrom"
                name="amountFrom"
                placeholder="Enter amount"
                min={100}
                max={10000}
                step={0.01}
                required
                value={amountFrom}
                onChange={(e) => setAmountFrom(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="amountTo">Amount to Receive (VND):</label>
              <input
                type="text"
                id="amountTo"
                name="amountTo"
                placeholder="Auto-calculated"
                readOnly
                value={amountTo}
              />
            </div>

            <button type="submit" className="btn primary">
              Calculate & Continue
            </button>
          </form>
        </section>

        {/* Right: Transfer details */}
        <aside id="info" className="card transfer-details scroll-reveal">
          <h2>Transfer Information</h2>
          <form id="transferInfoForm" onSubmit={handleTransferSubmit}>
            <div className="form-group">
              <label>User Email:</label>
              <input
                type="email"
                value={user?.email || "user@example.com"}
                disabled
              />
            </div>

            <div className="form-group">
              <label>Expected Received Amount:</label>
              <input
                type="text"
                value={amountTo || "0.00 VNĐ"}
                disabled
              />
            </div>

            <div className="form-group">
              <label>Sender Phone Number:</label>
              <input
                type="tel"
                name="senderPhone"
                placeholder=""
                required
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Receiver Phone Number:</label>
              <input
                type="tel"
                name="receiverPhone"
                placeholder=""
                required
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
              />
            </div>

            <div className="form-group two-col">
              <div>
                <label>Sender Bank:</label>
                <select
                  name="senderBank"
                  required
                  value={senderBank}
                  onChange={(e) => setSenderBank(e.target.value)}
                >
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
                <input
                  type="text"
                  name="senderBankAccount"
                  placeholder="Account Number"
                  required
                  value={senderBankAccount}
                  onChange={(e) => setSenderBankAccount(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Transfer Method:</label>
              <select
                name="transferMethod"
                required
                value={transferMethod}
                onChange={(e) => setTransferMethod(e.target.value)}
              >
                <option value="e-transfer">E-Transfer</option>
                <option value="wire">Wire Transfer</option>
              </select>
            </div>

            <div className="form-group two-col">
              <div>
                <label>Receiver Bank:</label>
                <select
                  name="receiverBank"
                  required
                  value={receiverBank}
                  onChange={(e) => setReceiverBank(e.target.value)}
                >
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
                <input
                  type="text"
                  name="receiverBankAccount"
                  placeholder="Account Number"
                  required
                  value={receiverBankAccount}
                  onChange={(e) => setReceiverBankAccount(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn primary">
              Confirm Transfer
            </button>
          </form>
        </aside>
      </div>

      {/* Extra sections: features & testimonials */}
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
          <blockquote className="card">
            "Great service — fast and easy!"{" "}
            <a
              href="https://www.facebook.com/momo.16111997"
              target="_blank"
              rel="noreferrer"
            >
              <cite>- Momo</cite>
            </a>
          </blockquote>
          <blockquote className="card">
            "Transparent fees and quick confirmation."{" "}
            <a
              href="https://www.facebook.com/toan.lam.9"
              target="_blank"
              rel="noreferrer"
            >
              <cite>- Tony Lam</cite>
            </a>
          </blockquote>
          <blockquote className="card">
            "No fee with good exchange rate better than Remitly!"{" "}
            <a
              href="https://www.facebook.com/vanlythuc1202"
              target="_blank"
              rel="noreferrer"
            >
              <cite>- Thuc Van</cite>
            </a>
          </blockquote>
          <blockquote className="card">
            "Best exchange rate on the market but only for one-way transfers."{" "}
            <a
              href="https://www.facebook.com/nhanle164"
              target="_blank"
              rel="noreferrer"
            >
              <cite>- Nhan Le</cite>
            </a>
          </blockquote>
        </div>
      </section>

      <style jsx>{`
        .main-content {
          max-width: 1100px;
          margin: 24px auto;
          padding: 0 16px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 960px) {
          .grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
        }
        .exchange-form h2,
        .transfer-details h2 {
          margin: 4px 0 12px;
          font-size: 20px;
        }
        .rate-info {
          font-size: 14px;
          color: #374151;
          margin-bottom: 12px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }
        .form-group.two-col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .form-group.two-col {
            grid-template-columns: 1fr 1fr;
          }
        }
        label {
          font-size: 14px;
          color: #374151;
        }
        input,
        select {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
        }
        input[disabled] {
          background: #f9fafb;
          color: #6b7280;
        }
        .btn.primary {
          background: #2563eb;
          color: white;
          padding: 10px 14px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
        }
        .btn.primary:hover {
          background: #1d4ed8;
        }

        .features {
          margin-top: 32px;
        }
        .features h3,
        .testimonials h3 {
          font-size: 18px;
          margin-bottom: 12px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .features-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .feature h4 {
          margin: 4px 0;
        }

        .testimonials {
          margin-top: 24px;
        }
        .testimonials-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .testimonials-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        blockquote {
          font-style: italic;
          color: #111827;
        }
        cite {
          font-style: normal;
          color: #2563eb;
          margin-left: 6px;
        }
      `}</style>
    </main>
  );

  // Keep the RequireAuth wrapper; global/runtime bypass is handled inside the component
  return <RequireAuth>{content}</RequireAuth>;
}
