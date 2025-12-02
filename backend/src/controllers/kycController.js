const User = require('../models/User');
const crypto = require('crypto');

const SHUFTI_BASE_URL = 'https://api.shuftipro.com';
const SHUFTI_CLIENT_ID = process.env.SHUFTI_CLIENT_ID || '';
const SHUFTI_SECRET_KEY = process.env.SHUFTI_SECRET_KEY || '';

// Frontend URL for redirects (e.g., https://yourdomain.com). Defaults to prod domain.
const FRONTEND_URL = ((process.env.FRONTEND_URL || 'https://canvietexchange.com').trim()).replace(/\/$/, '');
// Toggle poll mode to avoid webhook during dev when callback domain cannot be whitelisted
const SHUFTI_POLL_MODE = (() => {
  const v = String(process.env.SHUFTI_POLL_MODE || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
})();
// Optionally omit redirect_url even when not in poll mode (use webhook-only flow)
const SHUFTI_OMIT_REDIRECT = (() => {
  const v = String(process.env.SHUFTI_OMIT_REDIRECT || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
})();
// Optionally enforce upstream response signature validation (webhooks are always validated)
const SHUFTI_VALIDATE_RESPONSE_SIGNATURE = (() => {
  const v = String(process.env.SHUFTI_VALIDATE_RESPONSE_SIGNATURE || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
})();

const KYC_IDENTITY_HMAC_SECRET = process.env.KYC_IDENTITY_HMAC_SECRET || '';

// Normalize country input to ISO-3166 alpha-2 code
function toIso2Country(input) {
  try {
    if (!input) return ''
    const s = String(input).trim().toUpperCase()
    if (s.length === 2) return s
    // Simple common-name mapper; extend as needed
    const map = {
      CANADA: 'CA',
      VIETNAM: 'VN',
      'UNITED STATES': 'US',
      USA: 'US',
      'UNITED KINGDOM': 'GB',
      UK: 'GB',
      FRANCE: 'FR'
    }
    return map[s] || ''
  } catch { return '' }
}

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
 * Build a privacy-preserving identity fingerprint using verified KYC attributes.
 * We deliberately avoid storing raw PII in the fingerprint.
 * Fields used (if present): document type, issuing country, document number, date of birth.
 */
function computeIdentityKey(verificationResult) {
  try {
    if (!KYC_IDENTITY_HMAC_SECRET) {
      console.warn('[KYC] identityKey disabled: missing KYC_IDENTITY_HMAC_SECRET')
      return null; // Feature disabled if no secret configured
    }
    const docData = verificationResult?.document || {};
    const faceData = verificationResult?.face || {};
    // Prefer dob from document; fallback to face if provided
    const dob = (docData.dob || faceData.dob || '').trim();
    const country = (docData.country || verificationResult?.country || '').toUpperCase().trim();
    const docType = (docData.selected_type || docData.type || '').toUpperCase().trim();
    // Normalize document number: remove spaces, dashes, make uppercase
    const rawNumber = (docData.document_number || docData.number || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    if (!country || !docType || !rawNumber || !dob) {
      const missing = [];
      if (!country) missing.push('country');
      if (!docType) missing.push('docType');
      if (!rawNumber) missing.push('document_number');
      if (!dob) missing.push('dob');
      console.warn('[KYC] identityKey inputs missing:', missing, 'verificationResult keys:', Object.keys(verificationResult || {}))
      return null; // Need all to reduce false positives
    }
    const base = `${docType}|${country}|${rawNumber}|${dob}`;
    return crypto.createHmac('sha256', KYC_IDENTITY_HMAC_SECRET).update(base).digest('hex');
  } catch (e) {
    console.error('[KYC] computeIdentityKey error:', e);
    return null;
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
    
    // TEMPORARY: Comment out redirect_url until domain is registered in Shufti Pro dashboard
    // To use redirect_url, you MUST register your domain in Shufti Pro:
    // 1. Login to https://backoffice.shuftipro.com/
    // 2. Go to Settings → Redirect URLs
    // 3. Add: localhost:3000 (for development) or yourdomain.com (for production)

    
    // Build redirect URL using configured FRONTEND_URL (works with tunnels/no port)
    const redirectUrl = `${FRONTEND_URL}/kyc-callback`;
    const payload = {
      reference,
      // In poll mode, omit callback_url to bypass webhook domain whitelisting
      ...(SHUFTI_POLL_MODE ? {} : { callback_url: `${(process.env.BACKEND_URL || '').replace(/\/$/, '')}/api/kyc/webhook/shufti` }),
      // Omit redirect_url in poll mode or when SHUFTI_OMIT_REDIRECT is enabled
      ...((SHUFTI_POLL_MODE || SHUFTI_OMIT_REDIRECT) ? {} : { redirect_url: redirectUrl }),
      email: user.email,
      country: toIso2Country(user.address?.country || 'CA'),
      language: 'EN',
      verification_mode: 'any',
      allow_offline: '0',
      allow_online: '1',
      show_privacy_policy: '1',
      show_results: '1',
      show_consent: '1',
      show_feedback_form: '0',
      face: { proof: '' },
      document: {
        proof: '',
        supported_types: ['id_card', 'driving_license', 'passport'],
        name: '',
        dob: '',
        document_number: '',
        expiry_date: ''
      },
      background_checks: {
        name: {
          first_name: user.firstName || '',
          last_name: user.lastName || ''
        },
        dob: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : '',
        country: toIso2Country(user.address?.country || 'CA')
      }
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

    // Capture raw response text before parsing for accurate signature calc
    const rawText = await response.clone().text();
    const data = (() => {
      try { return JSON.parse(rawText); } catch { return {}; }
    })();

    if (!response.ok) {
      console.error('[Shufti] API error:', data);
      return res.status(response.status).json({ 
        ok: false, 
        message: data.message || 'Failed to create verification request' 
      });
    }

    // Validate Shufti response signature (backend-only, optional)
    try {
      const signature = response.headers.get('Signature') || response.headers.get('signature');
      const secretHash = crypto.createHash('sha256').update(SHUFTI_SECRET_KEY).digest('hex');
      const calculated = crypto.createHash('sha256').update(rawText + secretHash).digest('hex');
      if (!signature || calculated !== signature) {
        const msg = '[Shufti] Response signature validation failed';
        if (SHUFTI_VALIDATE_RESPONSE_SIGNATURE) {
          console.error(msg);
          return res.status(502).json({ ok: false, message: 'Upstream signature validation failed' });
        } else {
          console.warn(msg + ' (continuing; validation disabled)');
        }
      }
    } catch (sigErr) {
      if (SHUFTI_VALIDATE_RESPONSE_SIGNATURE) {
        console.error('[Shufti] Signature validation error:', sigErr);
        return res.status(502).json({ ok: false, message: 'Signature validation error' });
      } else {
        console.warn('[Shufti] Signature validation error (continuing; disabled):', sigErr?.message || sigErr);
      }
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
            // Attempt to compute identityKey when using polling (or if available here)
            let identityKey = null;
            try {
              const vr = statusData.verification_result || statusData.result || statusData.data || null;
              if (vr) identityKey = computeIdentityKey(vr);
            } catch (e) {
              // best-effort only
            }

            user.KYCStatus = 'verified';
            user.updatedAt = new Date();
            if (identityKey) user.identityKey = identityKey;
            try {
              await user.save();
            } catch (saveErr) {
              if (saveErr && saveErr.code === 11000 && String(saveErr.message).includes('identityKey')) {
                // Duplicate identity detected; align with webhook behavior
                user.KYCStatus = 'rejected';
                user.KYCDeclinedReason = 'duplicate_identity';
                user.identityKey = undefined;
                try { await user.save(); } catch (_) {}
                return res.json({
                  ok: true,
                  kycStatus: 'rejected',
                  message: 'Identity already registered with another account',
                  code: 'duplicate_identity'
                });
              }
              // Other errors
              return res.status(500).json({ ok: false, message: 'Failed to finalize KYC verification' });
            }

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
      // Attempt to compute identity fingerprint
      let identityKey = null;
      try {
        identityKey = computeIdentityKey(verification_result);
      } catch (e) {
        console.warn('[Shufti Webhook] Identity key generation failed:', e?.message);
      }

      user.KYCStatus = 'verified';
      user.updatedAt = new Date();
      if (identityKey) user.identityKey = identityKey;
      try {
        await user.save();
        console.log(`[Shufti Webhook] User ${userId} KYC verified${identityKey ? ' (identityKey set)' : ''}`);
      } catch (saveErr) {
        if (saveErr && saveErr.code === 11000 && String(saveErr.message).includes('identityKey')) {
          // Duplicate identity detected: revert status and mark reason
            user.KYCStatus = 'rejected';
            user.KYCDeclinedReason = 'duplicate_identity';
            // Remove identityKey from this record to avoid future collisions
            user.identityKey = undefined;
            try { await user.save(); } catch(e2){ /* final attempt */ }
            console.warn(`[Shufti Webhook] Duplicate identity detected for user ${userId}. Marked as rejected.`);
            return res.status(409).json({ ok: false, message: 'Identity already registered with another account', code: 'duplicate_identity' });
        }
        console.error('[Shufti Webhook] Save error after verification.accepted:', saveErr);
        return res.status(500).json({ ok: false, message: 'Failed to finalize KYC verification' });
      }
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
