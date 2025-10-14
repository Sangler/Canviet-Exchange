const nodemailer = require('nodemailer');

function createTransport() {
  // Mock mode for local development/testing without real SMTP
  if (String(process.env.EMAIL_MOCK).toLowerCase() === 'true') {
    return {
      // Simulate nodemailer API
      async sendMail() {
        const messageId = `mock-${Date.now()}`;
        console.log('[EMAIL_MOCK] sendMail called. Returning messageId:', messageId);
        return { messageId };
      },
      async verify() {
        console.log('[EMAIL_MOCK] verify called. Returning true.');
        return true;
      },
    };
  }
  // Read standard uppercase vars, with fallback to lowercase variants present in .env
  const host = process.env.EMAIL_HOST || process.env.emailHost;
  const port = Number(process.env.EMAIL_PORT || process.env.emailPort || 465);
  const user = process.env.EMAIL_USER || process.env.emailUser;
  // Prefer Gmail App Password when provided; strip spaces commonly shown by Google (e.g. "abcd efgh ijkl mnop")
  const rawAppPass = process.env.EMAIL_APP_PASSWORD || process.env.emailAppPassword;
  const sanitizedAppPass = rawAppPass ? String(rawAppPass).replace(/\s+/g, '') : undefined;
  const pass = sanitizedAppPass || process.env.EMAIL_PASS || process.env.emailPass;
  if (!host || !user || !pass) {
    throw new Error('EMAIL_HOST, EMAIL_USER, and EMAIL_PASS or EMAIL_APP_PASSWORD must be set');
  }
  // Allow overriding secure via env; default to true for 465
  const secureEnv = process.env.EMAIL_SECURE;
  const secure = typeof secureEnv !== 'undefined' ? /^(true|1|yes)$/i.test(String(secureEnv)) : port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for others (unless overridden)
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
  return transporter;
}

async function sendOtpEmail(to, code) {
  const transporter = createTransport();
  const from = process.env.EMAIL_FROM || 'CanViet Exchange <no-reply@canviet.exchange>';
  const subject = 'Your Email Verification Code';
  const text = `Your verification code is: ${code}`;
  const html = `<div style="font-family: Arial, sans-serif;">
    <h2>Account Verification</h2>
    <p>Use this code to verify your account:</p>
    <div style="font-size: 24px; font-weight: bold; margin: 20px 0;">${code}</div>
    <p style="color: #666;">This code expires in 5 minutes</p>
  </div>`;
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return info?.messageId || null;
}

module.exports = { sendOtpEmail, createTransport };
