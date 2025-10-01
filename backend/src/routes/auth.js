const express = require('express')
const router = express.Router()
const { register, login } = require('../controllers/authController')
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit')
const { authLoginValidator, authRegisterValidator, validate } = require('../middleware/validators')

router.post('/register', registerLimiter, authRegisterValidator, validate, register)
router.post('/login', loginLimiter, authLoginValidator, validate, login)

module.exports = router
