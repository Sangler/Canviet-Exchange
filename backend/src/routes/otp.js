const express = require('express');
const router = express.Router();
const { requestEmailOtp, verifyEmailOtp, requestPhoneOtp, verifyPhoneOtp } = require('../controllers/otpController');
const requireEmailVerified = require('../middleware/requireEmailVerified');
const authMiddleware = require('../middleware/auth');

// Email OTP - prevent already verified users from accessing
router.post('/email/request', requireEmailVerified(false), requestEmailOtp);
router.post('/email/verify', requireEmailVerified(false), verifyEmailOtp);

// Phone OTP - requires authentication to get user from token
router.post('/phone/request', authMiddleware, requestPhoneOtp);
router.post('/phone/verify', authMiddleware, verifyPhoneOtp);

module.exports = router;

