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
  const subject = '🔐 Reset Your CanViet Exchange Password';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;
  const text = `Reset your CanViet Exchange password\n\nClick the link to reset your password: ${resetUrl}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.\n\n© 2025 CanViet Exchange. All rights reserved.`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
              <img src="https://canvietexchange.com/logo.png" alt="CanViet Exchange" style="height: 50px; margin-bottom: 20px;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Reset Your Password</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Secure your account in just a few clicks</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
                Hi there! 👋
              </p>
              <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 30px 0;">
                We received a request to reset your CanViet Exchange password. Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetUrl}" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: transform 0.2s;">
                      🔓 Reset My Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Timer Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                      ⏰ <strong>Important:</strong> This link expires in <strong>15 minutes</strong> for your security.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 30px 0 10px 0;">
                Button not working? Copy and paste this link into your browser:
              </p>
              <p style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 13px; color: #3b82f6; border-left: 3px solid #3b82f6; margin: 0 0 30px 0;">
                ${resetUrl}
              </p>
              
              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; border-radius: 8px; margin: 30px 0 0 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
                      🔒 <strong>Didn't request this?</strong> Your account is safe. You can ignore this email, and your password will remain unchanged.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">
                Need help? Contact us at 
                <a href="mailto:support@canvietexchange.com" style="color: #3b82f6; text-decoration: none;">support@canvietexchange.com</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                © 2025 CanViet Exchange. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">
                Secure money transfers from Canada 🇨🇦 to Vietnam 🇻🇳
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return info?.messageId || null;
}

module.exports = { sendOtpEmail, sendPasswordResetEmail, createTransport };
