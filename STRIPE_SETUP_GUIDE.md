# Stripe Payment Integration - Setup Guide

## Overview
Successfully integrated Stripe Payment Element into the CanViet Exchange transfer flow. This integration provides PCI-compliant card payment processing without storing sensitive card data.

## ✅ Completed Changes

### 1. Dependencies Installed
- **Backend**: `stripe` npm package
- **Frontend**: `@stripe/stripe-js`, `@stripe/react-stripe-js`

### 2. Database Schema Updated
**File**: `backend/src/models/Requests.js`
- Added `paymentIntentId` field (String, indexed, sparse)
- Added `paymentStatus` field (String, enum: pending/succeeded/failed/refunded)

### 3. Backend API Routes
**File**: `backend/src/routes/payments.js` (NEW)
- `POST /api/payments/create-intent` - Creates Stripe PaymentIntent
- `POST /api/payments/confirm` - Verifies payment status

**File**: `backend/src/app.js`
- Mounted payment routes: `app.use('/api/payments', paymentsRoutes)`

### 4. Frontend Components
**File**: `frontend/components/StripePaymentForm.tsx` (NEW)
- Secure payment form using Stripe Payment Element
- Handles payment confirmation and error states

**File**: `frontend/pages/transfers.tsx`
- Added Stripe imports and initialization
- Added payment state variables: `clientSecret`, `paymentIntentId`, `paymentStatus`, `paymentProcessing`
- Added `createPaymentIntent()` function
- Added `handlePaymentSuccess()` and `handlePaymentError()` callbacks
- Auto-creates payment intent when card is selected
- Replaced insecure card inputs with Stripe Payment Element
- Includes payment data in final transfer submission

### 5. Environment Configuration
**File**: `backend/.env.example`
- Added `STRIPE_SECRET_KEY` placeholder
- Added `STRIPE_PUBLISHABLE_KEY` placeholder

## 🔧 Required Setup Steps

### Step 1: Get Stripe API Keys
1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Developers** → **API keys**
3. Copy your **Publishable key** (starts with `pk_test_...` for test mode)
4. Click "Reveal test key" and copy your **Secret key** (starts with `sk_test_...`)

### Step 2: Configure Environment Variables

**Backend** (`nexTranfer/backend/.env`):
```bash
# Add these lines to your .env file (NOT .env.example)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

**Important**: 
- Use **test keys** (prefix `sk_test_` and `pk_test_`) for development
- Use **live keys** (prefix `sk_live_` and `pk_live_`) only for production
- Never commit `.env` file to Git (already in `.gitignore`)

### Step 3: Restart Development Servers
```powershell
# Stop current servers (Ctrl+C in both terminals)

# Restart backend
cd c:\Users\ttsan\Desktop\CanVietExchange\nexTranfer\backend
npm run dev

# Restart frontend (in new terminal)
cd c:\Users\ttsan\Desktop\CanVietExchange\nexTranfer\frontend
npm run dev
```

## 🧪 Testing the Integration

### Test Cards (Stripe Test Mode)
Use these test card numbers in development:

| Card Number | Scenario | Expected Result |
|-------------|----------|-----------------|
| `4242 4242 4242 4242` | Success | Payment succeeds |
| `4000 0025 0000 3155` | 3D Secure | Requires authentication |
| `4000 0000 0000 9995` | Declined | Card declined |
| `4000 0000 0000 0069` | Expired | Card expired |

**Expiration Date**: Any future date (e.g., `12/25`)  
**CVV**: Any 3 digits (e.g., `123`)  
**ZIP**: Any valid postal code

### Testing Flow
1. Go to `/transfers` page
2. Fill in amount (e.g., $100 CAD)
3. Click "Continue" to payment step
4. Select "Debit card" or "Credit card"
5. Wait for Stripe Payment Element to load (should appear automatically)
6. Enter test card `4242 4242 4242 4242`
7. Enter future expiration (e.g., `12/25`) and any CVV (e.g., `123`)
8. Click "Confirm Payment"
9. Alert should show: "Payment successful! Please complete the recipient details."
10. Complete recipient info and submit transfer
11. Verify in database that `paymentIntentId` and `paymentStatus` are saved

### Verify in Stripe Dashboard
1. Go to https://dashboard.stripe.com/test/payments
2. You should see your test payment listed
3. Click to view details and confirm amount matches

## 🔒 Security Model

### PCI Compliance
- **PCI SAQ A** compliance achieved (simplest level)
- Card data **never touches your servers**
- Stripe.js tokenizes cards entirely client-side
- Only payment references stored in your database

### Data Storage
| Data Type | Stored Where | Example |
|-----------|--------------|---------|
| Card number | ❌ Never stored | N/A |
| CVV | ❌ Never stored | N/A |
| Expiration | ❌ Never stored | N/A |
| Payment Intent ID | ✅ MongoDB | `pi_3Abc123...` |
| Payment Status | ✅ MongoDB | `succeeded` |
| Full payment details | ✅ Stripe servers (encrypted) | View in dashboard |

## 📝 How It Works

### Payment Flow
```
1. User selects "Debit card" or "Credit card"
   ↓
