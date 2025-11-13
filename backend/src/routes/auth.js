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
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

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

// Password reset routes
router.post("/forgot-password", loginLimiter, forgotPassword);
router.get("/reset-password/:token", validateResetToken);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
