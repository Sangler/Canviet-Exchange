require('dotenv').config()

// Validate required environment variables at startup
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'MONGODB_URI',
  'STRIPE_SECRET_KEY',
  'CANVIETEXCHANGE_EMAIL_USER',
  'CANVIETEXCHANGE_EMAIL_APP_PASSWORD'
];

const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
  process.exit(1);
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET.length < 32) {
  process.exit(1);
}

const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const helmet = require('helmet')
const mongoose = require('mongoose')
const passport = require('./config/passport')
const authRoutes = require('./routes/auth')
const usersRoutes = require('./routes/users')
const adminRoutes = require('./routes/admin')
const otpRoutes = require('./routes/otp')
const transfersRoutes = require('./routes/transfers')
const requestsRoutes = require('./routes/requests')
const fxRoutes = require('./routes/fx')
const kycRoutes = require('./routes/kyc')
const paymentsRoutes = require('./routes/payments')
const contributionsRoutes = require('./routes/contributions')
const User = require('./models/User')
const { connectMongo } = require('./db/mongoose')


const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())

// Simple request logger for development/troubleshooting
app.use((req, res, next) => {
  try {
    const start = Date.now();
    // Mask potentially sensitive fields
    const safeBody = (() => {
      try {
        if (!req.body) return undefined
        const b = { ...req.body }
        if (b.password) b.password = '***'
        if (b.token) b.token = '***'
        if (b.accessToken) b.accessToken = '***'
        return b
      } catch (e) { return undefined }
    })()

    console.log(`[HTTP IN] ${req.ip} ${req.method} ${req.protocol}://${req.get('host')}${req.originalUrl} query=${JSON.stringify(req.query)} body=${safeBody ? JSON.stringify(safeBody) : ''}`)
    res.on('finish', () => {
      const ms = Date.now() - start
      console.log(`[HTTP OUT] ${req.ip} ${req.method} ${req.protocol}://${req.get('host')}${req.originalUrl} -> ${res.statusCode} ${ms}ms`)
    })
  } catch (e) {
    // ignore logging errors
  }
  next()
})

// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
// Capture raw JSON body for providers that sign payloads (e.g., Shufti)
// SECURITY: Limit request body size to 10mb to prevent DoS attacks
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    try {
      req.rawBody = buf.toString()
    } catch {
      req.rawBody = undefined
    }
  }
}))
app.use(cookieParser())

// Passport middleware (stateless, no sessions)
app.use(passport.initialize())

// If behind a reverse proxy (e.g., Vercel, Nginx), this allows req.ip and x-forwarded-for to be trusted
app.set('trust proxy', true)
// Request logging with IPs
const isProd = process.env.NODE_ENV === 'production'
const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

if (isProd && configuredOrigins.length === 0) {
  process.exit(1)
}

app.use(cors({
  origin: isProd
    ? (origin, cb) => {
        // Allow non-browser requests (no Origin header), but lock browsers to configured origins
        if (!origin) return cb(null, true)
        return cb(null, configuredOrigins.includes(origin))
      }
    : true,
  // The app may use HttpOnly cookies for auth tokens; enable credentialed CORS for browser clients.
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}))

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/otp', otpRoutes)
app.use('/api/transfers', transfersRoutes)
app.use('/api/requests', requestsRoutes)
app.use('/api/fx', fxRoutes)
app.use('/api/kyc', kycRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/contributions', contributionsRoutes)

// Health check for /api root so requests to /api return a clear JSON response
// Respond to both /api and /api/ so proxy redirects or trailing-slash rewrites work
app.get(['/api', '/api/'], (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CanViet Exchange Backend',
    env: process.env.NODE_ENV || 'development'
  })
})

// Compatibility redirect: if OAuth provider is configured with missing /api prefix
app.get('/auth/google/callback', (req, res) => {
  try {
    const qsIndex = req.originalUrl.indexOf('?')
    const qs = qsIndex >= 0 ? req.originalUrl.substring(qsIndex) : ''
    return res.redirect(307, `/api/auth/google/callback${qs}`)
  } catch (e) {
    return res.status(404).send('Not Found')
  }
})

// Dev-only SMTP verification endpoint
if ((process.env.NODE_ENV || 'development') !== 'production') {
  app.get('/api/dev/smtp-verify', async (_req, res) => {
    try {
      const { createTransport } = require('./services/email')
      const transporter = createTransport()
      const ok = await transporter.verify()
      res.json({ ok: !!ok, user: process.env.EMAIL_USER, host: process.env.EMAIL_HOST, port: Number(process.env.EMAIL_PORT || 465) })
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) })
    }
  })

  app.get('/api/dev/oauth-config', (_req, res) => {
    res.json({
      googleConfigured: !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET),
      callbackUrl: process.env.GOOGLE_OAUTH_REDIRECT_URI || '/api/auth/google/callback',
      frontendUrl: process.env.FRONTEND_URL
    })
  })

};(async () => {
  try {
    const requireDb = (process.env.DB_REQUIRED || 'false').toLowerCase() === 'true'
    const mongoUri = process.env.MONGODB_URI
    if (mongoUri) {
      await connectMongo(mongoUri, {
        maxRetries: Number(process.env.DB_MAX_RETRIES || 3),
        retryDelayMs: Number(process.env.DB_RETRY_DELAY_MS || 1000),
        serverSelectionTimeoutMS: Number(process.env.DB_SELECTION_TIMEOUT_MS || 5000),
      })
      // Ensure indexes are in sync (creates if missing; drops extras)
      try {
        const idxRes = await User.syncIndexes()
      } catch (e) {
      }
    } else {
      const msg = 'MONGODB_URI not set.'
      if (requireDb) throw new Error(`${msg} DB_REQUIRED=true`)
    }
  } catch (err) {
    const requireDb = (process.env.DB_REQUIRED || 'false').toLowerCase() === 'true'
    if (requireDb) process.exit(1)
  }
  app.listen(PORT, () => {
  })
})()

module.exports = app
