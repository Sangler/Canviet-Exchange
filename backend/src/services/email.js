const nodemailer = require('nodemailer');

function createTransport() {
  // Read standard uppercase vars, with fallback to lowercase variants present in .env
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!host || !user || !pass) {
    throw new Error('EMAIL_HOST/EMAIL_USER/EMAIL_PASS must be set');
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for others
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
