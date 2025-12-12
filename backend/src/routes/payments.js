const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const authMiddleware = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimit');

// Initialize Stripe with secret key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set in environment variables!');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

/**
 * POST /api/payments/create-intent
 * Creates a Stripe PaymentIntent for the transfer amount
 * 
 * Expected request body:
 * {
 *   amount: number (CAD amount in dollars, e.g., 100.50)
 * }
 * 
 * Returns:
 * {
 *   clientSecret: string (used by Stripe Payment Element on frontend)
 * }
 */
router.post('/create-intent', authMiddleware, paymentLimiter, async (req, res) => {
  try {
    const { amount } = req.body;

    // Validation: principal must be within allowed range 50 - 9999 CAD
    if (!amount || typeof amount !== 'number' || amount < 50 || amount > 9999) {
      return res.status(400).json({ 
        error: 'Invalid amount. Amount must be a number between 50 and 9,999 CAD.' 
      });
    }

    // Server-side fee and tax policy
    const TRANSFER_FEE_CAD = 150; // fixed transfer service fee in CAD
    const TAX_RATE = 0.13; // 13% tax applied to transfer fee

    // Convert to cents
    const principalCents = Math.round(amount * 100);
    const feeCents = Math.round(TRANSFER_FEE_CAD * 100);
    const taxCents = Math.round(Math.round(TRANSFER_FEE_CAD * 100) * TAX_RATE);
    const totalCents = principalCents + feeCents + taxCents;

    // Create PaymentIntent charging: principal + fee + tax
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'cad',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.auth?.id || req.auth?.userId || 'unknown',
        userEmail: req.auth?.email || 'unknown',
        principal_cad: String(amount),
        principal_cents: String(principalCents),
        transfer_fee_cad: String(TRANSFER_FEE_CAD),
        transfer_fee_cents: String(feeCents),
        tax_rate: String(TAX_RATE),
        tax_cents: String(taxCents),
        total_cents: String(totalCents)
      }
    });

    // Return client secret for frontend along with breakdown
    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      breakdown: {
        principal: amount,
        transferFee: TRANSFER_FEE_CAD,
        taxRate: TAX_RATE,
        tax: (taxCents / 100)
      }
    });

  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to create payment intent'
      // Do not expose error details to client for security
    });
  }
});

/**
 * POST /api/payments/confirm
 * Verifies payment status before allowing transfer submission
 * 
 * Expected request body:
 * {
 *   paymentIntentId: string
 * }
 * 
 * Returns:
 * {
 *   status: string ('succeeded', 'pending', 'failed'),
 *   paymentIntent: object (Stripe PaymentIntent object)
 * }
 */
router.post('/confirm', authMiddleware, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ 
        error: 'Payment intent ID is required' 
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({
      status: paymentIntent.status,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ 
      error: 'Failed to confirm payment'
      // Do not expose error details to client for security
    });
  }
});

module.exports = router;
