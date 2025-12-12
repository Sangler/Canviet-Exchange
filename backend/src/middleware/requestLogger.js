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
    // logging removed: suppress HTTP finish logs in production
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1e6
    void durationMs
  })

  res.on('close', () => {
    // logging removed: suppress HTTP close logs in production
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1e6
    void durationMs
  })

  next()
}
