const router = require('express').Router()
const auth = require('../middleware/auth')
const users = require('../controllers/usersController')

// GET /api/users/me - return current user
router.get('/me', auth, users.me)

module.exports = router
