const express = require('express')
const router = express.Router()

// Get pending verify-email from session
router.get('/verify-email', (req, res) => {
  const email = req.session?.verifyEmail || null
  res.json({ ok: true, email })
})

// Set pending verify-email in session
router.post('/verify-email', (req, res) => {
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ ok: false, message: 'Email required' })
  req.session.verifyEmail = String(email).toLowerCase()
  res.json({ ok: true })
})

// Clear pending verify-email from session
router.delete('/verify-email', (req, res) => {
  if (req.session) delete req.session.verifyEmail
  res.json({ ok: true })
})

module.exports = router
