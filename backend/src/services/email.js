const nodemailer = require('nodemailer');

function createTransport() {
  // Read standard uppercase vars, with fallback to lowercase variants present in .env
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT ||465);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;
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

async function sendPasswordResetEmail(to, resetToken) {
  const transporter = createTransport();
  const from = process.env.EMAIL_FROM || 'CanViet Exchange <no-reply@canviet.exchange>';
  const subject = 'Reset Your Password';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;
  const text = `Click the link to reset your password: ${resetUrl}\n\nThis link expires in 15 minutes.`;
  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0;">Reset Your Password</h1>
    </div>
    <div style="padding: 30px; background: #f9f9f9;">
      <p style="font-size: 16px; color: #333;">You requested to reset your password. Click the button below to continue:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
      </div>
      <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p style="color: #667eea; word-break: break-all; font-size: 14px;">${resetUrl}</p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">This link expires in 15 minutes. If you didn't request this, please ignore this email.</p>
    </div>
  </div>`;
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return info?.messageId || null;
}

module.exports = { sendOtpEmail, sendPasswordResetEmail, createTransport };
