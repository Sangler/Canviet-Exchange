const router = require('express').Router()
const auth = require('../middleware/auth')
const users = require('../controllers/usersController')

// GET /api/users/me - return current user
router.get('/me', auth, users.me)
router.post('/phone', auth, users.setPhone)
router.post('/profile', auth, users.updateProfile)

module.exports = router
