+-------------------+ +-------------------+ +-------------------+
| User Frontend | | Admin Dashboard | | External APIs |
| (React App) | | (React + Charts) | | - Stripe (Fiat) |
| - Transfer UI |<--->| - Transactions |<--->| - Coinbase (Crypto)|
| - Wallet Connect | | - Analytics | | - Bank Partners |
+-------------------+ +-------------------+ +-------------------+
| |
v v
+-------------------+ +-------------------+
| Backend (Node/Express) |
| - Auth (JWT + Redis) |
| - APIs (Payments, Users) |
| - Security (Rate Limit, Validation) |
+-------------------+  
 |  
 v  
+-------------------+ +-------------------+
| Databases | | Blockchain |
| - MongoDB (Users, | | - Ethereum/Solana|
| Transactions) | | for USDC |
| - Redis (Sessions,| | |
| Cache) | | |
+-------------------+ +-------------------+

CanViet Exchange - Money Transfer Platform
Overview
CanViet Exchange is a secure, low-cost money transfer service for remittances from the US and Canada to Vietnam, leveraging fiat payments (via Stripe) and cryptocurrency (USDC via Coinbase Commerce). Built with the MERN stack (MongoDB, Express.js, React with Next.js, Node.js), Redis for session management and caching, and JWT for robust authentication, CanViet Exchange offers fast, compliant transfers targeting the Vietnamese diaspora ($18B annual remittance market). Key features include an admin dashboard for transaction management and analytics, a user-friendly transfer interface, and strong security measures compliant with fintech standards.
Features

Fiat Payments: Process USD/CAD via Stripe (2.9% + $0.30 fees per transaction).
Crypto Payments: USDC transfers on Ethereum/Solana via Coinbase Commerce (0.1–0.5% fees), reducing costs by 80–90% compared to traditional methods.
Admin Dashboard: View transaction lists, analytics (powered by Recharts), and initiate transfers.
User Interface: Transfer form for fiat and crypto payments, with wallet integration (Web3.js for MetaMask).
Authentication: JWT with access tokens (15-minute expiry) and refresh tokens (7-day expiry, stored in Redis), using HttpOnly, Secure cookies.
Security: Bcrypt for password hashing, Helmet for secure headers, rate-limiting (100 requests/15min), input validation, and PII encryption in MongoDB.
Compliance: Designed for Money Services Business (MSB) licensing with FinCEN (US), FINTRAC (Canada), and Vietnam’s State Bank (SBV), supporting AML/KYC requirements and 2025 crypto regulations (e.g., GENIUS Act).

Project Status

Phase 1 (Completed, 2–4 weeks): Market research, business plan, regulatory checklist (MSB, AML/KYC), wireframes, and pitch deck for $100K–$500K seed funding.
Phase 2 (In Progress, 8–12 weeks): Building MVP with:
Infrastructure: MERN stack, MongoDB (users, transactions), Redis (tokens, cache), Git.
Backend: Express APIs for authentication, payments (Stripe, Coinbase), and transactions.
Frontend: Next.js admin dashboard (transactions, analytics) and user transfer UI.
Crypto: USDC payment flow via Coinbase Commerce and Web3.js.
Partnerships: Mock integration with Vietnam bank APIs (e.g., Techcombank) for VND payouts.

Tech Stack

Frontend: Next.js 14, React, TypeScript, Tailwind CSS, Shadcn UI, Recharts.
Backend: Node.js, Express.js, MongoDB (Mongoose), Redis.
Authentication: JWT, bcrypt, HttpOnly cookies.
Payments: Stripe (fiat), Coinbase Commerce (crypto), Web3.js (wallet integration).
Security: Helmet, express-rate-limit, express-validator for OWASP compliance.
Deployment: Planned for AWS EC2 or Vercel, with Docker support (optional).

Setup Instructions
Prerequisites

Node.js (v20 or higher)
MongoDB (local or MongoDB Atlas, free tier)
Redis (local or Redis Cloud, free tier)
Stripe account (obtain pk*test*... and sk*test*... from dashboard.stripe.com)
Coinbase Commerce API key (from coinbase.com/commerce)
Git

Backend Setup

Clone the repository: git clone <repo-url>
Navigate to backend: cd backend
Install dependencies: npm install
Create .env file in backend/:MONGO*URI=mongodb://localhost:27017/CanViet-Exchange
REDIS_URL=redis://localhost:6379
JWT_SECRET=yourstrongsecret
REFRESH_SECRET=anothersecret
STRIPE_SECRET=sk_test*...
COINBASE_API_KEY=yourkey
PORT=5000
FRONTEND_URL=http://localhost:3000

Start server: npm start (runs Express on http://localhost:5000)

Frontend Setup

Navigate to frontend: cd frontend
Install dependencies: npm install
Create .env file in frontend/:REACT*APP_API_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test*...

Start development server: npm run dev (runs Next.js on http://localhost:3000)

Testing APIs

Use Postman to test endpoints:
Authentication: /api/auth/register, /login, /refresh, /logout
Payments: /api/payments/create-intent (Stripe), /create-crypto-charge (Coinbase)
Transactions: /api/transactions (GET)

Test card for Stripe: 4242424242424242, expiry 12/26, CVC 123 (test mode).

Security

Authentication: JWT access tokens (15m expiry) and refresh tokens (7d, stored in Redis with invalidation support). HttpOnly, Secure cookies for refresh tokens.
Data Protection: MongoDB field-level encryption for PII, bcrypt for password hashing.
API Security: Helmet for secure headers (CSP, X-Frame-Options), rate-limiting (100 requests/15min), input validation via express-validator to prevent XSS and injection.
Compliance: Transaction logging for AML/KYC, ready for MSB licensing and Vietnam’s SBV regulations.

Roadmap

Phase 2 (Ongoing, 8–12 weeks): Complete MVP with admin dashboard, user transfer UI, crypto payments, and mock bank integrations.
Phase 3 (Next, 4–6 weeks): Unit/integration testing (Jest, React Testing Library), security audits (Snyk), and MSB licensing applications.
Phase 4 (Launch, 2 weeks): Deploy to AWS/Vercel, onboard initial users, and launch marketing campaign targeting Vietnamese diaspora.
Phase 5 (Ongoing): Scale to 10K users, add mobile app (React Native), and integrate AI for fraud detection.

Costs

Phase 2: $21K–$48K (developers: $20K–$45K for 2–3 devs at $50–$100/hour, tools: free tiers for MongoDB Atlas, Redis Cloud).
Future Phases: Hosting (~$50/month, AWS/Vercel), licensing ($50K–$200K, deferred to Phase 3).
Total MVP Estimate: $100K–$500K (including licensing, marketing).

Contributing

Fork the repo and create feature branches (feature/<name>).
Submit pull requests with unit tests.
Contact: [your-email] for collaboration or inquiries.

License
MIT License (pending finalization).
