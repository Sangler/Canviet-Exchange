const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User = require('../models/User')

// No session serialization needed for JWT-only auth

// Only initialize Google OAuth strategy when required env vars are present.
const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI } = process.env

if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
  // Do not throw during app startup; log a warning and export passport without strategy.
  console.warn('Google OAuth not configured: GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET is missing. Skipping GoogleStrategy setup.')
} else {
  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: GOOGLE_OAUTH_CLIENT_SECRET,
    callbackURL: GOOGLE_OAUTH_REDIRECT_URI || '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let existingUser = await User.findOne({ googleId: profile.id })
      
      if (existingUser) {
        // User exists, return them
        return done(null, existingUser)
      }

      // Check if user exists with same email
      const emailUser = await User.findOne({ email: profile.emails[0].value })
      
      if (emailUser) {
        // LINKING RULE: Allow traditional users to link their Google account
        // They can continue using BOTH password and Google sign-in
        if (emailUser.authProvider === 'local') {
          // Link Google to existing traditional account (don't change authProvider)
          emailUser.googleId = profile.id
          emailUser.emailVerified = true // Google emails are verified
          await emailUser.save()
          return done(null, emailUser)
        }
        
        // If somehow a Google user exists without googleId, update it
        if (emailUser.authProvider === 'google' && !emailUser.googleId) {
          emailUser.googleId = profile.id
          emailUser.emailVerified = true
          await emailUser.save()
        }
        
        return done(null, emailUser)
      }

      // Create new user with Google OAuth
      const newUser = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        authProvider: 'google',
        emailVerified: true, // Google emails are verified
        role: 'user'
      })

      await newUser.save()
      done(null, newUser)
    } catch (error) {
      console.error('Google OAuth error:', error)
      done(error, null)
    }
  }))
}

module.exports = passport