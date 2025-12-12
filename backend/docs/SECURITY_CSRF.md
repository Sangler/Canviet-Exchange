# CSRF Protection Policy

## Current State: NO Cookie-Based Authentication

✅ **The application is currently IMMUNE to CSRF attacks** because:
- All authentication uses Bearer tokens in the `Authorization` header
- No session cookies are used for authentication
- CSRF attacks can only exploit cookie-based authentication

## CRITICAL: Do NOT Add Cookie Authentication Without CSRF Protection

⚠️ **WARNING**: If you ever add cookie-based authentication or session management:

1. **CSRF tokens become MANDATORY**
2. Use a library like `csurf` or similar
3. Validate CSRF tokens on all state-changing requests (POST, PUT, DELETE, PATCH)
4. Include CSRF token in forms and AJAX requests

## Why Cookie Auth Requires CSRF Protection

When browsers automatically send cookies with every request:
- Malicious sites can trigger authenticated requests
- Users don't need to be on your site for the attack to work
- Example: `<img src="https://yoursite.com/api/transfer?to=attacker&amount=1000">`

## Current Auth Flow (Safe from CSRF)

```
1. User logs in → receives JWT in response body
2. Frontend stores JWT in memory/localStorage
3. Frontend manually includes JWT in Authorization header
4. Malicious sites CANNOT access the JWT (Same-Origin Policy)
```

## If You Add Cookie Auth (Requires CSRF)

```javascript
// NEVER do this without CSRF protection:
app.use(session({ 
  secret: 'xxx',
  cookie: { httpOnly: true, secure: true }
}));

// REQUIRED with cookies:
const csrf = require('csurf');
app.use(csrf({ cookie: true }));
```

## Testing for CSRF Vulnerabilities

If cookies are added, test with:
```bash
# Should FAIL if CSRF protection is working
curl -X POST https://canvietexchange.com/api/requests \
  -H "Cookie: session=xxx" \
  -d '{"amount": 1000}'
```

## References

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [JWT vs Cookies Security](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)

---

**Last Updated**: December 11, 2025  
**Status**: No cookie auth present - CSRF protection not required
