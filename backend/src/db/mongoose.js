const mongoose = require('mongoose')

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Connect to MongoDB with retry logic and helpful logging.
 * @param {string} uri - Mongo connection string
 * @param {object} opts
 * @param {number} [opts.maxRetries=3] - Maximum retry attempts
 * @param {number} [opts.retryDelayMs=1000] - Initial delay between retries
 * @param {number} [opts.serverSelectionTimeoutMS=5000] - Driver selection timeout per attempt
 * @returns {Promise<mongoose.Connection>}
 */
async function connectMongo(uri, opts = {}) {
  if (!uri) throw new Error('MONGODB_URI is missing')

  const {
    maxRetries = 3,
    retryDelayMs = 1000,
    serverSelectionTimeoutMS = 5000,
  } = opts

  mongoose.set('strictQuery', true)

  // In production we prefer fail-fast behavior rather than long buffering
  if (process.env.NODE_ENV === 'production') {
    mongoose.set('bufferCommands', false)
    mongoose.set('bufferTimeoutMS', 5000)
  }

  // Connection event logging
  const conn = mongoose.connection
  conn.on('connecting', () => console.info('MongoDB: connecting'))
  conn.on('connected', () => console.info('MongoDB: connected'))
  conn.on('reconnected', () => console.info('MongoDB: reconnected'))
  conn.on('error', (err) => console.error('MongoDB error', err && err.message))
  conn.on('disconnected', () => console.warn('MongoDB: disconnected'))

  let delay = retryDelayMs
  const totalAttempts = maxRetries + 1 // initial try + retries

  // Try initial + retries
  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      // connection options tuned for production reliability
      const connectOpts = {
        serverSelectionTimeoutMS,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        family: 4,
      }
      await mongoose.connect(uri, connectOpts)
      return conn
    } catch (err) {
      const canRetry = attempt < totalAttempts
      if (!canRetry) throw err
      await wait(delay)
      // simple backoff
      delay = Math.min(delay * 2, 30000)
    }
  }
}

module.exports = { connectMongo }
