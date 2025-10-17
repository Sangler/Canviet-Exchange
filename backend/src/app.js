require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const cors = require('cors')
const helmet = require('helmet')
const mongoose = require('mongoose')
const authRoutes = require('./routes/auth')
const usersRoutes = require('./routes/users')
const adminRoutes = require('./routes/admin')
const otpRoutes = require('./routes/otp')
const transfersRoutes = require('./routes/transfers')
const sessionRoutes = require('./routes/session')
const https = require('https')
const User = require('./models/User')
const { connectMongo } = require('./db/mongoose')
const { version, name } = require('../package.json')
const logger = require('./utils/logger')
const requestLogger = require('./middleware/requestLogger')

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())
app.use(express.json())
app.use(cookieParser())
// Server-side session for short-lived data (e.g., pending verification email)
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || (process.env.JWT_SECRET || 'change-me'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.NODE_ENV || 'development') === 'production',
    maxAge: 10 * 60 * 1000,
  },
}))
// If behind a reverse proxy (e.g., Vercel, Nginx), this allows req.ip and x-forwarded-for to be trusted
app.set('trust proxy', true)
// Request logging with IPs
app.use(requestLogger)
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/otp', otpRoutes)
app.use('/api/transfers', transfersRoutes)
app.use('/api/session', sessionRoutes)

// Lightweight passthrough for CAD->VND rate using open.er-api.com (primary) with fallback to exchangerate.host
app.get('/api/fx/cad-vnd', async (_req, res) => {
  const primaryUrl = 'https://open.er-api.com/v6/latest/CAD';
  const fallbackUrl = 'https://api.exchangerate.host/latest?base=CAD&symbols=VND';

  function fetchJson(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (r) => {
        if (r.statusCode && r.statusCode >= 400) {
          return reject(new Error('Status ' + r.statusCode));
        }
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  try {
    let rate = null; let source = null; let fetchedAt = new Date().toISOString();
    try {
      const j = await fetchJson(primaryUrl);
      // Open ER API success structure: result === 'success'
      if (j && j.rates && typeof j.rates.VND === 'number') {
        rate = j.rates.VND;
        source = 'open.er-api.com';
        fetchedAt = j.time_last_update_utc || fetchedAt;
      }
    } catch (e) {
      // swallow, will attempt fallback
    }

    if (rate === null) {
      try {
        const j2 = await fetchJson(fallbackUrl);
        if (j2 && j2.rates && typeof j2.rates.VND === 'number') {
          rate = j2.rates.VND;
          source = 'exchangerate.host';
        }
      } catch (e) {
        // ignore, handled below if still null
      }
    }

    if (rate === null) {
      return res.status(502).json({ ok: false, message: 'Rate not available' });
    }

    return res.json({ ok: true, pair: 'CAD_VND', rate, fetchedAt, source });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Internal error' });
  }
});

// Dev-only SMTP verification endpoint
if ((process.env.NODE_ENV || 'development') !== 'production') {
  app.get('/api/dev/smtp-verify', async (_req, res) => {
    try {
      const { createTransport } = require('./services/email')
      const transporter = createTransport()
      const ok = await transporter.verify()
      res.json({ ok: !!ok, user: process.env.EMAIL_USER || process.env.emailUser, host: process.env.EMAIL_HOST || process.env.emailHost, port: Number(process.env.EMAIL_PORT || process.env.emailPort || 465) })
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) })
    }
  })
};(async () => {
  try {
    const requireDb = (process.env.DB_REQUIRED || 'false').toLowerCase() === 'true'
    const mongoUri = process.env.MONGO_URI
    if (mongoUri) {
      await connectMongo(mongoUri, {
        maxRetries: Number(process.env.DB_MAX_RETRIES || 3),
        retryDelayMs: Number(process.env.DB_RETRY_DELAY_MS || 1000),
        serverSelectionTimeoutMS: Number(process.env.DB_SELECTION_TIMEOUT_MS || 5000),
      })
      // Ensure indexes are in sync (creates if missing; drops extras)
      try {
        const idxRes = await User.syncIndexes()
        console.log('[MongoDB] User indexes synced:', idxRes)
      } catch (e) {
        logger.error('[MongoDB] User index sync failed', e)
      }
    } else {
      const msg = 'MONGO_URI not set.'
      if (requireDb) throw new Error(`${msg} DB_REQUIRED=true`)
      logger.error(`${msg} Running without database.`)
    }
  } catch (err) {
    logger.error('Failed to connect to MongoDB', err)
    const requireDb = (process.env.DB_REQUIRED || 'false').toLowerCase() === 'true'
    if (requireDb) process.exit(1)
  }
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`)
  })
})()

module.exports = app
