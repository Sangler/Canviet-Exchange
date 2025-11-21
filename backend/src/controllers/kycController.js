const User = require('../models/User');
const crypto = require('crypto');

const SHUFTI_BASE_URL = 'https://api.shuftipro.com';
const SHUFTI_CLIENT_ID = process.env.SHUFTI_CLIENT_ID || '';
const SHUFTI_SECRET_KEY = process.env.SHUFTI_SECRET_KEY || '';

/**
 * Generate Basic Auth header for Shufti Pro API
 */
function getShuftiAuthHeader() {
  const auth = `${SHUFTI_CLIENT_ID}:${SHUFTI_SECRET_KEY}`;
  const encoded = Buffer.from(auth).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Validate Shufti Pro webhook signature
 * Clients registered after March 15, 2023 use: hash('sha256', response + hash('sha256', secret_key))
 */
function validateShuftiSignature(responseBody, signatureHeader) {
  try {
    const responseString = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
    
    // Hash the secret key first (for accounts created after March 15, 2023)
    const hashedSecret = crypto.createHash('sha256').update(SHUFTI_SECRET_KEY).digest('hex');
    
    // Concatenate response + hashed secret and hash again
    const calculatedSignature = crypto.createHash('sha256')
      .update(responseString + hashedSecret)
      .digest('hex');
    
    return calculatedSignature === signatureHeader;
  } catch (error) {
    console.error('[Shufti] Signature validation error:', error);
    return false;
  }
}

/**
 * Create a verification request with Shufti Pro
 * Returns verification URL for the user to complete KYC
 */
exports.createVerification = async (req, res) => {
  try {
    const userId = req.auth?.sub || req.auth?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    // Check if already verified
    if (user.KYCStatus === 'verified') {
      return res.json({
        ok: true,
        kycStatus: 'verified',
        message: 'KYC already verified'
      });
    }

    // Build verification request payload
    const reference = `cvx-${userId}-${Date.now()}`;
    
    // Build payload - callback_url is optional for development
    // IMPORTANT: To use callback_url, you MUST register it in Shufti Pro dashboard:
    // 1. Login to https://backoffice.shuftipro.com/
    // 2. Go to Settings → Webhooks/API Settings
    // 3. Add your callback domain (e.g., http://localhost:5000 or https://yourdomain.com)
    // 
    // For development without registered callback, we'll omit callback_url
    // You can manually check status using GET /api/kyc/status endpoint
    
    const payload = {
      reference,
      // callback_url: omitted until registered in Shufti dashboard
      email: user.email,
      country: 'CA', // Canada
      language: 'EN',
      verification_mode: 'any', // on-site or off-site
      face: {
        proof: '' // empty means user will upload during verification
      },
      document: {
        proof: '',
        supported_types: ['id_card', 'passport', 'driving_license'],
        name: '',
        dob: '',
        document_number: '',
        expiry_date: ''
      }
      // Address verification removed - user will provide address proof during verification
      // Shufti requires full_address to be populated if address service is requested
      // Without pre-filled data, it's better to let user upload address proof document only
    };

    console.log('[Shufti] Creating verification for user:', userId, 'reference:', reference);

    // Call Shufti Pro API
    const response = await fetch(SHUFTI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getShuftiAuthHeader()
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Shufti] API error:', data);
      return res.status(response.status).json({ 
        ok: false, 
        message: data.message || 'Failed to create verification request' 
      });
    }

    // Update user with reference and pending status
    user.KYCStatus = 'pending';
    user.KYCReference = reference;
    user.updatedAt = new Date();
    await user.save();

    return res.json({
      ok: true,
      kycStatus: 'pending',
      verificationUrl: data.verification_url,
      reference,
      message: 'Verification request created successfully'
    });

  } catch (error) {
    console.error('[Shufti] createVerification error:', error);
    return res.status(500).json({ ok: false, message: 'Failed to create verification request' });
  }
};

