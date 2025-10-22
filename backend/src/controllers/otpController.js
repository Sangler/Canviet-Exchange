const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtpEmail } = require('../services/email');

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

exports.requestEmailOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok:false, message:'Email required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ ok:false, message:'User not found' });
    if (user.emailVerified) return res.json({ ok:true, message:'Already verified' });

  const code = generateNumericOtp(OTP_LENGTH);
  const otpToken = createOtpToken(user.id, 'email', code);

    // Send verification email (Nodemailer)
    try {
      await sendOtpEmail(user.email, code);
      return res.json({ ok:true, message:'OTP sent', destination: maskDestination(user.email), expiresIn: OTP_TTL_SECONDS, otpToken });
    } catch (err) {
      console.error('Failed to send verification email:', err?.message || err);
      const devSkip = (process.env.EMAIL_DEV_MODE || 'false').toLowerCase() === 'true';
      if (devSkip) {
        console.warn('[OTP][EMAIL] EMAIL_DEV_MODE=true, skipping email send and returning OTP token for development');
        return res.json({ ok:true, message:'OTP generated (email skipped in dev mode)', destination: maskDestination(user.email), expiresIn: OTP_TTL_SECONDS, otpToken, devMode: true });
      }
      return res.status(500).json({ ok:false, message:'Failed to send verification email' });
    }
  } catch (e) {
    console.error('requestEmailOtp error', e);
    return res.status(500).json({ ok:false, message:'Internal error' });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, code, otpToken } = req.body || {};
    if (!email || !code || !otpToken) return res.status(400).json({ ok:false, message:'Email, code and otpToken required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ ok:false, message:'User not found' });
    if (user.emailVerified) return res.json({ ok:true, message:'Already verified' });
    let decoded;
    try {
      decoded = jwt.verify(otpToken, OTP_JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ ok:false, message:'Invalid or expired otpToken' });
    }
    if (decoded.sub !== String(user.id) || decoded.channel !== 'email') {
      return res.status(400).json({ ok:false, message:'Token does not match user/channel' });
    }
    const valid = decoded.chash === otpHash(code);
    if (!valid) return res.status(401).json({ ok:false, message:'Invalid code' });

    user.emailVerified = true;
    await user.save();
    return res.json({ ok:true, message:'Email verified' });
  } catch (e) {
    console.error('verifyEmailOtp error', e);
    return res.status(500).json({ ok:false, message:'Internal error' });
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
    // TODO: integrate SMS provider (Twilio, etc.)
    console.log('[OTP][PHONE] Code for', user.phone, '=>', code);
  return res.json({ ok:true, message:'OTP sent', destination: maskDestination(user.phone), expiresIn: OTP_TTL_SECONDS, otpToken });
  } catch (e) {
    console.error('requestPhoneOtp error', e);
    return res.status(500).json({ ok:false, message:'Internal error' });
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
    return res.status(500).json({ ok:false, message:'Internal error' });
  }
};
