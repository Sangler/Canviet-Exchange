// Usage: app.get('/admin', auth, requireRole('admin'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.auth?.role
    if (!role) {
      // Missing auth context; treat as unauthorized
      return res.status(401).json({ message: 'Unauthorized' })
    }
    if (!roles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    return next()
  }
}

function requireAdmin(req, res, next) {
  const role = req.auth?.role

  if (!role) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  return next()
}

module.exports = { requireRole, requireAdmin }
