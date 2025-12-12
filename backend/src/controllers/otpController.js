const User = require('../models/User');
const { sendOtpEmail } = require('../services/email');
const { issueOtp, verifyOtp } = require('../services/otp');

// Twilio SMS sender (simple wrapper)
let twilioClient = null;
try {
  const twilio = require('twilio');
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} catch (e) {
}

async function sendSms(phone, code) {
  if (!twilioClient) {
    throw new Error('Twilio not configured');
  }
  const from = process.env.TWILIO_PHONE_NUMBER;
  const body = `Your CanViet Exchange verification code is: ${code}`;
  await twilioClient.messages.create({ from, to: phone, body });
}

const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 60); // 1 min default

function maskDestination(value) {
  if (!value) return '';
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    return local[0] + '***@' + domain;
  }
  return value.slice(0,2) + '***' + value.slice(-2);
}

// Redis-backed flow: Email OTP (issue)
exports.requestEmailOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok:false, message:'Email required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ ok:false, message:'User not found' });
    if (user.emailVerified) return res.json({ ok:true, message:'Already verified' });

    const { code, ttl } = await issueOtp(user.id, 'email-verify', OTP_LENGTH);
    try {
      await sendOtpEmail(user.email, code);
      return res.json({ ok:true, message:'OTP sent', destination: maskDestination(user.email), expiresIn: ttl });
    } catch (err) {
      const devSkip = (process.env.EMAIL_DEV_MODE || 'false').toLowerCase() === 'true';
      if (devSkip) {
        return res.json({ ok:true, message:'OTP generated (email skipped in dev mode)', destination: maskDestination(user.email), expiresIn: ttl, devMode: true, code });
      }
      return res.status(500).json({ ok:false, message:'Failed to send verification email' });
    }
  } catch (e) {
    console.error('requestEmailOtp2 error', e);
    return res.status(500).json({ ok:false, message:'Unable to process your request. Please try again later.' });
  }
};

// Redis-backed flow: Email OTP (verify)
exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ ok:false, message:'Email and code required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ ok:false, message:'User not found' });
    if (user.emailVerified) return res.json({ ok:true, message:'Already verified' });

    const result = await verifyOtp(user.id, 'email-verify', String(code));
    if (!result.ok) {
      const map = {
        'expired-or-missing': 410,
        'too-many-attempts': 429,
        invalid: 401,
        'concurrent-update': 409,
      };
      return res.status(map[result.reason] || 400).json({ ok:false, message: result.reason });
    }
    user.emailVerified = true;
    await user.save();
    return res.json({ ok:true, message:'Email verified' });
  } catch (e) {
    console.error('verifyEmailOtp error', e);
    return res.status(500).json({ ok:false, message:'Unable to verify your code. Please try again.' });
  }
};

// Redis-backed flow: Phone OTP (issue)
exports.requestPhoneOtp2 = async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ ok:false, message:'Phone required' });
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ ok:false, message:'User not found' });
    if (user.phoneVerified) return res.json({ ok:true, message:'Already verified' });

    const { code, ttl } = await issueOtp(user.id, 'phone-verify', OTP_LENGTH);
    // integrate SMS provider; for now log in dev
    const devSkip = (process.env.SMS_DEV_MODE || 'true').toLowerCase() === 'true';
    if (devSkip) {
      return res.json({ ok:true, message:'OTP generated (SMS skipped in dev mode)', destination: maskDestination(user.phone), expiresIn: ttl, devMode: true });
    }
    // send via SMS provider here
    return res.json({ ok:true, message:'OTP sent', destination: maskDestination(user.phone), expiresIn: ttl });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Unable to send verification code. Please try again later.' });
  }
};

