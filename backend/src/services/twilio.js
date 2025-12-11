// Service: Twilio phone OTP issuance and verification
// Provides programmatic API for issuing and verifying phone OTPs.
// This service stores OTP hashes in Redis (same pattern as email OTP service) and
// uses the Twilio SDK to send SMS when available.

const crypto = require('crypto')
const { getRedisClient } = require('./redis')
const logger = require('../utils/logger')

let twilioClient = null
try {
  const twilio = require('twilio')
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  if (twilioClient) {
    logger.info('[twilio.service] Twilio SDK initialized successfully')
  }
} catch (e) {
  // twilio SDK optional; service will still function (just won't send SMS)
  // callers may use the returned code to send via other means.
  // eslint-disable-next-line no-console
  logger.warn('[twilio.service] Twilio SDK not installed or failed to initialize:', e.message)
}

const PEPPER = process.env.OTP_PEPPER || ''
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5)

function generateCode(length = 6) {
  const n = crypto.randomInt(0, 10 ** length)
  return String(n).padStart(length, '0')
}

function hmac(code, salt) {
  return crypto.createHmac('sha256', PEPPER).update(`${salt}:${code}`).digest('base64url')
}

function timingSafeEq(a, b) {
  const A = Buffer.from(a)
  const B = Buffer.from(b)
  if (A.length !== B.length) return false
  return crypto.timingSafeEqual(A, B)
}

function isCanadianNumber(phone) {
  return typeof phone === 'string' && phone.startsWith('+1') && phone.replace(/\D/g, '').length === 11
}

/**
 * Validates phone number using Twilio Lookup v2 API
 * Returns validation result and line type information
 * Cost: Basic lookup is FREE, line_type_intelligence costs $0.005 per lookup
 */
async function validatePhoneWithLookup(phone) {
  if (!twilioClient) {
    logger.warn('[twilio.service] Lookup skipped - Twilio client not initialized')
    return { valid: true, skipped: true } // Skip validation if Twilio not configured
  }

  const enableLookup = (process.env.TWILIO_ENABLE_LOOKUP || 'true').toLowerCase() === 'true'
  if (!enableLookup) {
    logger.debug('[twilio.service] Lookup disabled via TWILIO_ENABLE_LOOKUP')
    return { valid: true, skipped: true }
  }

  try {
    // Use Basic Lookup (FREE) to validate phone number format
    const lookup = await twilioClient.lookups.v2
      .phoneNumbers(phone)
      .fetch()

    if (!lookup.valid) {
      const errors = lookup.validationErrors || []
      logger.warnMeta('[twilio.service] Lookup validation failed', { phone: phone.slice(0,5)+'***', errors })
      return { 
        valid: false, 
        reason: 'invalid_number',
        errors: errors
      }
    }

    // Restrict to Canada (CA) and US (US) only
    const allowedCountries = ['CA', 'US']
    if (!allowedCountries.includes(lookup.countryCode)) {
      logger.warnMeta('[twilio.service] Phone number from unsupported country', { 
        phone: phone.slice(0,5)+'***',
        countryCode: lookup.countryCode 
      })
      return { 
        valid: false, 
        reason: 'unsupported_country',
        countryCode: lookup.countryCode,
        message: 'Only Canada and US phone numbers are supported'
      }
    }

    logger.infoMeta('[twilio.service] Lookup validation passed', { 
      phone: phone.slice(0,5)+'***',
      countryCode: lookup.countryCode,
      nationalFormat: lookup.nationalFormat
    })

    return { 
      valid: true, 
      phoneNumber: lookup.phoneNumber,
      nationalFormat: lookup.nationalFormat,
      countryCode: lookup.countryCode
    }
  } catch (err) {
    // If lookup fails (e.g., network error, rate limit), log but don't block OTP
    logger.errorMeta('[twilio.service] Lookup API error', err, { phone: phone.slice(0,5)+'***' })
    return { valid: true, skipped: true, error: err.message }
  }
}

