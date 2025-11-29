const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || ''

// Extract Bearer token from Authorization header
function getToken(req) {
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
