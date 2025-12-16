const jwt = require('jsonwebtoken')

// JWT_SECRET is validated at startup - no fallback needed
const JWT_SECRET = process.env.JWT_SECRET

// Extract Bearer token from Authorization header
function getToken(req) {
  // Prefer cookie (HttpOnly) token if present, fall back to Authorization header for API clients
  if (req && req.cookies && req.cookies.access_token) return req.cookies.access_token
  const auth = req.headers['authorization'] || ''
  const [scheme, token] = auth.split(' ')
  if (scheme && scheme.toLowerCase() === 'bearer' && token) return token
  return null
}

module.exports = function authMiddleware(req, res, next) {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ message: 'Missing Authorization header' })

    const decoded = jwt.verify(token, JWT_SECRET)

    // Check for account suspension
    if (decoded.kycStatus === 'suspended') {
      return res.status(403).json({ 
        message: 'Account suspended due to multiple duplicate identity attempts', 
        code: 'account_suspended' 
      })
    }

    // Maintain existing req.auth reference
    req.auth = decoded

    // Provide compatibility layer for routes expecting req.user.id
    // Tokens use `sub` or sometimes `userId` as the subject identifier
    const subject = decoded.sub || decoded.userId || decoded.id
    if (subject) {
      req.user = {
        id: subject,
        email: decoded.email,
        role: decoded.role
      }
    }

    return next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}
