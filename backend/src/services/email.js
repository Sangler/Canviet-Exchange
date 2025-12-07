const nodemailer = require('nodemailer');

// Email service used to send notifications (uses app-specific password auth)
// Environment variables used:
// - CANVIETEXCHANGE_EMAIL_USER
// - CANVIETEXCHANGE_EMAIL_APP_PASSWORD
// - EMAIL_HOST (optional, default smtp.gmail.com)
// - EMAIL_PORT (optional, default 465)
// - EMAIL_FROM (optional, default uses CANVIETEXCHANGE_EMAIL_USER)

const EMAIL_USER = process.env.CANVIETEXCHANGE_EMAIL_USER;
const EMAIL_PASS = process.env.CANVIETEXCHANGE_EMAIL_APP_PASSWORD;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 465);
const EMAIL_FROM = process.env.EMAIL_FROM || (EMAIL_USER ? `${EMAIL_USER}` : 'no-reply@example.com');

let transporter;

const fs = require('fs');
const path = require('path');

// Prefer logo from backend's public folder; fall back to remote URL
const BACKEND_LOGO_PATH = path.resolve(__dirname, '../public/logo.png');
let LOGO_DATA_URI = 'https://canvietexchange.com/logo.png';
try {
  if (fs.existsSync(BACKEND_LOGO_PATH)) {
    const b = fs.readFileSync(BACKEND_LOGO_PATH);
    LOGO_DATA_URI = `data:image/png;base64,${b.toString('base64')}`;
  }
} catch (e) {
  console.warn('[email] Could not load local logo:', e && e.message);
}

function getTransporter() {
  if (transporter) return transporter;
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('[email] Missing CANVIETEXCHANGE_EMAIL_USER or CANVIETEXCHANGE_EMAIL_APP_PASSWORD. Email disabled.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  // Verify transporter (best-effort)
  transporter.verify().then(() => {
    console.log('[email] SMTP transporter is ready');
  }).catch((err) => {
    console.warn('[email] SMTP verification failed', err && err.message);
  });

  return transporter;
}

async function sendMail({ from, to, cc, subject, text, html }) {
  const t = getTransporter();
  if (!t) return Promise.reject(new Error('Email transporter not configured'));

  const msg = {
    from: from || EMAIL_FROM,
    to,
    cc,
    subject,
    text,
    html,
  };

  try {
    const info = await t.sendMail(msg);
    console.log('[email] Sent:', info.messageId, 'to', to);
    return info;
  } catch (err) {
    console.error('[email] sendMail error', err && err.message);
    throw err;
  }
}

/**
 * Notify the services inbox that a new pending request has been created.
 * @param {Object} opts
 * @param {string} opts.type - request type (eg. 'KYC', 'Transfer')
 * @param {string} opts.userId - user id
 * @param {string} opts.userEmail - user email
 * @param {string} opts.summary - short summary text
 * @param {Object} [opts.payload] - full request object (will be JSON.stringified in body)
 */
async function notifyNewPendingRequest({ type = 'Request', userId, userEmail, summary = '', payload = {} } = {}) {
  const recipient = process.env.CANVIETEXCHANGE_EMAIL_USER || process.env.EMAIL_USER || EMAIL_FROM;
  // Allow configurable CC for notifications; default to the developer's email if not set
  const notifyCc = process.env.CANVIETEXCHANGE_NOTIFY_CC || 'ttsang2811@gmail.com';
  const subject = `[CanViet Exchange] New pending ${type} for review`;

  const plain = `A new ${type} has been created and is pending review.\n\nUser ID: ${userId || 'N/A'}\nUser email: ${userEmail || 'N/A'}\nSummary: ${summary}\n\nPayload (JSON):\n${JSON.stringify(payload || {}, null, 2)}\n\nVisit the admin dashboard to review and action this request.`;

  const html = `<p>A new <strong>${type}</strong> has been created and is pending review.</p>\n  <ul>\n    <li><strong>User ID:</strong> ${userId || 'N/A'}</li>\n    <li><strong>User email:</strong> ${userEmail || 'N/A'}</li>\n    <li><strong>Summary:</strong> ${escapeHtml(summary)}</li>\n  </ul>\n  <h4>Payload</h4>\n  <pre style="white-space:pre-wrap;word-break:break-word;">${escapeHtml(JSON.stringify(payload || {}, null, 2))}</pre>\n  <p>Visit the admin dashboard to review and action this request.</p>`;

  return sendMail({ to: recipient, cc: notifyCc, subject, text: plain, html });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Provide OTP and password reset helpers using the existing transporter
async function sendOtpEmail(to, code) {
  const from = process.env.EMAIL_FROM || EMAIL_FROM;
  const subject = 'Your Email Verification Code';
  const text = `Your verification code is: ${code}`;
  const html = `<div style="font-family: Arial, sans-serif;"><h2>Account Verification</h2><p>Use this code to verify your account:</p><div style="font-size:24px;font-weight:bold;margin:20px 0;">${escapeHtml(code)}</div><p style="color:#666;">This code expires in 5 minutes</p></div>`;
  return sendMail({ from, to, subject, text, html });
}

async function sendPasswordResetEmail(to, resetToken) {
  const from = process.env.EMAIL_FROM || EMAIL_FROM;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;
  const subject = '🔐 Reset Your CanViet Exchange Password';
  const text = `Reset your CanViet Exchange password\n\nClick the link to reset your password: ${resetUrl}\n\nThis link expires in 15 minutes.`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;">` +
    `<div style="text-align:center;padding:20px 0;"><img src="https://canvietexchange.com/logo.png" alt="CanViet Exchange" style="height:50px;"/></div>` +
    `<div style="padding:20px;">` +
    `<h1>Reset Your Password</h1><p>Click the button below to reset your password.</p>` +
    `<p style="text-align:center;"><a href="${resetUrl}" style="background:#1e3a8a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset My Password</a></p>` +
    `<p>If the button doesn't work, copy-paste this URL into your browser: ${escapeHtml(resetUrl)}</p>` +
    `</div></body></html>`;
  return sendMail({ from, to, subject, text, html });
}

module.exports = { sendMail, notifyNewPendingRequest, sendOtpEmail, sendPasswordResetEmail, LOGO_DATA_URI };
