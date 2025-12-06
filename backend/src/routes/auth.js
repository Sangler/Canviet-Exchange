const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();
const {
  register,
  login,
  googleOAuth,
  forgotPassword,
  validateResetToken,
  resetPassword,
  validateReferralCode,
} = require("../controllers/authController");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimit");
const {
  authLoginValidator,
  authRegisterValidator,
  validate,
} = require("../middleware/validators");

router.post(
  "/register",
  registerLimiter,
  authRegisterValidator,
  validate,
  register
);
router.post("/login", loginLimiter, authLoginValidator, validate, login);

// Google OAuth routes
// Start Google OAuth; pass referral via `state` when provided
router.get("/google", (req, res, next) => {
  const opts = { scope: ["profile", "email"], session: false }
  const ref = (req.query.ref || req.query.state || '').toString().trim()
  if (ref) Object.assign(opts, { state: ref })
  return passport.authenticate("google", opts)(req, res, next)
});

router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", {
      session: false,
    }, (err, user, info) => {
      if (err) {
        console.error('Google OAuth error:', err)
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`)
      }
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`)
      }
      // Attach user to request and continue to controller
      req.user = user
      next()
    })(req, res, next)
  },
  googleOAuth
);

// Referral validation route
router.get("/referral/validate/:code", validateReferralCode);

// Password reset routes
router.post("/forgot-password", loginLimiter, forgotPassword);
router.get("/reset-password/:token", validateResetToken);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
