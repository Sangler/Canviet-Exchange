const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')

// JWT_SECRET is validated at startup in app.js - no fallback needed for security
const JWT_SECRET = process.env.JWT_SECRET
const ACCESS_EXPIRES = process.env.ACCESS_EXPIRES || '30m'
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || ''

function getCookieOptions() {
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' }
  if (process.env.COOKIE_DOMAIN) opts.domain = process.env.COOKIE_DOMAIN
  return opts
}

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES })
}

// In-memory one-time token store for development-only exchange flow.
// Map: otk -> { token, createdAt }
const oneTimeTokenStore = new Map()

function createOneTimeKey(token) {
  const otk = crypto.randomBytes(24).toString('hex')
  oneTimeTokenStore.set(otk, { token, createdAt: Date.now() })
  // Auto-expire after 5 minutes
  setTimeout(() => oneTimeTokenStore.delete(otk), 5 * 60 * 1000)
  return otk
}

function applyPepper(password) {
  return PASSWORD_PEPPER ? `${password}${PASSWORD_PEPPER}` : password
}

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, dateOfBirth, address } = req.body || {}
    // Optional referral code from body or query
    const referralInput = (req.body?.ref || req.body?.referral || req.body?.referralCode || req.query?.ref || req.query?.referral || req.query?.referralCode || '').toString().trim()
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

    // Resolve referredBy if referral code provided
    let referredById = null
    if (referralInput) {
      try {
        const referrer = await User.findOne({ referralCode: referralInput }).select('_id').lean().exec()
        if (referrer) referredById = referrer._id
      } catch {}
    }

    const user = await User.create({
      email: emailLower,
      firstName: firstName || '',
      lastName,
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
      address: address || undefined,
      passwordHash,
      authProvider: 'local', // Mark as traditional registration
      referredBy: referredById || undefined,
    })
    // If referred, add to referrer's referrals list (best-effort, don't block registration)
    if (referredById) {
      try {
        await User.updateOne({ _id: referredById }, { $addToSet: { referrals: user._id } }).exec()
      } catch (e) {
      }
    }

    
  const token = createToken({ sub: user.id, email: user.email, role: user.role })
    // Set HttpOnly cookie for access token so frontend can use credentialed requests
    try {
      res.cookie('access_token', token, getCookieOptions())
    } catch (e) {}
    return res.json({ token, user: user.toJSON() })
  } catch (err) {
    if (err && err.code === 11000) {
      // Handle unique index conflicts for email/phone
      const key = err.keyPattern ? Object.keys(err.keyPattern)[0] : undefined
      if (key === 'email') return res.status(409).json({ message: 'Email already in use' })
      if (key === 'phone') return res.status(409).json({ message: 'Phone already in use' })
      return res.status(409).json({ message: 'User already exists' })
    }
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
        }
      }
    }

  const token = createToken({ 
    sub: user.id, 
    email: user.email, 
    role: user.role, 
    firstName: user.firstName,
    kycStatus: user.KYCStatus,
    suspended: user.KYCStatus === 'suspended'
  })
    // Set HttpOnly cookie for access token so frontend can use credentialed requests
    try {
      res.cookie('access_token', token, getCookieOptions())
    } catch (e) {}
    return res.json({ token, user: user.toJSON() })
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' })
  }
}

exports.googleOAuth = async (req, res) => {
  try {
    // Best-effort referral linking using state parameter
    const referralInput = (req.query?.state || req.query?.ref || '').toString().trim()
    if (referralInput && req.user && req.user._id) {
      try {
        const user = await User.findById(req.user._id)
        if (user && !user.referredBy) {
          const referrer = await User.findOne({ referralCode: referralInput }).select('_id').lean().exec()
          if (referrer && String(referrer._id) !== String(user._id)) {
            user.referredBy = referrer._id
            await user.save()
            await User.updateOne({ _id: referrer._id }, { $addToSet: { referrals: user._id } }).exec()
          }
        }
      } catch (e) {
      }
    }
    // Create access token (payload consistent with login)
    const token = createToken({
      sub: req.user._id,
      email: req.user.email,
      role: req.user.role,
      firstName: req.user.firstName,
      kycStatus: req.user.KYCStatus,
      suspended: req.user.KYCStatus === 'suspended'
    })

    const frontend = (process.env.FRONTEND_URL || '').replace(/\/$/, '')

    // Production: prefer HttpOnly cookie only and redirect cleanly
    if (process.env.NODE_ENV === 'production') {
      console.log('[AUTH] googleOAuth - production: setting HttpOnly cookie and redirecting to frontend oauth-callback')
      res.cookie('access_token', token, getCookieOptions())
      return res.redirect(`${frontend}/oauth-callback`)
    }

    // Development: create a one-time key (OTK) and return that in query string
    // so frontend can POST it to /api/auth/exchange to receive HttpOnly cookie.
    const otk = createOneTimeKey(token)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] googleOAuth - development: generated otk=${otk} for user=${req.user?._id}`)
      return res.redirect(`${frontend}/oauth-callback?otk=${otk}`)
    }
    // In production this code path should not be reached (production uses HttpOnly cookie redirect)
    return res.redirect(`${frontend}/oauth-callback`)
  } catch (error) {
    console.error('[AUTH] googleOAuth error', error && (error.stack || error))
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
      { expiresIn: '30m' }
    )

    // Send email with reset link. Failures to send email should not leak
    // information or cause a 500 — log the error and still return success
    const { sendPasswordResetEmail } = require('../services/email')
    try {
      await sendPasswordResetEmail(user.email, resetToken)
    } catch (emailErr) {
      console.error('[AUTH] sendPasswordResetEmail error for', user.email, emailErr && (emailErr.stack || emailErr.message || emailErr))
      // Continue — we intentionally return a generic success message below
    }

    return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' })
  } catch (err) {
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
    return res.status(500).json({ message: 'Internal server error' })
  }
}

exports.validateReferralCode = async (req, res) => {
  try {
    const code = (req.query.code || req.params.code || '').toString().trim().toUpperCase()
    
    if (!code) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Referral code is required' 
      })
    }
    
    if (code.length !== 10) {
      return res.json({ 
        valid: false, 
        message: 'Referral code must be 10 characters' 
      })
    }
    
    const referrer = await User.findOne({ referralCode: code })
      .select('firstName lastName referralCode')
      .lean()
    
    if (!referrer) {
      return res.json({ 
        valid: false, 
        message: 'Invalid referral code' 
      })
    }
    
    return res.json({ 
      valid: true, 
      referrer: {
        firstName: referrer.firstName,
        lastName: referrer.lastName
      },
      message: `You'll be referred by ${referrer.firstName} ${referrer.lastName}`
    })
  } catch (error) {
    return res.status(500).json({ 
      valid: false, 
      message: 'Error validating referral code' 
    })
  }
}

