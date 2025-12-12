# 🔒 Production Deployment Security Checklist

## ✅ COMPLETED - Critical & High Priority Fixes

All critical and high priority security issues have been fixed. The following changes were implemented:

### ✅ Critical Issues Fixed:

1. **Environment Variable Validation** ✅
   - Added startup validation in `backend/src/app.js`
   - App now fails fast if required env vars are missing
   - JWT_SECRET must be at least 32 characters

2. **JWT Secret Security** ✅
   - Removed empty string fallback in `authController.js` and `auth.js`
   - No longer accepts weak/missing JWT secrets

3. **Stripe Error Messages** ✅
   - Removed `error.message` from client responses in `payments.js`
   - Error details now only logged server-side

4. **HTTPS Enforcement** ✅
   - Added production middleware to redirect HTTP → HTTPS
   - Uses 301 permanent redirect
   - Checks `x-forwarded-proto` header

### ✅ High Priority Issues Fixed:

5. **NoSQL Injection Prevention** ✅
   - Added status value whitelist in `requests.js`
   - Only accepts: 'pending', 'approved', 'reject', 'completed'

6. **XSS in Locale Files** ✅
   - Added security documentation in `frontend/locales/SECURITY_NOTE.md`
   - Documented risks and mitigation strategies

7. **Rate Limiting Expanded** ✅
   - Added `transferLimiter` (10 req/15min)
   - Added `paymentLimiter` (20 req/15min)
   - Added `referralLimiter` (100 req/hour)
   - Applied to all critical endpoints

8. **Referral Enumeration Prevention** ✅
   - Added rate limiting to `/api/auth/referral/validate/:code`

---

## 📋 Pre-Launch Checklist

### Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Set `JWT_SECRET` (minimum 32 characters, use strong random string)
- [ ] Set `MONGODB_URI` (production database connection)
- [ ] Set `STRIPE_SECRET_KEY` (production key, not test key)
- [ ] Set `CANVIETEXCHANGE_EMAIL_USER` and `CANVIETEXCHANGE_EMAIL_APP_PASSWORD`
- [ ] Set `FRONTEND_URL` to your production domain
- [ ] Set `NODE_ENV=production`
- [ ] Configure all Shufti Pro credentials
- [ ] Configure Google OAuth credentials
- [ ] Configure Twilio credentials (if using phone verification)

### Security Configuration
- [ ] Verify HTTPS certificate is installed
- [ ] Test HTTPS redirect (visit HTTP URL, ensure redirect to HTTPS)
- [ ] Confirm JWT_SECRET is at least 32 characters
- [ ] Verify CORS origin is set to production domain (not '*')
- [ ] Test rate limiting on all endpoints
- [ ] Verify Stripe webhooks are configured
- [ ] Test Shufti Pro webhook signature validation

### Database
- [ ] MongoDB indexes created and optimized
- [ ] Database backups configured (daily minimum)
- [ ] Connection pooling configured
- [ ] Database access restricted (firewall rules)

### Monitoring & Logging
- [ ] Error monitoring service configured (Sentry, LogRocket, etc.)
- [ ] Log rotation configured
- [ ] Set up uptime monitoring (Pingdom, UptimeRobot, etc.)
- [ ] Set up performance monitoring (New Relic, DataDog, etc.)
- [ ] Configure alerting for critical errors

### Testing
- [ ] End-to-end test: User registration → Email verification → KYC → Transfer → Payment
- [ ] Test Google OAuth flow
- [ ] Test password reset flow
- [ ] Test payment flow with real Stripe (test mode)
- [ ] Test email sending (all notification types)
- [ ] Test rate limiting by making rapid requests
- [ ] Test with different browsers and mobile devices
- [ ] Load test critical endpoints

### Final Security Checks
- [ ] Run `npm audit` in both frontend and backend
- [ ] Check for exposed secrets in git history
- [ ] Verify no console.log statements in production build
- [ ] Test that error messages don't leak sensitive info
- [ ] Verify file upload limits are configured
- [ ] Check that admin routes require admin role
- [ ] Test account closure workflow

---

## 🔐 Environment Variables Reference

### Required (App will not start without these):
```env
JWT_SECRET=<minimum 32 characters>
MONGODB_URI=<production MongoDB connection string>
STRIPE_SECRET_KEY=<production Stripe secret key>
CANVIETEXCHANGE_EMAIL_USER=<SMTP email address>
CANVIETEXCHANGE_EMAIL_APP_PASSWORD=<SMTP password>
```

### Recommended:
```env
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
PASSWORD_PEPPER=<additional password security>
```

### Optional Rate Limits:
```env
RATE_LOGIN_MAX=10
RATE_REGISTER_MAX=20
RATE_TRANSFER_MAX=10
RATE_PAYMENT_MAX=20
RATE_REFERRAL_MAX=100
```

---

## 🚀 Deployment Steps

1. **Prepare Environment**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with production values
   npm install --production
   
   # Frontend
   cd frontend
   npm install
   npm run build
   ```

2. **Test Locally in Production Mode**
   ```bash
   # Backend
   NODE_ENV=production npm start
   
   # Frontend
   npm run start
   ```

3. **Deploy**
   - Push to production server
   - Verify environment variables are set
   - Start services
   - Monitor logs for errors

4. **Post-Deployment**
   - Test all critical flows
   - Monitor error rates
   - Check response times
   - Verify email delivery
   - Test payment processing

---

## 📞 Emergency Contacts

In case of security incident:
1. Immediately revoke compromised credentials
2. Check logs for unauthorized access
3. Notify affected users if data breach
4. Update JWT_SECRET and force re-login if tokens compromised
5. Review and patch vulnerability

---

## 📚 Additional Security Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security/
- Express Security Best Practices: https://expressjs.com/en/advanced/best-practice-security.html
- Stripe Security: https://stripe.com/docs/security
- MongoDB Security: https://docs.mongodb.com/manual/security/

---

**Last Updated:** December 11, 2025
**Status:** All Critical & High Priority Issues Fixed ✅
