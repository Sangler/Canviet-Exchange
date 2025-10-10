const logger = require('../utils/logger')

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection && req.connection.socket && req.connection.socket.remoteAddress) ||
    'unknown'
  )
}

// Express error-handling middleware signature: (err, req, res, next)
module.exports = function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500
  const isProd = (process.env.NODE_ENV || 'development') === 'production'

  const ip = getIp(req)
  const meta = {
    ip,
    method: req.method,
    path: req.originalUrl || req.url,
    status,
  }

  // Prefer structured error logging with meta and stack trace
  if (typeof logger.errorMeta === 'function') {
    logger.errorMeta('Unhandled error', err, meta)
  } else if (typeof logger.error === 'function') {
    logger.error('Unhandled error', err)
  }

  // Avoid sending stack traces in production
  const payload = {
    ok: false,
    message: err?.message || 'Internal server error',
  }

  if (!isProd && err?.stack) {
    payload.stack = err.stack
  }

  res.status(status).json(payload)
}
