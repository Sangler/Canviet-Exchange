### Project Summary
NexTransfer is a secure, low-cost money transfer platform designed for remittances from the US and Canada to Vietnam, focusing on fiat payments via Stripe and cryptocurrency transactions exclusively using USDC (integrated with platforms like Binance for P2P trading and off-ramps). The project leverages a MERN stack (MongoDB, Express.js, React with Next.js, Node.js), Redis for session management and caching, and JWT-based authentication with access/refresh tokens for security. Key features include an admin dashboard (inspired by CoreUI templates, with transaction lists, Recharts analytics, and payment forms), user transfer interface (fiat via Stripe Elements, USDC via Coinbase Commerce or Binance P2P with Web3.js wallet support), and compliance with fintech regulations (MSB licensing via FinCEN/FINTRAC, Vietnam's SBV, and 2025 crypto laws like the GENIUS Act). The Unique Value Proposition (UVP) emphasizes fast (instant USDC transfers), low-cost (0.1–0.5% fees for USDC, 0.5–1% for fiat), and secure remittances, targeting the Vietnamese diaspora ($18B annual market) with up to 90% savings over traditional services. The project is structured in phases: Phase 1 (Planning & Research, completed: market analysis, business plan, wireframes, UVP refinement, funding prep at $1.5K–$6.1K); Phase 2 (Development, ongoing 8–12 weeks at $21K–$48K: MERN setup, APIs, frontend with CoreUI, USDC integration); Phase 3 (Testing & Compliance); Phase 4 (Launch); Phase 5 (Scaling). Total MVP budget: $100K–$500K, with scalability for 10K users and future mobile app/AI fraud detection.

### Full Requirements Document
Below is a comprehensive requirements document for NexTransfer, compiled from the project conversation. It covers functional, non-functional, technical, regulatory, and operational requirements, structured for clarity and aligned with your Phase 1 deliverables (e.g., business plan, UVP, wireframes). This document serves as a blueprint for development (Phase 2), testing (Phase 3), and launch (Phase 4). It assumes a USDC-only crypto focus, with Binance integration for P2P and off-ramps, and incorporates frontend preferences (Next.js + CoreUI templates).

#### 1. Project Overview
- **Name**: NexTransfer
- **Description**: A web-based platform for secure, low-cost remittances from US/Canada to Vietnam, supporting fiat (USD/CAD via Stripe) and USDC-only crypto transfers (via Coinbase Commerce/Binance P2P on Ethereum/Solana/BNB Chain).
- **Target Users**:
  - Senders: Vietnamese diaspora in US/Canada (e.g., workers in California/Texas), businesses paying suppliers/freelancers.
  - Recipients: Individuals/freelancers in Vietnam (unbanked or crypto-savvy users).
- **UVP**: "NexTransfer enables fast, low-cost, and secure money transfers from the US and Canada to Vietnam, using USDC on Binance for instant, near-zero-fee crypto payments and Stripe for seamless fiat transactions, all managed through a user-friendly CoreUI dashboard."
- **Market Goals**: Capture share of $18B Vietnam remittance market; achieve 10K users in year 1, $100K revenue from 0.5–1% fees.
- **Success Metrics**: 80–90% fee savings vs. competitors; 95% transaction success rate; compliance certification (MSB); user retention >70%.

#### 2. Functional Requirements
These define what the system must do, prioritized for MVP (Phase 2).

- **User Authentication**:
  - Register/login with username/password (bcrypt hashing).
  - JWT access tokens (15-minute expiry) and refresh tokens (7-day expiry, stored in Redis for invalidation).
  - Role-based access: Admin (dashboard), User (transfers).
  - Forgot password/reset via email (integrate SendGrid or similar, Phase 5).
  - KYC verification: Integrate Jumio API for ID checks (required for >$10K transfers).

- **Transfer Functionality**:
  - **Fiat Transfers**: Input amount (USD/CAD), recipient details (Vietnam bank account), process via Stripe (card/bank, 2.9% + $0.30 fees); convert to VND via partners (e.g., Techcombank, 1–2 days).
  - **USDC Transfers**: USDC-only; input amount, recipient wallet/Binance account; process via Coinbase Commerce or Binance P2P/Pay (0.1–0.5% fees, instant on-chain); off-ramp to VND bank (1–3 days via P2P).
  - Real-time tracking: Status updates (pending, confirmed, completed) via Socket.io (Phase 5).
  - Limits: $10K/reporting threshold for AML; user-set daily limits.
  - Currency Conversion: Real-time rates (USD to VND/USDC, via Binance API for quotes).

- **Admin Dashboard**:
  - Transaction overview: Lists (amount, currency, status, type, date), filters/search, pagination.
  - Analytics: Recharts for volume charts, success rates, fiat vs. USDC split.
  - User management: View/edit users, approve KYC, monitor suspicious activity.
  - Payment initiation: Test/admin transfers (fiat/USDC).
  - CoreUI-inspired layout: Responsive tables, cards, dark/light themes.

- **User Interface**:
  - Transfer form: Amount, currency (USD/VND/USDC), payment type (fiat/USDC), recipient (bank/wallet/Binance ID).
  - Wallet connect: Web3.js for MetaMask (USDC on Ethereum/Solana/BNB Chain).
  - Profile: View transaction history, edit details, KYC status.
  - Notifications: Email/SMS for transfer updates (Phase 5).

- **Integrations**:
  - Payments: Stripe (fiat), Coinbase Commerce/Binance API (USDC P2P/Pay).
  - Banks: Mock/partner APIs for VND payouts (Techcombank, VietinBank).
  - Blockchain: Ethereum/Solana/BNB Chain for USDC (via Web3.js).
  - Analytics: Recharts (frontend), Google Analytics (Phase 4).

#### 3. Non-Functional Requirements
These ensure performance, security, and usability.

- **Performance**:
  - Response time: <2s for API calls, instant for USDC on-chain confirmations.
  - Scalability: Handle 10K users/year 1; use Redis caching for queries, MongoDB sharding (Phase 5).
  - Uptime: 99.9% (AWS/Vercel hosting, Phase 4).

- **Security**:
  - Authentication: JWT with Redis token invalidation, HttpOnly/Secure cookies.
  - Data Protection: Encrypt PII in MongoDB, bcrypt passwords.
  - API: Helmet headers, rate-limiting (100 req/15min), express-validator for input sanitization (prevent XSS/NoSQL injection).
  - Compliance: Log transactions for AML/KYC (>$10K reporting); GDPR/CCPA for data; GENIUS Act for USDC.

- **Usability**:
  - Responsive: Mobile/desktop (Tailwind CSS, CoreUI).
  - Accessibility: WCAG 2.1 (screen reader support, high contrast).
  - Localization: English/Vietnamese (Phase 5).
  - UX: Stripe-like clean design (rounded cards, smooth forms).

- **Reliability**:
  - Error Handling: Graceful failures (e.g., retry for Binance API timeouts).
  - Backup: MongoDB daily snapshots.

#### 4. Technical Requirements
- **Frontend**: Next.js 14, React, TypeScript, CoreUI templates, Tailwind CSS, Shadcn UI, Recharts (analytics), Stripe Elements, Web3.js (wallets).
- **Backend**: Node.js, Express.js, Mongoose (MongoDB), Redis client, JWT, bcrypt, Helmet, express-rate-limit, express-validator.
- **Databases**: MongoDB (users, transactions), Redis (tokens, cache).
- **Deployment**: AWS EC2/Vercel (Phase 4), Docker (optional).
- **Tools**: VS Code, Git, Postman (API testing), Figma (wireframes).
- **Version Control**: GitHub repo with branches (main, dev, feature/usdc-binance).

#### 5. Regulatory and Compliance Requirements
- **US**: MSB registration (FinCEN), state MTLs (e.g., California, Texas: $5K–$20K each), AML/KYC (Jumio), report >$10K, comply with GENIUS Act for USDC.
- **Canada**: MSB with FINTRAC ($5K–$10K), appoint compliance officer.
- **Vietnam**: Partner with licensed banks (Techcombank) for VND inflows; USDC via Binance P2P compliant with SBV's 2025 pilot (AML docs for >10,000 USD equiv.).
- **Global**: FATF standards for crypto; no internet access in code interpreter, ensuring data privacy.
- **Audit**: Phase 3 security audits (Snyk), legal review for MSB.

#### 6. Operational Requirements
- **Team**: 3–5 members (dev, compliance officer, UX designer); outsource via Upwork ($50–$100/hour).
- **Budget**: Phase 1: $1.5K–$6.1K; Phase 2: $21K–$48K; Total MVP: $100K–$500K (including $50K–$200K licensing).
- **Timeline**: Phase 1 (2–4 weeks): Complete UVP validation; Phase 2 (8–12 weeks): MVP build; Phase 3 (4–6 weeks): Testing/compliance.
- **Risks**: Regulatory delays (mitigate with partnerships); crypto volatility (USDC is stable); de-banking (use MSB-friendly banks).
- **Monitoring**: Sentry for errors, Prometheus for metrics (Phase 4).

#### 7. Assumptions and Constraints
- **Assumptions**: Users have access to Binance/MetaMask for USDC; Vietnam's crypto laws remain supportive.
- **Constraints**: No additional package installs in code interpreter; focus on USDC-only crypto; budget limits outsourcing.
- **Dependencies**: Binance/Coinbase/Stripe accounts; MSB licensing (deferred).

This requirements document is comprehensive and ready for your Phase 1 business plan. Use it to guide Phase 2 development (e.g., integrate Binance API as shown in prior responses). If you need a downloadable template (e.g., Google Doc link) or refinements (e.g., add user stories), let me know!