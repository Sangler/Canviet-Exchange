const express = require('express')
const router = express.Router()

// SMTP verify helper
router.get('/smtp-verify', async (_req, res) => {
  try {
    const { createTransport } = require('../services/email')
    const transporter = createTransport()
    const ok = await transporter.verify()
    res.json({ ok: !!ok, user: process.env.EMAIL_USER, host: process.env.EMAIL_HOST, port: Number(process.env.EMAIL_PORT || 465) })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) })
  }
})

// OAuth config helper
router.get('/oauth-config', (_req, res) => {
  res.json({
    googleConfigured: !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET),
    callbackUrl: process.env.GOOGLE_OAUTH_REDIRECT_URI || '/api/auth/google/callback',
    frontendUrl: process.env.FRONTEND_URL,
  })
})

module.exports = router
