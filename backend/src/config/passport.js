const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User = require('../models/User')

// No session serialization needed for JWT-only auth

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let existingUser = await User.findOne({ googleId: profile.id })
    
    if (existingUser) {
      // User exists, return them
      return done(null, existingUser)
    }

    // Check if user exists with same email (linking accounts)
    const emailUser = await User.findOne({ email: profile.emails[0].value })
    
    if (emailUser) {
      // Link Google account to existing user
      emailUser.googleId = profile.id
      emailUser.authProvider = 'google'
      emailUser.emailVerified = true // Google emails are verified
      await emailUser.save()
      return done(null, emailUser)
    }

    // Create new user
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

module.exports = passport