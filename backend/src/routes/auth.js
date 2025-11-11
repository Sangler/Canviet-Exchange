const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();
const {
  register,
  login,
  googleOAuth,
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
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
    session: false,
  }),
  googleOAuth
);

module.exports = router;
