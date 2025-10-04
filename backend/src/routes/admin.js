const router = require('express').Router()
const auth = require('../middleware/auth')
const adminController = require('../controllers/adminController')

// simple admin checker
function requireAdmin(req, res, next) {
  try {
    const role = req.auth?.role
    if (role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
    return next()
  } catch (e) { return res.status(403).json({ message: 'Forbidden' }) }
}

router.get('/users', auth, requireAdmin, adminController.listUsers)

module.exports = router