// Return authenticated user's profile. Protected by auth middleware.
exports.me = async (req, res) => {
  try {
    // Prevent conditional GET/304 responses for /api/users/me so frontend always receives JSON
    res.set('Cache-Control', 'no-store')
    console.log('[AUTH] /api/users/me called - auth present:', !!req.auth, 'user present:', !!req.user)
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' })
    // Load full user from DB to provide authoritative fields (emailVerified, address, KYCStatus, etc.)
    const userId = req.user.id || req.user._id || req.auth?.sub
    if (!userId) return res.status(401).json({ message: 'Unauthenticated' })
    const fullUser = await User.findById(userId)
    if (!fullUser) return res.status(404).json({ message: 'User not found' })

    // Determine profile completeness (same rules as usersController.isProfileComplete)
    const isProfileComplete = (u) => {
      if (!u) return false
      if (!u.dateOfBirth) return false
      const addr = u.address || {}
      if (addr.country === 'Vietnam') {
        const hasAddr = addr.street && addr.country
        if (!hasAddr) return false
      } else {
        const hasAddr = addr.street && addr.postalCode && addr.city && addr.country
        if (!hasAddr) return false
      }
      if (!u.employmentStatus) return false
      return true
    }

    return res.json({ user: fullUser.toJSON(), complete: isProfileComplete(fullUser) })
  } catch (e) {
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Logout: clear access_token cookie
exports.logout = async (req, res) => {
  try {
    res.clearCookie('access_token', { path: '/' })
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Exchange a development one-time key (OTK) for the HttpOnly access_token cookie.
// This endpoint is intentionally simple and only intended for non-production dev flows
// where cookies may not be preserved through tunneling (ngrok). The stored token
// is opaque (OTK) and expires automatically.
exports.exchangeOneTimeToken = async (req, res) => {
  try {
    // Disable OTK exchange in production by default — allow when explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_OTK_EXCHANGE !== 'true') {
      return res.status(404).json({ message: 'Not found' })
    }
    const { otk } = req.body || {}
    if (!otk) {
      console.warn('[AUTH] exchangeOneTimeToken called without otk')
      return res.status(400).json({ message: 'otk required' })
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] exchangeOneTimeToken - received otk=${otk}`)
    } else {
      console.log('[AUTH] exchangeOneTimeToken called')
    }
    const entry = oneTimeTokenStore.get(otk)
    if (!entry || !entry.token) {
      console.warn('[AUTH] exchangeOneTimeToken - invalid or expired otk')
      return res.status(400).json({ message: 'Invalid or expired otk' })
    }
    const token = entry.token
    // Set HttpOnly cookie (mirror production flags as much as possible)
    try {
      res.cookie('access_token', token, getCookieOptions())
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AUTH] exchangeOneTimeToken - set HttpOnly access_token cookie')
        try {
          const sc = res.getHeader && res.getHeader('set-cookie')
          console.log('[AUTH] exchangeOneTimeToken - response Set-Cookie header:', sc)
        } catch (e) {}
      }
    } catch (e) {
      console.error('[AUTH] exchangeOneTimeToken - failed to set cookie', e && (e.stack || e))
    }
    // Consume the one-time key
    oneTimeTokenStore.delete(otk)
    return res.json({ ok: true })
  } catch (e) {
    console.error('[AUTH] exchangeOneTimeToken error', e && (e.stack || e))
    return res.status(500).json({ message: 'Internal server error' })
  }
}