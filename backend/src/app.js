require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const helmet = require('helmet')
const mongoose = require('mongoose')
const authRoutes = require('./routes/auth')
const usersRoutes = require('./routes/users')
const adminRoutes = require('./routes/admin')
const otpRoutes = require('./routes/otp')
const transfersRoutes = require('./routes/transfers')
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

// Health and liveness endpoints
function mongoStateName(state) {
  switch (state) {
    case 0: return 'disconnected'
    case 1: return 'connected'
    case 2: return 'connecting'
    case 3: return 'disconnecting'
    default: return 'unknown'
  }
}

app.get('/api/health', (req, res) => {
  const readyState = mongoose.connection.readyState
  const payload = {
    ok: true,
    service: name || 'backend',
    version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: {
      connected: readyState === 1,
      state: mongoStateName(readyState),
      readyState,
    },
  }
  res.json(payload)
})

// Lightweight liveness endpoints
app.get('/healthz', (_req, res) => res.status(200).send('ok'))
app.get('/api/healthz', (_req, res) => res.status(200).send('ok'))

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
}

// Dev-only endpoint to check indexes and DB state
if ((process.env.NODE_ENV || 'development') !== 'production') {
  app.get('/api/dev/indexes', async (_req, res) => {
    try {
      const readyState = mongoose.connection.readyState
      const userIndexes = await User.collection.indexes().catch(() => [])
      res.json({
        ok: true,
        db: {
          connected: readyState === 1,
          state: mongoStateName(readyState),
          readyState,
        },
        userIndexes,
      })
    } catch (e) {
      logger.error('Failed to read indexes', e)
      res.status(500).json({ ok: false, message: 'Failed to read indexes' })
    }
  })
}

;(async () => {
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
