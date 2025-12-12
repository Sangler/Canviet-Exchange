const rateLimit = require('express-rate-limit')
const logger = require('../utils/logger')

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown'
}

function buildLimiter(name, { windowMs, max }) {
  return rateLimit({
    windowMs,
    // express-rate-limit v7 uses `max` as the correct parameter (not `limit`).
    // Using `max` here as required by the installed version.
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => getClientIp(req),
    handler: (req, res) => {
      const ip = getClientIp(req)
      logger.warnMeta('Rate limit reached', {
        name,
        path: req.originalUrl || req.url,
        method: req.method,
        ip,
        windowMs,
        max,
      })
      res.status(429).json({ message: 'Too many requests, please try again later.' })
    },
  })
}

// Stricter for login to slow brute force
const loginLimiter = buildLimiter('login', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LOGIN_MAX || 10),
})

// Registration limiter
const registerLimiter = buildLimiter('register', {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: Number(process.env.RATE_REGISTER_MAX || 20),
})

// Transfer request limiter - prevent spam
const transferLimiter = buildLimiter('transfer', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_TRANSFER_MAX || 10),
})

// Payment intent creation limiter
const paymentLimiter = buildLimiter('payment', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_PAYMENT_MAX || 20),
})

// Referral validation limiter - prevent enumeration attacks
const referralLimiter = buildLimiter('referral', {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: Number(process.env.RATE_REFERRAL_MAX || 100),
})

module.exports = { loginLimiter, registerLimiter, transferLimiter, paymentLimiter, referralLimiter }
