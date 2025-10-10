# CanViet Exchange - Money Transfer Platform

```
+-------------------+ +-------------------+ +-------------------+
| User Frontend    | | Admin Dashboard   | | External APIs    |
| (React App)      | | (React + Charts)  | | - Stripe (Fiat)  |
| - Transfer UI    |<->| - Transactions   |<->| - Coinbase      |
| - Wallet Connect | | - Analytics      | | - Bank Partners  |
+-------------------+ +-------------------+ +-------------------+
       |                      |
       v                      v
+-------------------+ +-------------------+
|    Backend (Node/Express)              |
| - Auth (JWT + Redis)                   |
| - APIs (Payments, Users)               |
| - Security (Rate Limit, Validation)    |
+-------------------+                    |
       |                                 |
       v                                 |
+-------------------+ +-------------------+
| Databases        | | Blockchain        |
| - MongoDB (Users,| | - Ethereum/Solana |
|   Transactions)  | | for USDC         |
| - Redis (Cache)  | |                   |
+-------------------+ +-------------------+
```

**Summary:**  
CanViet Exchange is a secure, low-cost money transfer service for remittances from the US and Canada to Vietnam, leveraging fiat payments (via Stripe) and cryptocurrency (USDC via Coinbase Commerce). Built with the MERN stack (MongoDB, Express.js, React with Next.js, Node.js), Redis for session management and caching, and JWT for robust authentication, CanViet Exchange offers fast, compliant transfers targeting the Vietnamese diaspora ($18B annual remittance market). Key features include an admin dashboard for transaction management and analytics, a user-friendly transfer interface, and strong security measures compliant with fintech standards.

## Features

- **Fiat Payments:** Process USD/CAD via Stripe (2.9% + $0.30 fees per transaction).
- **Crypto Payments:** USDC transfers on Ethereum/Solana via Coinbase Commerce (0.1–0.5% fees), reducing costs by 80–90% compared to traditional methods.
- **Admin Dashboard:** View transaction lists, analytics (powered by Recharts), and initiate transfers.
- **User Interface:** Transfer form for fiat and crypto payments, with wallet integration (Web3.js for MetaMask).
- **Authentication:** JWT with access tokens (15-minute expiry) and refresh tokens (7-day expiry, stored in Redis), using HttpOnly, Secure cookies.
- **Security:** Argon2 for password hashing, Helmet for secure headers, rate-limiting (100 requests/15min), input validation, and PII encryption in MongoDB.
- **Compliance:** Designed for Money Services Business (MSB) licensing with FinCEN (US), FINTRAC (Canada), and Vietnam's State Bank (SBV), supporting AML/KYC requirements and 2025 crypto regulations (e.g., GENIUS Act).

## Project Status

- **Phase 1 (Completed, 2–4 weeks):** Market research, business plan, regulatory checklist (MSB, AML/KYC), wireframes, and pitch deck for $100K–$500K seed funding.
- **Phase 2 (In Progress, 8–12 weeks):** Building MVP with:
  - Infrastructure: MERN stack, MongoDB (users, transactions), Redis (tokens, cache), Git.
  - Backend: Express APIs for authentication, payments (Stripe, Coinbase), and transactions.
  - Frontend: Next.js admin dashboard (transactions, analytics) and user transfer UI.
  - Crypto: USDC payment flow via Coinbase Commerce and Web3.js.
  - Partnerships: Mock integration with Vietnam bank APIs (e.g., Techcombank) for VND payouts.

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, Shadcn UI, Recharts.
- **Backend:** Node.js, Express.js, MongoDB (Mongoose), Redis.
- **Authentication:** JWT, bcrypt, HttpOnly cookies.
- **Payments:** Stripe (fiat), Coinbase Commerce (crypto), Web3.js (wallet integration).
- **Security:** Helmet, express-rate-limit, express-validator for OWASP compliance.
- **Deployment:** Planned for AWS EC2 or Vercel, with Docker support (optional).

## Setup Instructions

### Prerequisites

- Node.js (v20 or higher)
- MongoDB (local or MongoDB Atlas, free tier)
- Redis (local or Redis Cloud, free tier)
- Stripe account (obtain pk_test_... and sk_test_... from dashboard.stripe.com)
- Coinbase Commerce API key (from coinbase.com/commerce)
- Git

### Backend Setup

