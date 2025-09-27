# NexTransfer Wireframes

This document provides wireframe sketches and layout descriptions for the main user flows and dashboard screens of the NexTransfer platform. These wireframes are based on the requirements in PROJECT_REQUIREMENTS.md and are designed to guide UI/UX development in Figma or similar tools.

---

## 1. User Transfer Flow

**Page: Transfer Money**
- Header: Logo, navigation (Dashboard, Profile, Logout)
- Transfer Form:
  - Amount (input)
  - Currency (dropdown: USD, VND, USDC)
  - Payment Type (radio: Fiat via Stripe, Crypto via USDC)
  - Recipient (bank account, wallet address, or Binance ID)
  - Submit button
- Wallet Connect (if USDC): MetaMask/Web3.js button
- Status/Notifications: Success, error, pending messages
- Recent Transactions: Table/list below form

---

## 2. Admin Dashboard

**Page: Dashboard Overview**
- Sidebar: Navigation (Transactions, Users, Analytics, Settings)
- Main Panel:
  - Transaction List: Table (amount, currency, status, type, date, user)
  - Filters/Search: By date, status, currency
  - Pagination controls
- Analytics Cards:
  - Total Volume (USD/VND/USDC)
  - Success Rate
  - Fiat vs. USDC split (pie chart)
- Recharts Area:
  - Volume over time (line/bar chart)
- User Management:
  - List of users, KYC status, edit/view actions

---

## 3. Profile & History

**Page: User Profile**
- Profile Info: Name, email, KYC status
- Edit Details button
- Transaction History: Table (amount, currency, status, date)
- KYC Verification: Upload ID, status indicator

---

## 4. Authentication

**Pages: Login / Register / Forgot Password**
- Login Form: Email, password, login button
- Register Form: Name, email, password, confirm password
- Forgot Password: Email input, send reset link
- Error/success messages

---

## 5. Mobile Layouts

- Responsive design: Hamburger menu for navigation
- Transfer form and dashboard cards stack vertically
- Tables become scrollable lists

---

## 6. Wireframe Sketches (ASCII)

```
+-------------------------------+
| NexTransfer Dashboard         |
+-------------------------------+
| Sidebar | Main Panel          |
|---------|---------------------|
|         | [Analytics Cards]   |
|         | [Transaction Table] |
|         | [Charts]            |
+-------------------------------+

+-------------------------------+
| Transfer Money                |
+-------------------------------+
| [Form]                       |
| [Wallet Connect]             |
| [Recent Transactions]        |
+-------------------------------+


=== Login Page ===
+-------------------------------+
|  NexTransfer Logo   Tagline: Fast. Low-Cost. Secure.  |
+-------------------------------+
|                               |
|        [Login Card]           |
|                               |
|  Email: [_____________]       |
|  Password: [_____________]    |
|                               |
|  [ Log In ]                   |
|  Forgot Password?             |
|                               |
+-------------------------------+
|  Register  |  Support         |
+-------------------------------+

=== User Transfer Interface ===
+-------------------------------+
|  NexTransfer Logo   [Profile] |
+-------------------------------+
| [Sidebar] | [Transfer Card]   |
| Recent Txn| Amount: [_______] |
| - $100    | Currency: [USD v] |
| - $50     | Type: [Fiat | USDC]|
| [Help]    | Recipient: [_____]|
|           | [Connect Wallet]  |
|           | [Card: Stripe Elements] |
|           | Fee: $0.10 (0.1%) |
|           | Time: Instant     |
|           | [Initiate Transfer] |
+-------------------------------+

=== Admin Dashboard ===
+-------------------------------+
|  NexTransfer Logo   [Admin]   |
+-------------------------------+
| [Sidebar] | [Main Content]    |
| Dashboard | [Transaction Table]|
| Transact. | Amt | Cur | Stat  |
| Users     | $100| USDC| Done  |
| Analytics | $50 | USD | Pend  |
| Settings  | [Page: 1 2 3 >]   |
|           | [Analytics Chart] |
|           | [Recharts: Volume]|
|           | [Initiate Transfer]|
+-------------------------------+
| Version 1.0 | Support         |
+-------------------------------+
```

---

## 7. Design Notes
- Use CoreUI/Material/Ant Design for tables, cards, and forms
- Tailwind CSS for responsive layouts
- Dark/light theme toggle
- Accessibility: WCAG 2.1 compliance

---

**Next Steps:**
- Use these wireframes as a starting point in Figma or your preferred design tool
- Iterate with stakeholders and developers for feedback
- Link wireframes to user stories and requirements in PROJECT_REQUIREMENTS.md
