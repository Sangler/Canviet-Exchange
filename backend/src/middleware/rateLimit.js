const rateLimit = require('express-rate-limit')
const logger = require('../utils/logger')

function onLimitReached(req, res, options) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown'
  logger.warnMeta('Rate limit reached', {
    path: req.originalUrl || req.url,
    method: req.method,
    ip,
    windowMs: options.windowMs,
    max: options.max,
    handler: options.keyPrefix || 'auth',
  })
}

const commonOptions = {
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many requests, please try again later.' })
  },
  onLimitReached,
}

// Stricter for login to slow brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LOGIN_MAX || 10),
  keyGenerator: (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown',
  message: 'Too many login attempts, please try again later.',
  ...commonOptions,
  keyPrefix: 'login',
})

// Registration limiter
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_REGISTER_MAX || 20),
  keyGenerator: (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown',
  message: 'Too many registration attempts, please try again later.',
  ...commonOptions,
  keyPrefix: 'register',
})

module.exports = { loginLimiter, registerLimiter }