2. Frontend auto-calls POST /api/payments/create-intent
   ↓
3. Backend creates Stripe PaymentIntent, returns clientSecret
   ↓
4. Frontend renders Stripe Payment Element (secure iframe)
   ↓
5. User enters card details → Stripe.js confirms payment
   ↓
6. On success: Move to recipient details (Step 3.1)
   ↓
7. User completes recipient info and clicks final submit
   ↓
8. POST /api/requests includes paymentIntentId + paymentStatus
   ↓
9. Transfer saved to MongoDB with payment reference
```

### Code Integration Points

**When card selected** (`transfers.tsx` line ~192):
```tsx
useEffect(() => {
  if (isCardPayment && step === 3 && !clientSecret) {
    createPaymentIntent(); // Auto-creates payment intent
  }
}, [transferMethod, step]);
```

**Payment confirmation** (`StripePaymentForm.tsx` line ~25):
```tsx
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  redirect: 'if_required'
});
```

**Final submission** (`transfers.tsx` line ~598):
```tsx
const requestData = {
  // ...other fields
  ...(isCard && paymentIntentId && {
    paymentIntentId: paymentIntentId,
    paymentStatus: paymentStatus
  })
};
```

## 🐛 Troubleshooting

### "Stripe has not loaded yet"
- Check `STRIPE_PUBLISHABLE_KEY` is set in `.env`
- Verify key starts with `pk_test_` or `pk_live_`
- Check browser console for Stripe.js loading errors

### Payment Intent creation fails
- Check `STRIPE_SECRET_KEY` is set in backend `.env`
- Verify key starts with `sk_test_` or `sk_live_`
- Check backend console logs for error details
- Ensure backend is running and `/api/payments/create-intent` is accessible

### Payment Element not appearing
- Check browser console for React errors
- Verify `clientSecret` state is populated
- Ensure `@stripe/react-stripe-js` is installed: `npm list @stripe/react-stripe-js`

### "Payment failed" error
- Check Stripe Dashboard logs: https://dashboard.stripe.com/test/logs
- Verify you're using valid test card numbers
- Check network tab for API response errors

## 🚀 Production Checklist

Before going live:
- [ ] Replace test keys with live keys in production `.env`
- [ ] Test with real cards in Stripe test mode first
- [ ] Enable Stripe Radar for fraud detection
- [ ] Set up webhook endpoint for async payment updates (optional)
- [ ] Configure email receipts in Stripe Dashboard
- [ ] Test 3D Secure authentication flow
- [ ] Review Stripe Dashboard settings (currency, business info)
- [ ] Set up backup payment method (e.g., EFT remains available)

## 📚 Additional Resources

- [Stripe Payment Element Docs](https://stripe.com/docs/payments/payment-element)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [PCI Compliance Guide](https://stripe.com/docs/security/guide)
- [Stripe Dashboard](https://dashboard.stripe.com)

## 🎉 Success!

Your Stripe integration is complete. Card payments will now:
1. Process securely through Stripe
2. Store only payment references in your database
3. Never expose sensitive card data to your servers
4. Provide instant payment confirmation
5. Track payment status for each transfer

All files have been updated and the system is ready for testing!
