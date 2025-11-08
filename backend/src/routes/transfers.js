const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePhoneVerified = require('../middleware/requirePhoneVerified');
const requireEmailVerified = require('../middleware/requireEmailVerified');

// Placeholder create transfer route, protected by phone verification
router.post('/', auth, requireEmailVerified(), requirePhoneVerified, async (req, res) => {
  // TODO: implement actual create-transfer logic
  return res.json({ ok: true, message: 'Transfer accepted (placeholder, phone verified)' });
});

module.exports = router;
