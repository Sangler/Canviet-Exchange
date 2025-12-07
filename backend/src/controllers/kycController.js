const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SHUFTI_BASE_URL = 'https://api.shuftipro.com';
const SHUFTI_CLIENT_ID = process.env.SHUFTI_CLIENT_ID || '';
const SHUFTI_SECRET_KEY = process.env.SHUFTI_SECRET_KEY || '';

// Frontend URL for redirects (e.g., https://yourdomain.com). Defaults to prod domain.
const FRONTEND_URL = ((process.env.FRONTEND_URL || 'https://canvietexchange.com').trim()).replace(/\/$/, '');
// Optionally omit redirect_url (use webhook-only flow)
const SHUFTI_OMIT_REDIRECT = false
// Optionally enforce upstream response signature validation (webhooks are always validated)
const SHUFTI_VALIDATE_RESPONSE_SIGNATURE = true

const KYC_IDENTITY_HMAC_SECRET = process.env.KYC_IDENTITY_HMAC_SECRET || '';
// Always allow identityKey generation without document_number (uses NODOC marker)
const KYC_ALLOW_IDKEY_WITHOUT_DOCNUM = true;

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
 * Fields used: country, date of birth, full name (first + last), document number
 */
function computeIdentityKey(verificationResult, backgroundChecksInput) {
  try {
    if (!KYC_IDENTITY_HMAC_SECRET) {
      return null; // Feature disabled if no secret configured
    }
    const docData = verificationResult?.document || {};
    const faceData = verificationResult?.face || {};
    const bgChecks = verificationResult?.background_checks || backgroundChecksInput || {};

    // Normalize DOB from various possible formats
    const normalizeDob = (val) => {
      try {
        if (!val) return ''
        // Shufti may return objects or different field names
        if (typeof val === 'object') {
          // try common keys
          const cand = val.value || val.date || val.dob || val.iso || ''
          if (cand) return normalizeDob(cand)
          // if it looks like a Date object
          if (val instanceof Date) {
            return val.toISOString().slice(0,10)
          }
          return ''
        }
        if (typeof val === 'number') {
          // treat as epoch ms
          return new Date(val).toISOString().slice(0,10)
        }
        if (typeof val === 'string') {
          const s = val.trim()
          if (!s) return ''
          // Accept YYYY-MM-DD or convert from possible formats
          // If contains time, slice
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10)
          // Try Date parse
          const d = new Date(s)
          if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
          return ''
        }
        return ''
      } catch { return '' }
    }

    // Normalize name: remove extra spaces, convert to uppercase, trim
    const normalizeName = (str) => {
      try {
        if (!str) return ''
        return String(str).trim().replace(/\s+/g, ' ').toUpperCase()
      } catch { return '' }
    }

    // Prefer dob from document; fallback to face if provided, then background_checks
    const dob = normalizeDob(
      docData.dob || 
      faceData.dob || 
      verificationResult?.dob || 
      bgChecks?.dob || 
      ''
    );
    
    // Safely extract string fields with multiple fallback paths
    // For driver's license/national ID, country may be in issued_country, name.country, or address fields
    // FALLBACK: Use background_checks.country (from request payload) if document extraction fails
    const countryRaw = docData.country 
      || docData.issued_country 
      || docData.issuing_country
      || docData.name?.country
      || docData.address?.country
      || verificationResult?.country 
      || bgChecks?.country
      || '';
    const country = String(countryRaw).toUpperCase().trim();
    
    // Extract full name from document or face verification; fallback to background checks input
    const nameData = docData.name || faceData.name || verificationResult?.name || bgChecks?.name || {};
    const firstName = normalizeName(nameData.first_name || nameData.firstName || '');
    const lastName = normalizeName(nameData.last_name || nameData.lastName || '');
    
    // Extract document number from multiple possible locations
    // Priority: additional_data (enhanced extraction) -> standard fields
    const additionalData = verificationResult?.additional_data || docData.additional_data || {};
    const verificationData = verificationResult?.verification_data || {};
    let rawNumber = '';
    
    // Check additional_data first (when fetch_enhanced_data: '1' is enabled)
    if (additionalData.document_number) {
      rawNumber = String(additionalData.document_number);
    } else if (verificationData.document_number) {
      rawNumber = String(verificationData.document_number);
    } else {
      // Fallback to standard document fields
      rawNumber = String(docData.document_number || docData.number || docData.document_id || '');
    }
    
    // Normalize: remove spaces, dashes, make uppercase
    rawNumber = rawNumber.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    
    // Handle missing/flagged document number: optionally allow fallback
    let useRawNumber = rawNumber;
    let idKeyMode = 'full';
    if (!useRawNumber || useRawNumber === '1') {
      if (KYC_ALLOW_IDKEY_WITHOUT_DOCNUM) {
        // Mark absence explicitly to avoid collisions and salt the base string
        useRawNumber = 'NODOC';
        idKeyMode = 'fallback_nodoc';
      } else {
        return null;
      }
    }

    if (!country || !dob || !firstName || !lastName) {
      return null;
    }

    // Build identity key: COUNTRY|DOB|FIRSTNAME|LASTNAME|DOCUMENTNUMBER (or NODOC)
    const base = `${country}|${dob}|${firstName}|${lastName}|${useRawNumber}`;
    const identityKey = crypto.createHmac('sha256', KYC_IDENTITY_HMAC_SECRET).update(base).digest('hex');
    return identityKey;
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
      callback_url: `${(process.env.BACKEND_URL || '').replace(/\/$/, '')}/api/kyc/webhook/shufti`,
      ...(SHUFTI_OMIT_REDIRECT ? {} : { redirect_url: redirectUrl }),
      email: user.email,
      country: toIso2Country(user.address?.country || 'CA'),
      language: 'EN',
      verification_mode: 'any',
      fetch_result: '1',
      fetch_enhanced_data: '1',
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
      }
    };

    // Save request payload to logs
    try {
      const logsDir = path.join(__dirname, '../../logs');
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `shufti-request-${reference}-${timestamp}.json`;
      fs.writeFileSync(
        path.join(logsDir, filename),
        JSON.stringify({ ...payload, timestamp: new Date().toISOString() }, null, 2)
      );
    } catch (err) {
      console.error('[Shufti] Failed to save request payload:', err);
    }

    // Call Shufti Pro API (with network error handling)
    let response;
    try {
      response = await fetch(SHUFTI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getShuftiAuthHeader()
        },
        body: JSON.stringify(payload)
      });
    } catch (fetchError) {
      console.error('[Shufti] Network error during API call:', fetchError?.message || fetchError);
      return res.status(502).json({ 
        ok: false, 
        message: 'Unable to reach verification service. Please try again.' 
      });
    }

    // Capture raw response text before parsing for accurate signature calc
    let rawText;
    let data;
    try {
      rawText = await response.text();
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('[Shufti] Failed to parse response:', parseError?.message || parseError);
      return res.status(502).json({ 
        ok: false, 
        message: 'Invalid response from verification service' 
      });
    }

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
        let statusResponse;
        try {
          statusResponse = await fetch(`${SHUFTI_BASE_URL}/status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': getShuftiAuthHeader()
            },
            body: JSON.stringify({ reference: user.KYCReference })
          });
        } catch (fetchError) {
          console.error('[Shufti Status] Network error:', fetchError?.message || fetchError);
          return res.status(502).json({ 
            ok: false, 
            kycStatus: user.KYCStatus,
            message: 'Unable to reach verification service. Please try again.' 
          });
        }

        const statusData = await statusResponse.json();
        
        // Save complete polling response to file for debugging
        try {
          const logsDir = path.join(__dirname, '../../logs');
          if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `shufti-poll-${user.KYCReference}-${timestamp}.json`;
          fs.writeFileSync(
            path.join(logsDir, filename),
            JSON.stringify({ ...statusData, timestamp: new Date().toISOString() }, null, 2)
          );
        } catch (err) {
          console.error('[Shufti Poll] Failed to save response file:', err);
        }
        
        if (statusResponse.ok && statusData.event) {
          // Update user status based on Shufti response
          if (statusData.event === 'verification.accepted') {
            // Extract verified data from verification_data (contains actual values, not flags)
            const verificationData = statusData.verification_data || {};
            const docData = verificationData.document || {};
            const nameData = docData.name || {};
            
            // Check face match confidence (must be >= 80)
            const faceMatchConfidence = docData.face_match_confidence || 0;
            if (faceMatchConfidence < 80) {
              user.KYCRejectionCount = (user.KYCRejectionCount || 0) + 1;
              user.KYCStatus = user.KYCRejectionCount >= 5 ? 'suspended' : 'rejected';
              user.updatedAt = new Date();
              
              try { await user.save(); } catch (_) {}
              
              if (user.KYCStatus === 'suspended') {
                return res.json({
                  ok: true,
                  kycStatus: 'suspended',
                  message: 'Account suspended due to multiple failed verification attempts',
                  code: 'account_suspended',
                  rejectionCount: user.KYCRejectionCount
                });
              }
              
              return res.json({
                ok: true,
                kycStatus: 'rejected',
                message: 'Face match confidence too low. Please try again with better lighting.',
                code: 'face_match_low_confidence',
                rejectionCount: user.KYCRejectionCount,
                remainingAttempts: Math.max(0, 5 - user.KYCRejectionCount)
              });
            }
            
            // Extract name: prioritize first_name/last_name, only use full_name if both are missing
            let firstName = nameData.first_name ? String(nameData.first_name).trim() : null;
            let middleName = nameData.middle_name ? String(nameData.middle_name).trim() : null;
            let lastName = nameData.last_name ? String(nameData.last_name).trim() : null;
            
            // Only fall back to full_name if we don't have both first_name AND last_name
            if (!firstName && !lastName && nameData.full_name) {
              const fullName = String(nameData.full_name).trim();
              const parts = fullName.split(/\s+/);
              if (parts.length > 1) {
                lastName = parts.pop();
                firstName = parts.join(' ');
              } else {
                firstName = fullName;
                lastName = fullName;
              }
            }
            
            // Build synthetic verification_result for identityKey computation
            const syntheticVr = {
              country: statusData.country,
              dob: docData.dob,
              name: {
                first_name: firstName,
                last_name: lastName
              },
              document: {
                dob: docData.dob,
                document_number: docData.document_number,
                name: { first_name: firstName, last_name: lastName, full_name: nameData.full_name }
              }
            };
            
            // Attempt to compute identityKey
            let identityKey = null;
            try {
              const fallback = {
                country: statusData.country,
                dob: docData.dob,
                name: {
                  first_name: firstName,
                  last_name: lastName
                }
              };
              identityKey = computeIdentityKey(syntheticVr, fallback);
            } catch (e) {
              // identityKey computation failed
            }
            
            // Reject if identityKey generation failed
            if (!identityKey) {
              user.KYCRejectionCount = (user.KYCRejectionCount || 0) + 1;
              user.KYCStatus = user.KYCRejectionCount >= 5 ? 'suspended' : 'rejected';
              user.updatedAt = new Date();
              
              try { await user.save(); } catch (_) {}
              
              if (user.KYCStatus === 'suspended') {
                return res.json({
                  ok: true,
                  kycStatus: 'suspended',
                  message: 'Account suspended due to multiple failed verification attempts',
                  code: 'account_suspended',
                  rejectionCount: user.KYCRejectionCount
                });
              }
              
              return res.json({
                ok: true,
                kycStatus: 'rejected',
                message: 'Documentation mismatch. Please try again with valid documents.',
                code: 'documentation_mismatch',
                rejectionCount: user.KYCRejectionCount,
                remainingAttempts: Math.max(0, 5 - user.KYCRejectionCount)
              });
            }

            // Pre-check for duplicate identity using computed key (polling)
            try {
              if (identityKey) {
                const existing = await User.findOne({
                  identityKey,
                  KYCStatus: 'verified',
                  _id: { $ne: user._id }
                }).lean().exec();
                if (existing) {
                  // Increment rejection count
                  user.KYCRejectionCount = (user.KYCRejectionCount || 0) + 1;
                  user.KYCStatus = user.KYCRejectionCount >= 5 ? 'suspended' : 'rejected';
                  user.identityKey = undefined;
                  user.updatedAt = new Date();
                  
                  try { await user.save(); } catch (_) {}
                  
                  if (user.KYCStatus === 'suspended') {
                    return res.json({
                      ok: true,
                      kycStatus: 'suspended',
                      message: 'Account suspended due to multiple duplicate identity attempts',
                      code: 'account_suspended',
                      rejectionCount: user.KYCRejectionCount
                    });
                  }
                  
                  return res.json({
                    ok: true,
                    kycStatus: 'rejected',
                    message: 'Identity already registered with another account',
                    code: 'duplicate_identity',
                    rejectionCount: user.KYCRejectionCount,
                    remainingAttempts: Math.max(0, 5 - user.KYCRejectionCount)
                  });
                }
              }
            } catch (dupErr) {
              console.error('[KYC Poll] Duplicate pre-check error:', dupErr);
            }
              
            // Normalize DOB
            const normalizeDob = (val) => {
              try {
                if (!val) return null;
                if (typeof val === 'object') {
                  const cand = val.value || val.date || val.dob || val.iso || '';
                  if (cand) return normalizeDob(cand);
                  if (val instanceof Date) return val;
                  return null;
                }
                if (typeof val === 'number') return new Date(val);
                if (typeof val === 'string') {
                  const s = val.trim();
                  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
                  const d = new Date(s);
                  return !isNaN(d.getTime()) ? d : null;
                }
                return null;
              } catch { return null; }
            };

            // Overwrite user profile with KYC-verified data (use extracted firstName/lastName)
            if (firstName) user.firstName = String(firstName).trim();
            if (lastName) user.lastName = String(lastName).trim();
            
            const verifiedDob = normalizeDob(docData.dob);
            if (verifiedDob) user.dateOfBirth = verifiedDob;
            
            // Save verified document number (IDNumber)
            try {
              const docNumberRaw = (docData.document_number || '').toString();
              const docNumber = docNumberRaw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
              if (docNumber && docNumber !== '1') {
                user.IDNumber = docNumber;
              }
            } catch (_) {}

            user.KYCStatus = 'verified';
            user.updatedAt = new Date();
            if (identityKey) user.identityKey = identityKey;
            try {
              await user.save();
              
              // Award referral points to both referrer and referred user
              if (user.referredBy) {
                try {
                  // Award 2 points to the referrer (User A)
                  await User.updateOne(
                    { _id: user.referredBy },
                    { $inc: { points: 2 } }
                  );
                  // Award 2 points to the referred user (User B) as welcome bonus
                  await User.updateOne(
                    { _id: user._id },
                    { $inc: { points: 2 } }
                  );
                } catch (pointsErr) {
                  console.warn('Failed to award referral points:', pointsErr?.message);
                }
              }
            } catch (saveErr) {
              if (saveErr && saveErr.code === 11000 && String(saveErr.message).includes('identityKey')) {
                // Duplicate identity detected; align with webhook behavior
                user.KYCRejectionCount = (user.KYCRejectionCount || 0) + 1;
                user.KYCStatus = user.KYCRejectionCount >= 5 ? 'suspended' : 'rejected';
                user.identityKey = undefined;
                
                try { await user.save(); } catch (_) {}
                
                if (user.KYCStatus === 'suspended') {
                  return res.json({
                    ok: true,
                    kycStatus: 'suspended',
                    message: 'Account suspended due to multiple duplicate identity attempts',
                    code: 'account_suspended',
                    rejectionCount: user.KYCRejectionCount
                  });
                }
                
                return res.json({
                  ok: true,
                  kycStatus: 'rejected',
                  message: 'Identity already registered with another account',
                  code: 'duplicate_identity',
                  rejectionCount: user.KYCRejectionCount,
                  remainingAttempts: Math.max(0, 5 - user.KYCRejectionCount)
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

    // Save complete response to file for debugging
    try {
      const logsDir = path.join(__dirname, '../../logs');
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `shufti-webhook-${reference}-${timestamp}.json`;
      fs.writeFileSync(
        path.join(logsDir, filename),
        JSON.stringify({ reference, event, verification_result, declined_reason, timestamp: new Date().toISOString() }, null, 2)
      );
    } catch (err) {
      console.error('[Shufti Webhook] Failed to save response file:', err);
    }

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
      // Webhook only sends flags; poll Shufti to get full verification_data
      let verificationData = {};
      let docData = {};
      let nameData = {};
      let country = req.body?.country || '';
      
      try {
        let statusResponse;
        try {
          statusResponse = await fetch(`${SHUFTI_BASE_URL}/status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': getShuftiAuthHeader()
            },
            body: JSON.stringify({ reference })
          });
        } catch (fetchError) {
          console.error('[Shufti Webhook Poll] Network error:', fetchError?.message || fetchError);
          // Continue with webhook data if poll fails
          throw fetchError;
        }

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          
          // Save webhook poll response to logs for debugging
          try {
            const logsDir = path.join(__dirname, '../../logs');
            if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `shufti-webhook-poll-${reference}-${timestamp}.json`;
            fs.writeFileSync(
              path.join(logsDir, filename),
              JSON.stringify({ ...statusData, timestamp: new Date().toISOString() }, null, 2)
            );
          } catch (logErr) {
            console.error('[Shufti Webhook Poll] Failed to save response file:', logErr);
          }
          
          verificationData = statusData.verification_data || {};
          docData = verificationData.document || {};
          nameData = docData.name || {};
          country = statusData.country || country;
        }
      } catch (pollErr) {
        console.error('[Shufti Webhook] Failed to poll full data:', pollErr);
        // Continue with webhook data if poll fails
      }

      // Check face match confidence (must be >= 80)
      const faceMatchConfidence = docData.face_match_confidence || 0;
      if (faceMatchConfidence < 80) {
        user.KYCRejectionCount = (user.KYCRejectionCount || 0) + 1;
        user.KYCStatus = user.KYCRejectionCount >= 5 ? 'suspended' : 'rejected';
        user.updatedAt = new Date();
        
        try { await user.save(); } catch (_) {}
        
        if (user.KYCStatus === 'suspended') {
          return res.status(403).json({ 
            ok: false, 
            message: 'Account suspended due to multiple failed verification attempts', 
            code: 'account_suspended',
            rejectionCount: user.KYCRejectionCount
          });
        }
        
        return res.status(409).json({ 
          ok: false, 
          message: 'Face match confidence too low. Please try again with better lighting.', 
          code: 'face_match_low_confidence',
          rejectionCount: user.KYCRejectionCount,
          remainingAttempts: Math.max(0, 5 - user.KYCRejectionCount)
        });
      }
      
      // Extract name: prioritize first_name/last_name, only use full_name if both are missing
      let firstName = nameData.first_name ? String(nameData.first_name).trim() : null;
      let middleName = nameData.middle_name ? String(nameData.middle_name).trim() : null;
      let lastName = nameData.last_name ? String(nameData.last_name).trim() : null;
      
      // Only fall back to full_name if we don't have both first_name AND last_name
      if (!firstName && !lastName && nameData.full_name) {
        const fullName = String(nameData.full_name).trim();
        const parts = fullName.split(/\s+/);
        if (parts.length > 1) {
          lastName = parts.pop();
          firstName = parts.join(' ');
        } else {
          firstName = fullName;
          lastName = fullName;
        }
      }

      // Build synthetic verification_result for identityKey computation
      const syntheticVr = {
        country,
        dob: docData.dob,
        name: {
          first_name: firstName,
          last_name: lastName
        },
        document: {
          dob: docData.dob,
          document_number: docData.document_number,
          name: { first_name: firstName, last_name: lastName, full_name: nameData.full_name }
        }
      };

      // Attempt to compute identity fingerprint
      let identityKey = null;
      try {
        const fallback = {
          country,
          dob: docData.dob,
          name: {
            first_name: firstName,
            last_name: lastName
          }
        };
        identityKey = computeIdentityKey(syntheticVr, fallback);
        if (!identityKey) {
          console.warn('[Shufti Webhook] computeIdentityKey returned null. Data:', {
            country,
            dob: docData.dob,
            firstName: nameData.first_name,
            lastName: nameData.last_name,
            documentNumber: docData.document_number
          });
        } else {
          console.log('[Shufti Webhook] Generated identityKey for user:', userId);
        }
      } catch (e) {
        console.error('[Shufti Webhook] Identity key generation error:', e?.message || e);
        // Identity key generation failed - continue without it
      }
      
      // Reject if identityKey generation failed
      if (!identityKey) {
        user.KYCRejectionCount = (user.KYCRejectionCount || 0) + 1;
        user.KYCStatus = user.KYCRejectionCount >= 5 ? 'suspended' : 'rejected';
        user.updatedAt = new Date();
        
        try { await user.save(); } catch (_) {}
        
        if (user.KYCStatus === 'suspended') {
          return res.status(403).json({ 
            ok: false, 
            message: 'Account suspended due to multiple failed verification attempts', 
            code: 'account_suspended',
            rejectionCount: user.KYCRejectionCount
          });
        }
        
        return res.status(409).json({ 
          ok: false, 
          message: 'Documentation mismatch. Please try again with valid documents.', 
          code: 'documentation_mismatch',
          rejectionCount: user.KYCRejectionCount,
          remainingAttempts: Math.max(0, 5 - user.KYCRejectionCount)
        });
      }

      // Pre-check for duplicate identity using computed key (webhook)
      try {
        if (identityKey) {
          const existing = await User.findOne({
            identityKey,
            KYCStatus: 'verified',
            _id: { $ne: userId }
          }).lean().exec();
          if (existing) {
            // Increment rejection count
            user.KYCRejectionCount = (user.KYCRejectionCount || 0) + 1;
            user.KYCStatus = user.KYCRejectionCount >= 5 ? 'suspended' : 'rejected';
            user.identityKey = undefined;
            user.updatedAt = new Date();
            
            try { await user.save(); } catch (_) {}
            
            if (user.KYCStatus === 'suspended') {
              return res.status(403).json({ 
                ok: false, 
                message: 'Account suspended due to multiple duplicate identity attempts', 
                code: 'account_suspended',
                rejectionCount: user.KYCRejectionCount
              });
            }
            
            return res.status(409).json({ 
              ok: false, 
              message: 'Identity already registered with another account', 
              code: 'duplicate_identity',
              rejectionCount: user.KYCRejectionCount,
              remainingAttempts: Math.max(0, 5 - user.KYCRejectionCount)
            });
          }
        }
      } catch (dupErr) {
        console.error('[Shufti Webhook] Duplicate pre-check error:', dupErr);
      }
      
      // Normalize DOB
      const normalizeDob = (val) => {
        try {
          if (!val) return null;
          if (typeof val === 'object') {
            const cand = val.value || val.date || val.dob || val.iso || '';
            if (cand) return normalizeDob(cand);
            if (val instanceof Date) return val;
            return null;
          }
          if (typeof val === 'number') return new Date(val);
          if (typeof val === 'string') {
            const s = val.trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
            const d = new Date(s);
            return !isNaN(d.getTime()) ? d : null;
          }
          return null;
        } catch { return null; }
      };

      user.KYCStatus = 'verified';
      user.updatedAt = new Date();
      if (identityKey) user.identityKey = identityKey;
      
      // Overwrite user profile with KYC-verified data (use extracted firstName/lastName)
      if (firstName) user.firstName = String(firstName).trim();
      if (lastName) user.lastName = String(lastName).trim();
      
      const verifiedDob = normalizeDob(docData.dob);
      if (verifiedDob) user.dateOfBirth = verifiedDob;
      
      // Save live geo country from Shufti (do NOT store document number)
      try {
        // 'country' is set earlier from the webhook or the status poll
        const geoCountryRaw = country || (verification_result?.client?.geo?.country) || '';
        const geoCountryIso = toIso2Country(geoCountryRaw);
        user.lastKycGeo = {
          raw: geoCountryRaw || '',
          iso2: geoCountryIso || '',
        };
      } catch (_) {}
      
      try {
        await user.save();
        
        // Award referral points to both referrer and referred user
        if (user.referredBy) {
          try {
            // Award 2 points to the referrer (User A)
            await User.updateOne(
              { _id: user.referredBy },
              { $inc: { points: 2 } }
            );
            // Award 2 points to the referred user (User B) as welcome bonus
            await User.updateOne(
              { _id: user._id },
              { $inc: { points: 2 } }
            );
          } catch (pointsErr) {
            console.warn('Failed to award referral points:', pointsErr?.message);
          }
        }
      } catch (saveErr) {
        if (saveErr && saveErr.code === 11000 && String(saveErr.message).includes('identityKey')) {
          // Duplicate identity detected: revert status and mark reason
            user.KYCRejectionCount = (user.KYCRejectionCount || 0) + 1;
            user.KYCStatus = user.KYCRejectionCount >= 5 ? 'suspended' : 'rejected';
            // Remove identityKey from this record to avoid future collisions
            user.identityKey = undefined;
            
            try { await user.save(); } catch(e2){ /* final attempt */ }
            
            if (user.KYCStatus === 'suspended') {
              return res.status(403).json({ 
                ok: false, 
                message: 'Account suspended due to multiple duplicate identity attempts', 
                code: 'account_suspended',
                rejectionCount: user.KYCRejectionCount
              });
            }
            
            return res.status(409).json({ 
              ok: false, 
              message: 'Identity already registered with another account', 
              code: 'duplicate_identity',
              rejectionCount: user.KYCRejectionCount,
              remainingAttempts: Math.max(0, 5 - user.KYCRejectionCount)
            });
        }
        console.error('[Shufti Webhook] Save error after verification.accepted:', saveErr);
        return res.status(500).json({ ok: false, message: 'Failed to finalize KYC verification' });
      }
    } else if (event === 'verification.declined') {
      user.KYCStatus = 'rejected';
      user.updatedAt = new Date();
      await user.save();
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
