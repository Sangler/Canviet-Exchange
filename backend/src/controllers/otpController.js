const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtpEmail } = require('../services/email');
const { issueOtp, verifyOtp } = require('../services/otp');

const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 300); // 5 min default
const OTP_JWT_SECRET = process.env.OTP_JWT_SECRET || (process.env.JWT_SECRET || 'change-me');
const OTP_PEPPER = process.env.OTP_PEPPER || '';
// Optional min interval removed per requirement (no requestedAt fields)

function generateNumericOtp(len) {
  let code = '';
  while (code.length < len) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code.slice(0, len);
}

function otpHash(code) {
  return crypto.createHash('sha256').update(String(code) + OTP_PEPPER).digest('hex');
}

function createOtpToken(userId, channel, code) {
  const chash = otpHash(code);
  const payload = { sub: userId, channel, chash };
  const token = jwt.sign(payload, OTP_JWT_SECRET, { expiresIn: OTP_TTL_SECONDS });
  return token;
}

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
      console.log('[OTP][PHONE][DEV] Code for', user.phone, '=>', code);
      return res.json({ ok:true, message:'OTP generated (SMS skipped in dev mode)', destination: maskDestination(user.phone), expiresIn: ttl, devMode: true });
    }
    // send via SMS provider here
    return res.json({ ok:true, message:'OTP sent', destination: maskDestination(user.phone), expiresIn: ttl });
  } catch (e) {
    console.error('requestPhoneOtp2 error', e);
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

exports.requestPhoneOtp = async (req, res) => {
  try {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ ok:false, message:'Phone required' });
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ ok:false, message:'User not found' });
    if (user.phoneVerified) return res.json({ ok:true, message:'Already verified' });

  const code = generateNumericOtp(OTP_LENGTH);
  const otpToken = createOtpToken(user.id, 'phone', code);
    // integrate SMS provider (Twilio, etc.)
    console.log('[OTP][PHONE] Code for', user.phone, '=>', code);
  return res.json({ ok:true, message:'OTP sent', destination: maskDestination(user.phone), expiresIn: OTP_TTL_SECONDS, otpToken });
  } catch (e) {
    console.error('requestPhoneOtp error', e);
    return res.status(500).json({ ok:false, message:'Unable to send verification code. Please try again later.' });
  }
};

exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, code, otpToken } = req.body || {};
    if (!phone || !code || !otpToken) return res.status(400).json({ ok:false, message:'Phone, code and otpToken required' });
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ ok:false, message:'User not found' });
    if (user.phoneVerified) return res.json({ ok:true, message:'Already verified' });
    let decoded;
    try {
      decoded = jwt.verify(otpToken, OTP_JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ ok:false, message:'Invalid or expired otpToken' });
    }
    if (decoded.sub !== String(user.id) || decoded.channel !== 'phone') {
      return res.status(400).json({ ok:false, message:'Token does not match user/channel' });
    }
    const valid = decoded.chash === otpHash(code);
    if (!valid) return res.status(401).json({ ok:false, message:'Invalid code' });

    user.phoneVerified = true;
    await user.save();
    return res.json({ ok:true, message:'Phone verified' });
  } catch (e) {
    console.error('verifyPhoneOtp error', e);
    return res.status(500).json({ ok:false, message:'Unable to verify your code. Please try again.' });
  }
};
