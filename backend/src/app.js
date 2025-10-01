require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const helmet = require('helmet')
const mongoose = require('mongoose')
const authRoutes = require('./routes/auth')
const usersRoutes = require('./routes/users')
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
