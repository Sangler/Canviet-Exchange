const crypto = require('crypto')
const { getRedisClient } = require('./redis')

const PEPPER = process.env.OTP_PEPPER || ''
const OTP_TTL_SEC = Number(process.env.OTP_TTL_SECONDS || 60)
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5)
const logger = require('../utils/logger')

class OtpService {
  constructor() {
    this.client = null
    this.maxAttempts = MAX_ATTEMPTS
    this.ttl = OTP_TTL_SEC
    this.pepper = PEPPER
  }

  async ensureClient() {
    if (!this.client || !this.client.isOpen) {
      this.client = await getRedisClient()
    }
    return this.client
  }

  randomOtp(length = 6) {
    const n = crypto.randomInt(0, 10 ** length)
    return String(n).padStart(length, '0')
  }

  hmac(code, salt) {
    return crypto.createHmac('sha256', this.pepper).update(`${salt}:${code}`).digest('base64url')
  }

  timingSafeEq(a, b) {
    const A = Buffer.from(a)
    const B = Buffer.from(b)
    if (A.length !== B.length) return false
    return crypto.timingSafeEqual(A, B)
  }

  async issueOtp(subject, purpose, length = 6) {
    const c = await this.ensureClient()
    const key = `otp:${purpose}:${subject}`
    const attemptsKey = `${key}:attempts`

    const code = this.randomOtp(length)
    const salt = crypto.randomBytes(16).toString('base64url')
    const codeHash = this.hmac(code, salt)
    const payload = JSON.stringify({ salt, codeHash, maxAttempts: this.maxAttempts })

    const res = await c.set(key, payload, { EX: this.ttl, NX: true })
    if (res !== 'OK') {
      throw new Error('OTP already issued; please wait before requesting another')
    }
    await c.set(attemptsKey, '0', { EX: this.ttl })
    // Log issuance; include code only in dev or when explicitly allowed
    const devMode = (process.env.SMS_DEV_MODE || 'false').toLowerCase() === 'true'
    const logCodes = (process.env.LOG_OTP_CODES || 'false').toLowerCase() === 'true'
    const masked = String(subject).length > 4 ? `${String(subject).slice(0,2)}***${String(subject).slice(-2)}` : String(subject)
    if (devMode || logCodes) {
      logger.infoMeta('[otp.service] OTP issued', { subject: masked, purpose, code, ttl: this.ttl })
    } else {
      logger.info(`[otp.service] OTP issued for ${masked} purpose=${purpose}`)
    }
    return { code, ttl: this.ttl }
  }

  async verifyOtp(subject, purpose, code) {
    const c = await this.ensureClient()
    const key = `otp:${purpose}:${subject}`
    const attemptsKey = `${key}:attempts`

    await c.watch(key, attemptsKey)
    const val = await c.get(key)
    if (!val) {
      await c.unwatch()
      return { ok: false, reason: 'expired-or-missing' }
    }
    const { salt, codeHash, maxAttempts } = JSON.parse(val)
    const attempts = Number((await c.get(attemptsKey)) || '0')
    if (attempts >= maxAttempts) {
      await c.unwatch()
      return { ok: false, reason: 'too-many-attempts' }
    }

    const ok = this.timingSafeEq(this.hmac(code, salt), codeHash)
    const multi = c.multi()
    if (ok) {
      multi.del(key)
      multi.del(attemptsKey)
    } else {
      multi.incr(attemptsKey)
    }
    const execRes = await multi.exec()
    if (execRes === null) {
      logger.warn('[otp.service] verify exec returned null (concurrent update)')
      return { ok: false, reason: 'concurrent-update' }
    }
    if (!ok) logger.warn('[otp.service] invalid otp attempt', { subject, purpose })
    return ok ? { ok: true } : { ok: false, reason: 'invalid' }
  }
}

// Singleton instance
const otpService = new OtpService()

// Backward-compatible function exports
async function issueOtp(subject, purpose, length = 6) {
  return otpService.issueOtp(subject, purpose, length)
}
async function verifyOtp(subject, purpose, code) {
  return otpService.verifyOtp(subject, purpose, code)
}

module.exports = { OtpService, otpService, issueOtp, verifyOtp }
