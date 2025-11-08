const express = require('express');
const router = express.Router();
const { requestEmailOtp, verifyEmailOtp, requestPhoneOtp, verifyPhoneOtp } = require('../controllers/otpController');
const requireEmailVerified = require('../middleware/requireEmailVerified');

// Email OTP - prevent already verified users from accessing
router.post('/email/request', requireEmailVerified(false), requestEmailOtp);
router.post('/email/verify', requireEmailVerified(false), verifyEmailOtp);

// Phone OTP
router.post('/phone/request', requestPhoneOtp);
router.post('/phone/verify', verifyPhoneOtp);

module.exports = router;

