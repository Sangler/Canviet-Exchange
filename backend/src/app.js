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

// Lightweight passthrough for CAD->VND rate using exchangerate-api.com
app.get('/api/fx/cad-vnd', async (_req, res) => {
  const apiKey = process.env.NEXT_PUBLIC_EXCHANGE_API_KEY;

  if (!apiKey) {
    logger.error('[FX] EXCHANGE_RATE_API_KEY is not set. Cannot fetch exchange rate.');
    return res.status(503).json({ ok: false, message: 'Exchange rate service is not configured.' });
  }

  const primaryUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/CAD`;

  function fetchJson(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (r) => {
        if (r.statusCode && r.statusCode >= 400) {
          return reject(new Error(`Request failed with status ${r.statusCode}`));
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
    const j = await fetchJson(primaryUrl);
    
    // exchangerate-api.com success structure: result === 'success'
    if (j && j.result === 'success' && j.conversion_rates && typeof j.conversion_rates.VND === 'number') {
      const rate = parseFloat(j.conversion_rates.VND) + 50; // Adjust market rate
      const source = 'exchangerate-api.com';
      const fetchedAt = j.time_last_update_utc || new Date().toISOString();
      return res.json({ ok: true, pair: 'CAD_VND', rate, fetchedAt, source });
    } else {
      // This will be caught and logged below
      throw new Error(j['error-type'] || 'API returned an invalid response');
    }
  } catch (e) {
    logger.error(`[FX] Failed to fetch exchange rate from primary source: ${e.message}`);
    return res.status(502).json({ ok: false, message: 'Exchange rate is currently unavailable.' });
  }
});

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
