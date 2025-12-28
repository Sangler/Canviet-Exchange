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
    // Helper: if the request indicates a silent profile fetch, return
    // a quiet 204 instead of a visible 401 to avoid DevTools noise.
    const suppress = (req && (req.get && (req.get('x-suppress-auth-error') === '1' || req.get('x-suppress-auth-error') === 'true')))
    if (!token) {
      if (suppress) return res.status(204).end()
      return res.status(401).json({ message: 'Missing Authorization header' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)

    // Check for account suspension
      if (decoded.kycStatus === 'suspended') {
        // Allowed frontend routes where suspended users should still be able to
        // complete auth (login / oauth callback) and be redirected to help.
        const allowedPaths = ['/general/help', '/general/terms-and-conditions', 'help', '/terms-and-conditions', '/oauth-callback']

        // Allow suspended accounts to retrieve their own profile (`GET .../me`).
        const isGetMeEndpoint = req.method === 'GET' && (req.originalUrl || req.url || '').toString().includes('/me')

        // also allow when the request came from a frontend page in `allowedPaths`.
        const referer = (req.get && req.get('referer')) || req.headers['referer'] || ''
        let refererPath = ''
        try {
          if (referer) refererPath = new URL(referer).pathname
        } catch (e) {
          refererPath = referer.toString()
        }
        const reqPath = (req.originalUrl || req.url || '').toString()
        const isAllowedPath = allowedPaths.some(p => refererPath.startsWith(p) || reqPath.startsWith(p))

        if (!(isGetMeEndpoint || isAllowedPath)) {
          return res.status(403).json({ 
            message: 'Account suspended due to multiple duplicate identity attempts', 
            code: 'account_suspended' 
          })
        }
        // otherwise allow through so callers like `/api/auth/me` and `/api/users/me`
        // or requests originating from allowed frontend pages are permitted.
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
    // On invalid/expired token, honor suppress header for quiet checks.
    const suppress = (req && (req.get && (req.get('x-suppress-auth-error') === '1' || req.get('x-suppress-auth-error') === 'true')))
    if (suppress) return res.status(204).end()
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}
