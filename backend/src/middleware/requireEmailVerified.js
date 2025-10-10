const User = require('../models/User')

module.exports = async function requireEmailVerified(req, res, next) {
  try {
    const userId = req.auth?.sub
    if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' })
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' })
    if (user.emailVerified) return next()

    const frontend = process.env.FRONTEND_URL || ''
    const nextParam = encodeURIComponent(req.originalUrl || '/')
    const redirectUrl = frontend ? `${frontend}/verify-email?next=${nextParam}` : '/verify-email'
    return res.status(403).json({
      ok: false,
      code: 'EMAIL_VERIFICATION_REQUIRED',
      message: 'Please verify your email to proceed.',
      redirectUrl,
    })
  } catch (e) {
    console.error('requireEmailVerified error', e)
    return res.status(500).json({ ok: false, message: 'Internal server error' })
  }
}
