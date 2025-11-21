const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { createVerification, checkKycStatus, updateKycStatus, shuftiWebhook } = require('../controllers/kycController');

// Create new verification request with Shufti Pro
router.post('/create-verification', authMiddleware, createVerification);

// Check KYC status for authenticated user
router.get('/status', authMiddleware, checkKycStatus);

// Update KYC status (for testing/demo purposes)
router.post('/update-status', authMiddleware, updateKycStatus);

// Webhook endpoint for Shufti Pro callbacks (no auth required)
router.post('/webhook/shufti', shuftiWebhook);

module.exports = router;
