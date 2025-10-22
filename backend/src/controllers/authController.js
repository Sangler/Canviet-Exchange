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
      if (exists.email === emailLower) return res.status(409).json({ message: 'Email already in use' })
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