1. Clone the repository: `git clone <repo-url>`
2. Navigate to backend: `cd backend`
3. Install dependencies: `npm install`
4. Create `.env` file in backend/:
   ```
   MONGO_URI=mongodb://localhost:27017/CanViet-Exchange
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=yourstrongsecret
   REFRESH_SECRET=anothersecret
   STRIPE_SECRET=sk_test_...
   COINBASE_API_KEY=yourkey
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ```
5. Start server: `npm start` (runs Express on http://localhost:5000)

### Frontend Setup

1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Create `.env` file in frontend/:
   ```
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. Start development server: `npm run dev` (runs Next.js on http://localhost:3000)

### Testing APIs

- Use Postman to test endpoints:
  - Authentication: `/api/auth/register`, `/login`, `/refresh`, `/logout`
  - Payments: `/api/payments/create-intent` (Stripe), `/create-crypto-charge` (Coinbase)
  - Transactions: `/api/transactions` (GET)
- Test card for Stripe: 4242424242424242, expiry 12/26, CVC 123 (test mode).

## Security

- **Authentication:** JWT access tokens (15m expiry) and refresh tokens (7d, stored in Redis with invalidation support). HttpOnly, Secure cookies for refresh tokens.
- **Data Protection:** MongoDB field-level encryption for PII, bcrypt for password hashing.
- **API Security:** Helmet for secure headers (CSP, X-Frame-Options), rate-limiting (100 requests/15min), input validation via express-validator to prevent XSS and injection.
- **Compliance:** Transaction logging for AML/KYC, ready for MSB licensing and Vietnam's SBV regulations.

## Roadmap

- **Phase 2 (Ongoing, 8–12 weeks):** Complete MVP with admin dashboard, user transfer UI, crypto payments, and mock bank integrations.
- **Phase 3 (Next, 4–6 weeks):** Unit/integration testing (Jest, React Testing Library), security audits (Snyk), and MSB licensing applications.
- **Phase 4 (Launch, 2 weeks):** Deploy to AWS/Vercel, onboard initial users, and launch marketing campaign targeting Vietnamese diaspora.
- **Phase 5 (Ongoing):** Scale to 10K users, add mobile app (React Native), and integrate AI for fraud detection.

## Contributing

- Fork the repo and create feature branches (feature/<name>).
- Submit pull requests with unit tests.
- Contact: [your-email] for collaboration or inquiries.

## License
MIT License (pending finalization).

## Customer Onboarding (KYC) & AML Compliance

This project includes (or is designed to include) a full Know Your Customer (KYC) and Anti–Money Laundering (AML) workflow so users complete required verifications before they can initiate higher‑value transfers. The flow is modular: you can start light (email + ID) and progressively enable more layers (address, source of funds, enhanced due diligence) without code rewrites.

### 1. Onboarding Flow (User Journey)
| Step | Purpose | Trigger / Gate | Outcome |
|------|---------|----------------|---------|
| 1. Account Registration | Create basic profile (email, password) | /api/auth/register | User status = `PENDING_EMAIL` |
| 2. Email Verification | Confirm ownership | Email link (JWT token) | Status -> `BASIC` (Tier 0) |
| 3. Profile Details | Collect legal name, DOB, country, phone | Web form `/api/profile` | Status remains `BASIC` |
| 4. Identity Verification (KYC Level 1) | Government issued ID (front/back) + selfie (liveness) | Upload via `/api/kyc/id` | Status -> `KYC_PENDING` then `KYC_APPROVED` on success |
| 5. Address Verification (KYC Level 2) | Proof of Address (utility bill, bank/credit statement) | `/api/kyc/address` | Status -> `KYC_L2_PENDING` -> `KYC_L2_APPROVED` |
| 6. Source of Funds Questionnaire | Income / occupation / expected monthly volume | `/api/kyc/source-funds` | Risk score recalculated |
| 7. Risk Scoring & Tier Assignment | Automated + (optional) manual review | Background job / admin UI | Tier set (T0–T3) |
| 8. Transfer Enablement | Unlock sending volume & limits | After Tier assigned | User can initiate transfers within tier limits |

### 2. Tier Structure (Example)
| Tier | Name | KYC Requirements | Daily Limit | Monthly Limit | Notes |
|------|------|------------------|------------|---------------|-------|
| T0 | Basic | Email verified only | 0 (view only) | 0 | Can browse but cannot transfer |
| T1 | Standard | ID + Selfie | 2,000 CAD | 10,000 CAD | Default after L1 approval |
| T2 | Enhanced | ID + Selfie + Address + Source of Funds | 10,000 CAD | 50,000 CAD | Requires address doc | 
| T3 | High / EDD | All above + Manual review (EDD) | Custom | Custom | Politically Exposed Persons (PEP) or high risk geographies |

All numeric limits are placeholders—configure per regulatory guidance (FINTRAC / FinCEN) and your risk appetite.

### 3. Data Collected (Minimal Principle)
| Category | Fields | Storage |
|----------|--------|---------|
| Identity | fullName, dob, nationality, idType, idNumber (hashed), idImages (encrypted blob refs) | MongoDB (encrypted fields) |
| Contact | email, phone, address | MongoDB |
| Risk / KYC | riskScore, tier, pepFlag, sanctionHits, kycStatus, reviewLogs | MongoDB |
| Auth | passwordHash (bcrypt/argon2), token invalidation list | MongoDB / Redis |
| Operational | device/userAgent, loginIP (truncated), velocity metrics | MongoDB / Redis |

Recommended: Hash or tokenize sensitive numbers (e.g., ID/passport) and never store raw images publicly (use encrypted object storage + short-lived signed URLs).

### 4. AML Monitoring Components
1. **Sanctions & Watchlist Screening**: At registration and on each profile update, compare name + DOB against OFAC, UN, EU, local lists (can integrate services like Refinitiv, ComplyAdvantage, or open-source lists updated daily).
2. **PEP Screening**: Flag if user appears in PEP dataset; auto‑route to manual review.
3. **Transaction Pattern Analysis**: Rolling windows (1h / 24h / 7d) aggregated in Redis for velocity. Escalate if thresholds exceeded or structuring (smurfing) patterns appear.
4. **Geo Risk Scoring**: Country-of-residence + destination corridor scoring. Elevate risk for sanctioned / high-risk jurisdictions.
5. **Blacklist / Adverse Media**: Optional external API enrichment.
6. **SAR (Suspicious Activity Report) Queue**: Generate internal case object when rule triggers. Manual reviewer can mark SAR filed / false positive.

### 5. Risk Score (Illustrative Formula)
```
base = 200                         # neutral baseline
if pepFlag: base += 400
if sanctionMatch: base += 1000
if highRiskCountry: base += 150
if velocityDaily > tierDailyLimit * 1.2: base += 120
if unusualAmountZScore > 3: base += 180
if sourceFundsMissing && tier >= T2: base += 80
```
Map final score -> Tier suggestions or manual review triggers.

### 6. API Endpoint Blueprint (Planned / Example)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/kyc/id` | Upload ID docs & selfie (multipart) |
| POST | `/api/kyc/address` | Upload Proof of Address |
| POST | `/api/kyc/source-funds` | Submit income / occupation data |
| GET  | `/api/kyc/status` | Retrieve user KYC status & outstanding steps |
| GET  | `/api/admin/kyc/pending` | (Admin) List pending reviews |
| POST | `/api/admin/kyc/:userId/approve` | (Admin) Approve / advance tier |
| POST | `/api/admin/kyc/:userId/reject` | (Admin) Reject with reason |

### 7. Enforcement in Transfer Flow
Server-side middleware (pseudo):
```js
function requireKycTier(minTier) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok:false, message:'Auth required' });
    if (req.user.tierNumber < minTier) {
      return res.status(403).json({ ok:false, message:'KYC tier insufficient', required:minTier, current:req.user.tierNumber });
    }
    next();
  };
}
// Example usage: app.post('/api/transfers', requireKycTier(1), createTransfer)
```

### 8. Storage & Security Notes
| Control | Implementation Suggestion |
|---------|--------------------------|
| Encryption at Rest | Encrypted disk + field-level encryption (Mongo) |
| Transit Security | HTTPS everywhere, HSTS |
| Secrets | .env + secret manager (production) |
| Access Control | RBAC: `user`, `admin`, `compliance` roles |
| Audit Trail | Append-only collection `audit_logs` (action, actorId, before/after hash) |
| Data Minimization | Purge unneeded failed uploads within 30 days |
| Retention | Follow local laws (e.g., 5 years post relationship termination) |

### 9. Manual Review Workflow (Simplified)
1. Analyst dashboard lists `KYC_PENDING`, `KYC_L2_PENDING`, `EDD_REVIEW` users.
2. Analyst inspects submitted docs (decrypted read-only links).
3. Actions: Approve, Reject (with reason code), Escalate (EDD), Request Resubmission.
4. System records decision + reviewer + timestamp + justification hash.
5. Trigger notifications to user (email / in-app) for status updates.

### 10. Event & Audit Examples
| Event | Reason |
|-------|--------|
| `kyc.submitted.id` | User uploaded ID documents |
| `kyc.approved.level1` | System or analyst approved level 1 |
| `kyc.rejected.id.mismatch` | Selfie-ID face mismatch |
| `aml.velocity.flagged` | Velocity threshold alert |
| `aml.sanction.hit` | Potential sanctions match detected |
| `transfer.blocked.tier` | User attempted transfer above tier limits |

### 11. Frontend UX Prompts
| State | Message |
|-------|---------|
| Tier 0 | “Verify your identity to start sending money.” |
| Pending Review | “We’re reviewing your documents (ETA < 24h).” |
| Rejected | “Your ID didn’t pass verification. Please resubmit.” |
| Limit Reached | “You’ve reached your daily limit. Try again tomorrow or upgrade verification.” |

### 12. Roadmap Extensions
- Integrate third-party KYC vendor (e.g., SumSub, Veriff, Persona) via webhooks.
- Add liveness + spoof detection (video frames / challenge gestures).
- Real-time sanctions re-screen every 24h batch.
- Graph-based anomaly detection (shared addresses, devices).
- ML scoring pipeline for fraud enhancements.

### 13. Disclaimer
This documentation is illustrative and does not constitute legal advice. Always validate final KYC/AML controls against FINTRAC, FinCEN, GDPR/CPPA, and local Vietnamese regulations before production deployment.