/**
 * Check KYC status for the authenticated user
 * Returns current status and verification URL if needed
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

    // If already verified, return status
    if (user.KYCStatus === 'verified') {
      return res.json({
        ok: true,
        kycStatus: 'verified',
        message: 'KYC already verified'
      });
    }

    // If user has a pending verification, check its status with Shufti
    if (user.KYCReference) {
      try {
        const statusResponse = await fetch(`${SHUFTI_BASE_URL}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': getShuftiAuthHeader()
          },
          body: JSON.stringify({ reference: user.KYCReference })
        });

        const statusData = await statusResponse.json();
        
        if (statusResponse.ok && statusData.event) {
          // Update user status based on Shufti response
          if (statusData.event === 'verification.accepted') {
            user.KYCStatus = 'verified';
            await user.save();
            return res.json({
              ok: true,
              kycStatus: 'verified',
              message: 'KYC verification completed'
            });
          } else if (statusData.event === 'verification.declined') {
            user.KYCStatus = 'rejected';
            await user.save();
            return res.json({
              ok: true,
              kycStatus: 'rejected',
              message: 'KYC verification was declined',
              declinedReason: statusData.declined_reason
            });
          }
        }
      } catch (statusError) {
        console.error('[Shufti] Status check error:', statusError);
        // Continue to return current status if status check fails
      }
    }

    // User needs to start or has pending verification
    return res.json({
      ok: true,
      kycStatus: user.KYCStatus || 'not_started',
      message: 'KYC verification required'
    });

  } catch (error) {
    console.error('[Shufti] checkKycStatus error:', error);
    return res.status(500).json({ ok: false, message: 'Failed to check KYC status' });
  }
};

/**
 * Update KYC status (for testing/admin purposes)
 * In production, status is updated via webhook
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
    console.error('[Shufti] updateKycStatus error:', error);
    return res.status(500).json({ ok: false, message: 'Failed to update KYC status' });
  }
};

/**
 * Webhook endpoint for Shufti Pro to call after verification
 * Validates signature and updates user KYC status
 */
exports.shuftiWebhook = async (req, res) => {
  try {
    const signature = req.headers['signature'] || req.headers['Signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Validate webhook signature
    if (!validateShuftiSignature(rawBody, signature)) {
      console.error('[Shufti Webhook] Invalid signature');
      return res.status(401).json({ ok: false, message: 'Invalid signature' });
    }

    const { reference, event, verification_result, declined_reason } = req.body;

    console.log('[Shufti Webhook] Received:', { reference, event, verification_result });

    if (!reference) {
      return res.status(400).json({ ok: false, message: 'Missing reference' });
    }

    // Extract userId from reference (format: cvx-{userId}-{timestamp})
    const parts = reference.split('-');
    if (parts.length < 2 || parts[0] !== 'cvx') {
      console.error('[Shufti Webhook] Invalid reference format:', reference);
      return res.status(400).json({ ok: false, message: 'Invalid reference format' });
    }

    const userId = parts[1];
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('[Shufti Webhook] User not found:', userId);
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    // Update user KYC status based on event
    if (event === 'verification.accepted') {
      user.KYCStatus = 'verified';
      user.updatedAt = new Date();
      await user.save();
      console.log(`[Shufti Webhook] User ${userId} KYC verified`);
    } else if (event === 'verification.declined') {
      user.KYCStatus = 'rejected';
      user.KYCDeclinedReason = declined_reason || 'Verification declined';
      user.updatedAt = new Date();
      await user.save();
      console.log(`[Shufti Webhook] User ${userId} KYC declined:`, declined_reason);
    } else if (event === 'request.pending') {
      user.KYCStatus = 'pending';
      user.updatedAt = new Date();
      await user.save();
    }

    return res.json({ ok: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('[Shufti Webhook] Error:', error);
    return res.status(500).json({ ok: false, message: 'Webhook processing failed' });
  }
};
