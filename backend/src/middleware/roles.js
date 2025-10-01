const logger = require('../utils/logger')

// Usage: app.get('/admin', auth, requireRole('admin'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.auth?.role
    if (!role) {
      // Missing auth context; treat as unauthorized
      logger.warnMeta('RBAC: missing role in auth context', { path: req.originalUrl, method: req.method })
      return res.status(401).json({ message: 'Unauthorized' })
    }
    if (!roles.includes(role)) {
      logger.warnMeta('RBAC: forbidden', { path: req.originalUrl, method: req.method, role, required: roles })
      return res.status(403).json({ message: 'Forbidden' })
    }
    return next()
  }
}

function requireAdmin(req, res, next) {
  const role = req.auth?.role

  if (!role) {
    logger.warnMeta('RBAC: missing role in auth context', { path: req.originalUrl, method: req.method })
    return res.status(401).json({ message: 'Unauthorized' })
  }
  if (role !== 'admin') {
    logger.warnMeta('RBAC: admin-only forbidden', { path: req.originalUrl, method: req.method, role })
    return res.status(403).json({ message: 'Forbidden' })
  }
  return next()
}

module.exports = { requireRole, requireAdmin }
