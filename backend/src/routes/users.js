const router = require('express').Router()
const auth = require('../middleware/auth')
const users = require('../controllers/usersController')

// GET /api/users/me - return current user
router.get('/me', auth, users.me)
router.patch('/me', auth, users.updatePreferences)
router.post('/phone', auth, users.setPhone)
router.post('/profile', auth, users.updateProfile)
router.delete('/close-account', auth, users.closeAccount)
router.get('/referral/stats', auth, users.getReferralStats)

module.exports = router