// Redis-backed flow: Phone OTP (verify)
exports.verifyPhoneOtp2 = async (req, res) => {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) return res.status(400).json({ ok:false, message:'Phone and code required' });
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ ok:false, message:'User not found' });
    if (user.phoneVerified) return res.json({ ok:true, message:'Already verified' });

    const result = await verifyOtp(user.id, 'phone-verify', String(code));
    if (!result.ok) {
      const map = {
        'expired-or-missing': 410,
        'too-many-attempts': 429,
        invalid: 401,
        'concurrent-update': 409,
      };
      return res.status(map[result.reason] || 400).json({ ok:false, message: result.reason });
    }
    user.phoneVerified = true;
    await user.save();
    return res.json({ ok:true, message:'Phone verified' });
  } catch (e) {
    console.error('verifyPhoneOtp2 error', e);
    return res.status(500).json({ ok:false, message:'Unable to verify your code. Please try again.' });
  }
};

// Redis-backed flow: Phone OTP (request) - uses authenticated user
exports.requestPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ ok:false, message:'Phone required' });
    
    // Get user from auth token instead of phone lookup (user may not have phone in DB yet)
    const userId = req.auth?.sub || req.auth?.id;
    if (!userId) return res.status(401).json({ ok:false, message:'Authentication required' });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok:false, message:'User not found' });
    if (user.phoneVerified) return res.json({ ok:true, message:'Already verified', code: 'PHONE_ALREADY_VERIFIED' });

    const { code, ttl } = await issueOtp(user.id, 'phone-verify', OTP_LENGTH);
    
    // Send SMS via Twilio
    const devSkip = (process.env.SMS_DEV_MODE || 'false').toLowerCase() === 'true';
    if (devSkip) {
      return res.json({ ok:true, message:'OTP generated (SMS skipped in dev mode)', destination: maskDestination(phone), expiresIn: ttl, devMode: true, code });
    }
    
    // Send via Twilio SMS
    try {
      await sendSms(phone, code);
      return res.json({ ok:true, message:'OTP sent via SMS', destination: maskDestination(phone), expiresIn: ttl });
    } catch (smsErr) {
      // Return generic error to user, but OTP is still stored in Redis
      return res.status(500).json({ ok:false, message:'Failed to send SMS. Please check Twilio credentials or enable SMS_DEV_MODE.' });
    }
  } catch (e) {
    // Check for Redis rate limit error
    if (e.message && e.message.includes('already issued')) {
      return res.status(429).json({ ok:false, message:'Code already sent. Please wait before requesting another.' });
    }
    return res.status(500).json({ ok:false, message:'Unable to send verification code. Please try again later.' });
  }
};

// Redis-backed flow: Phone OTP (verify) - uses authenticated user
exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) return res.status(400).json({ ok:false, message:'Phone and code required' });
    
    // Get user from auth token
    const userId = req.auth?.sub || req.auth?.id;
    if (!userId) return res.status(401).json({ ok:false, message:'Authentication required' });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok:false, message:'User not found' });
    if (user.phoneVerified) return res.json({ ok:true, message:'Already verified', code: 'PHONE_ALREADY_VERIFIED' });

    const result = await verifyOtp(user.id, 'phone-verify', String(code));
    if (!result.ok) {
      const map = {
        'expired-or-missing': 410,
        'too-many-attempts': 429,
        invalid: 401,
        'concurrent-update': 409,
      };
      return res.status(map[result.reason] || 400).json({ ok:false, message: result.reason });
    }
    
    // Parse phone number (format: +1xxxxxxxxxx)
    const raw = String(phone || '').trim();
    const digits = raw.replace(/\D/g, '');
    const phoneNumber = digits.slice(-10);
    const ccDigits = digits.slice(0, digits.length - 10);
    const countryCode = ccDigits.length > 0 ? `+${ccDigits}` : '+1';
    
    // Validate phone number format
    if (!phoneNumber || phoneNumber.length !== 10) {
      return res.status(400).json({ ok:false, message:'Invalid phone number format' });
    }
    
    // Check if phone number is already in use by another user
    const exists = await User.findOne({ 'phone.phoneNumber': phoneNumber, _id: { $ne: userId } });
    if (exists) {
      return res.status(409).json({ ok:false, message:'Phone number already in use by another account' });
    }
    
    // Save phone number and mark as verified
    user.phone = { countryCode, phoneNumber };
    user.phoneVerified = true;
    await user.save();
    return res.json({ ok:true, message:'Phone verified and saved' });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Unable to verify your code. Please try again.' });
  }
};
