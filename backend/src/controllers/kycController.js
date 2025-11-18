const User = require('../models/User');

/**
 * Check KYC status for the authenticated user
 * Returns KYC status and verification URL if needed
 */
exports.checkKycStatus = async (req, res) => {
  try {
    const userId = req.auth?.sub || req.auth?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    // Check if user is already verified
    if (user.KYCStatus === 'verified') {
      return res.json({
        ok: true,
        kycStatus: 'verified',
        message: 'KYC already verified'
      });
    }

    // For demo: Use hardcoded Shufti Pro verification URL
    // In production, you would generate a unique verification URL per user via Shufti Pro API
    const verificationUrl = process.env.SHUFTI_VERIFICATION_URL || 
      'https://app.shuftipro.com/verification/process/SDmvL7nNQu5RcPiwrnqNOb16YeAw5kkyZ86vdFnlNwu7B2Qz4HKd4Va0R3iTfPRt';

    return res.json({
      ok: true,
      kycStatus: user.KYCStatus,
      verificationUrl,
      message: 'KYC verification required'
    });
  } catch (error) {
    console.error('checkKycStatus error:', error);
    return res.status(500).json({ ok: false, message: 'Failed to check KYC status' });
  }
};

/**
 * Update KYC status (for testing/admin purposes)
 * In production, this would be called by Shufti Pro webhook
 */
exports.updateKycStatus = async (req, res) => {
  try {
    const userId = req.auth?.sub || req.auth?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'Authentication required' });
    }

    const { status } = req.body;
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ ok: false, message: 'Invalid KYC status' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    user.KYCStatus = status;
    user.updatedAt = new Date();
    await user.save();

    return res.json({
      ok: true,
      kycStatus: user.KYCStatus,
      message: `KYC status updated to ${status}`
    });
  } catch (error) {
    console.error('updateKycStatus error:', error);
    return res.status(500).json({ ok: false, message: 'Failed to update KYC status' });
  }
};

/**
 * Webhook endpoint for Shufti Pro to call after verification
 * This is where Shufti Pro would POST the verification result
 */
exports.shuftiWebhook = async (req, res) => {
  try {
    // In production, verify the webhook signature from Shufti Pro
    const { reference, event, verification_result } = req.body;

    console.log('[Shufti Webhook] Received:', { reference, event, verification_result });

    // Parse reference to get user ID (format: sp-bc-demo-{userId})
    // For demo, we'll accept any successful verification
    if (event === 'verification.accepted' || verification_result === 'verified') {
      // In production, extract userId from reference and update
      // For demo, return success
      return res.json({ ok: true, message: 'Webhook received' });
    }

    return res.json({ ok: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('shuftiWebhook error:', error);
    return res.status(500).json({ ok: false, message: 'Webhook processing failed' });
  }
};
