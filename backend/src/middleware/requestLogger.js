const logger = require('../utils/logger')

function getIp(req) {
  // If behind proxy, ensure app.set('trust proxy', true)
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.connection && req.connection.socket && req.connection.socket.remoteAddress) ||
    'unknown'
  )
}

module.exports = function requestLogger(req, res, next) {
  const start = process.hrtime.bigint()
  const ip = getIp(req)
  const metaBase = { ip, method: req.method, path: req.originalUrl || req.url }

  res.on('finish', () => {
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1e6
    logger.infoMeta('HTTP', { ...metaBase, status: res.statusCode, durationMs: Math.round(durationMs) })
  })

  res.on('close', () => {
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1e6
    logger.warnMeta('HTTP closed', { ...metaBase, status: res.statusCode, durationMs: Math.round(durationMs) })
  })

  next()
}
