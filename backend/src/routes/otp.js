const express = require('express');
const router = express.Router();
const { requestEmailOtp, verifyEmailOtp, requestPhoneOtp, verifyPhoneOtp } = require('../controllers/otpController');

// Email OTP
router.post('/email/request', requestEmailOtp);
router.post('/email/verify', verifyEmailOtp);

// Phone OTP
router.post('/phone/request', requestPhoneOtp);
router.post('/phone/verify', verifyPhoneOtp);

module.exports = router;
