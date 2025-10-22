const crypto = require('crypto')
const { getRedisClient } = require('./redis')

const PEPPER = process.env.OTP_PEPPER || ''
const OTP_TTL_SEC = Number(process.env.OTP_TTL_SEC || process.env.OTP_TTL_SECONDS || 300)
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5)

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
      return { ok: false, reason: 'concurrent-update' }
    }
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
