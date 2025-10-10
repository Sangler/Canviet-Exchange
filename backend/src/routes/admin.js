const router = require('express').Router()
const auth = require('../middleware/auth')
const adminController = require('../controllers/adminController')
const requireEmailVerified = require('../middleware/requireEmailVerified')

// simple admin checker
function requireAdmin(req, res, next) {
  try {
    const role = req.auth?.role
    if (role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
    return next()
  } catch (e) { return res.status(403).json({ message: 'Forbidden' }) }
}

router.get('/users', auth, requireEmailVerified, requireAdmin, adminController.listUsers)

module.exports = router
