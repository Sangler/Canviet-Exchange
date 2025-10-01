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
