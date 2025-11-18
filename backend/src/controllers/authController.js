const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Must match the default in middleware/auth.js to avoid invalid token verification
const JWT_SECRET = process.env.JWT_SECRET || ''
const ACCESS_EXPIRES = process.env.ACCESS_EXPIRES || '15m'
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || ''

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES })
}

function applyPepper(password) {
  return PASSWORD_PEPPER ? `${password}${PASSWORD_PEPPER}` : password
}

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, dateOfBirth, address } = req.body || {}
    if (!email || !password || !lastName) {
      return res.status(400).json({ message: 'Email, password and lastName are required' })
    }

    const emailLower = String(email).toLowerCase()

    // Check for existing user by email or phone (if provided)
    const or = [{ email: emailLower }]
    if (phone) or.push({ phone })
    const exists = await User.findOne({ $or: or })
    if (exists) {
      if (exists.email === emailLower) {
        // SECURITY RULE: Block registration if email is already used by Google OAuth account
        if (exists.authProvider === 'google') {
          return res.status(409).json({ message: 'This email is already registered. Please back to sign-in.' })
        }
        return res.status(409).json({ message: 'Email already in use' })
      }
      if (phone && exists.phone === phone) return res.status(409).json({ message: 'Phone already in use' })
      return res.status(409).json({ message: 'User already exists' })
    }

  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(applyPepper(password), salt)

    const user = await User.create({
      email: emailLower,
      firstName: firstName || '',
      lastName,
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
      address: address || undefined,
      passwordHash,
      authProvider: 'local', // Mark as traditional registration
    })
    
  const token = createToken({ sub: user.id, email: user.email, role: user.role })
    return res.json({ token, user: user.toJSON() })
  } catch (err) {
    if (err && err.code === 11000) {
      // Handle unique index conflicts for email/phone
      const key = err.keyPattern ? Object.keys(err.keyPattern)[0] : undefined
      if (key === 'email') return res.status(409).json({ message: 'Email already in use' })
      if (key === 'phone') return res.status(409).json({ message: 'Phone already in use' })
      return res.status(409).json({ message: 'User already exists' })
    }
    console.error('Register error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, phone, password } = req.body || {}
    if ((!email && !phone) || !password) return res.status(400).json({ message: 'Email/phone and password required' })

    let user = null
    if (email) user = await User.findOne({ email: email.toLowerCase() })
    if (!user && phone) user = await User.findOne({ phone })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    // SECURITY RULE: If logging in with phone, verify that phone is verified
    if (phone && (!user.phone || !user.phoneVerified)) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Check if user has a password hash (required for password login)
    // Google users who have set a password via reset flow can login with email/password
    if (!user.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // First try with pepper (if configured), then fall back to legacy compare
    let ok = await bcrypt.compare(applyPepper(password), user.passwordHash)
    if (!ok) {
      const legacyOk = await bcrypt.compare(password, user.passwordHash)
      if (!legacyOk) return res.status(401).json({ message: 'Invalid credentials' })
      ok = true
      // Seamless upgrade: if pepper is set, rehash with pepper and save
      if (PASSWORD_PEPPER) {
        try {
          const salt = await bcrypt.genSalt(10)
          user.passwordHash = await bcrypt.hash(applyPepper(password), salt)
          await user.save()
        } catch (e) {
          // Non-fatal if rehash fails; proceed with login
          console.warn('Password rehash (pepper upgrade) failed:', e?.message)
        }
      }
    }

  const token = createToken({ sub: user.id, email: user.email, role: user.role })
    return res.json({ token, user: user.toJSON() })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

exports.googleOAuth = async (req, res) => {
  try {
    const token = jwt.sign(
      {
        sub: req.user._id,
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_EXPIRES || '15m' }
    )
    // Redirect to frontend app with token as query param.
    // Frontend will read the token and complete sign-in (set cookie/localStorage etc.).
    const frontend = process.env.FRONTEND_URL || ''
    const redirectUrl = `${frontend.replace(/\/$/, '')}/oauth-callback?token=${encodeURIComponent(token)}`
    return res.redirect(redirectUrl)
  } catch (error) {
    console.error('OAuth callback error:', error)
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`)
  }
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    const emailLower = String(email).toLowerCase()
    const user = await User.findOne({ email: emailLower })

    // SECURITY: Always return success even if user not found (avoid email enumeration)
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' })
    }


    // Generate JWT token with 15m expiry
    const resetToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        purpose: 'password-reset'
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    )

    // Send email with reset link
    const { sendPasswordResetEmail } = require('../services/email')
    await sendPasswordResetEmail(user.email, resetToken)

    return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' })
  } catch (err) {
    console.error('Forgot password error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

exports.validateResetToken = async (req, res) => {
  try {
    const { token } = req.params
    if (!token) {
      return res.status(400).json({ valid: false, message: 'Token is required' })
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET)

    // Check purpose
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ valid: false, message: 'Invalid token' })
    }

    // Verify user still exists
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(400).json({ valid: false, message: 'Invalid token' })
    }


    return res.json({ valid: true, email: user.email })
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(400).json({ valid: false, message: 'Token is invalid or expired' })
    }
    console.error('Validate reset token error:', err)
    return res.status(500).json({ valid: false, message: 'Internal server error' })
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params
    const { password } = req.body || {}

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET)

    // Check purpose
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid token' })
    }

    // Find user
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(400).json({ message: 'Invalid token' })
    }

    // This enables them to login with email/password OR continue using Google OAuth

    // Hash new password using same method as register
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(applyPepper(password), salt)

    // Update password
    user.passwordHash = passwordHash
    await user.save()

    return res.json({ message: 'Password reset successfully. You can now log in with your new password.' })
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token is invalid or expired' })
    }
    console.error('Reset password error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}