async function issuePhoneOtp(phone, opts = {}) {
  const { length = 6, ttlSeconds = Number(process.env.OTP_TTL_SECONDS || 60), sendSms = true } = opts
  if (!phone) return { ok: false, reason: 'phone_required' }
  if (!isCanadianNumber(phone)) return { ok: false, reason: 'invalid_phone' }

  // Validate phone number using Twilio Lookup v2 API before sending SMS
  const lookupResult = await validatePhoneWithLookup(phone)
  if (!lookupResult.valid) {
    logger.warnMeta('[twilio.service] Phone validation failed', { 
      phone: phone.slice(0,5)+'***', 
      reason: lookupResult.reason,
      errors: lookupResult.errors 
    })
    return { 
      ok: false, 
      reason: lookupResult.reason || 'invalid_phone',
      validationErrors: lookupResult.errors 
    }
  }

  const redis = await getRedisClient()
  const key = `otp:phone:${phone}`
  const attemptsKey = `${key}:attempts`

  const code = generateCode(length)
  const salt = crypto.randomBytes(16).toString('base64url')
  const codeHash = hmac(code, salt)
  const payload = JSON.stringify({ salt, codeHash, maxAttempts: MAX_ATTEMPTS })

  const setResult = await redis.set(key, payload, { EX: ttlSeconds, NX: true })
  if (setResult !== 'OK') {
    return { ok: false, reason: 'code_already_sent' }
  }
  await redis.set(attemptsKey, '0', { EX: ttlSeconds })

  // attempt SMS send if configured
  const from = process.env.TWILIO_PHONE_NUMBER
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
  const body = `Your verification code is: ${code}`
  if (sendSms && twilioClient) {
    try {
      const messageOptions = {
        to: phone,
        body
      }
      
      // Use Messaging Service SID if available (for production), otherwise use from number
      if (messagingServiceSid) {
        messageOptions.messagingServiceSid = messagingServiceSid
      } else if (from) {
        messageOptions.from = from
      } else {
        throw new Error('Neither TWILIO_MESSAGING_SERVICE_SID nor TWILIO_PHONE_NUMBER is configured')
      }
      
      await twilioClient.messages.create(messageOptions)
    } catch (err) {
      // If SMS sending fails, delete the key so caller may retry
      await redis.del(key)
      await redis.del(attemptsKey)
      logger.error('[twilio.service] SMS send failed', err)
      return { ok: false, reason: 'sms_failed', error: String(err && err.message ? err.message : err) }
    }
  }

  // Conditional OTP logging: only when explicitly enabled or in dev SMS mode
  const devMode = (process.env.SMS_DEV_MODE || 'false').toLowerCase() === 'true'
  const logCodes = (process.env.LOG_OTP_CODES || 'false').toLowerCase() === 'true'
  if (devMode || !sendSms || logCodes) {
    const masked = phone && phone.length > 4 ? `${phone.slice(0,2)}***${phone.slice(-2)}` : phone
    logger.infoMeta('[twilio.service] OTP issued', { phone: masked, ttl: ttlSeconds, code: code })
  } else {
    const masked = phone && phone.length > 4 ? `${phone.slice(0,2)}***${phone.slice(-2)}` : phone
    logger.info(`[twilio.service] OTP issued for ${masked} (sms_sent=${Boolean(sendSms)})`)
  }

  return { ok: true, ttl: ttlSeconds, phone, code: sendSms ? undefined : code }
}

async function verifyPhoneOtp(phone, code) {
  if (!phone || !code) return { ok: false, reason: 'phone_and_code_required' }
  if (!isCanadianNumber(phone)) return { ok: false, reason: 'invalid_phone' }

  const redis = await getRedisClient()
  const key = `otp:phone:${phone}`
  const attemptsKey = `${key}:attempts`

  await redis.watch(key, attemptsKey)
  const val = await redis.get(key)
  if (!val) {
    await redis.unwatch()
    return { ok: false, reason: 'expired_or_missing' }
  }
  const { salt, codeHash, maxAttempts } = JSON.parse(val)
  const attempts = Number((await redis.get(attemptsKey)) || '0')
  if (attempts >= maxAttempts) {
    await redis.unwatch()
    return { ok: false, reason: 'too_many_attempts' }
  }

  const ok = timingSafeEq(hmac(code, salt), codeHash)
  const multi = redis.multi()
  if (ok) {
    multi.del(key)
    multi.del(attemptsKey)
  } else {
    multi.incr(attemptsKey)
  }
  const execRes = await multi.exec()
  if (execRes === null) return { ok: false, reason: 'concurrent_update' }

  return ok ? { ok: true } : { ok: false, reason: 'invalid_code' }
}

module.exports = { issuePhoneOtp, verifyPhoneOtp, isCanadianNumber, validatePhoneWithLookup }
