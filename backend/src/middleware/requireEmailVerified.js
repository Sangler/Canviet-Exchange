const User = require('../models/User')

/**
 * Middleware to check email verification status
 * @param {boolean} shouldBeVerified - If true, requires verified email. If false, requires unverified email.
 */
function requireEmailVerified(shouldBeVerified = true) {
  return async function(req, res, next) {
    try {
      const userId = req.auth?.sub
      
      // If not authenticated and we need unverified, allow access
      if (!userId && !shouldBeVerified) return next()
      
      if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' })
      
      const user = await User.findById(userId)
      if (!user) return res.status(404).json({ ok: false, message: 'User not found' })

      // Check if verification status matches requirement
      if (user.emailVerified === shouldBeVerified) return next()

      const frontend = process.env.FRONTEND_URL || ''
      
      if (shouldBeVerified) {
        // User needs to verify email
        const nextParam = encodeURIComponent(req.originalUrl || '/')
        const redirectUrl = frontend ? `${frontend}/verify-email?next=${nextParam}` : '/verify-email'
        return res.status(403).json({
          ok: false,
          code: 'EMAIL_VERIFICATION_REQUIRED',
          message: 'Please verify your email to proceed.',
          redirectUrl,
        })
      } else {
        // Email already verified, redirect to dashboard
        const redirectUrl = frontend ? `${frontend}/dashboard` : '/dashboard'
        return res.status(403).json({
          ok: false,
          code: 'EMAIL_ALREADY_VERIFIED',
          message: 'Your email is already verified.',
          redirectUrl,
        })
      }
    } catch (e) {
      console.error('requireEmailVerified error', e)
      return res.status(500).json({ ok: false, message: 'Internal server error' })
    }
  }
}

module.exports = requireEmailVerified
