const { createClient } = require('redis')

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

class RedisService {
  constructor(url = REDIS_URL) {
    this.url = url
    this.client = null
    this._wiredEvents = false
  }

  _wireEvents() {
    if (!this.client || this._wiredEvents) return
    this.client.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[Redis] client error:', err?.message || err)
    })
    this._wiredEvents = true
  }

  async getClient() {
    if (!this.client) {
      this.client = createClient({ url: this.url })
      this._wireEvents()
    }
    if (!this.client.isOpen) {
      await this.client.connect()
    }
    return this.client
  }

  async ping() {
    const c = await this.getClient()
    return c.ping()
  }

  async disconnect() {
    if (this.client && this.client.isOpen) {
      await this.client.quit()
    }
  }
}

// Singleton instance
const redisService = new RedisService()

// Backward-compatible function exports
async function getRedisClient() {
  return redisService.getClient()
}
async function pingRedis() {
  return redisService.ping()
}
async function disconnectRedis() {
  return redisService.disconnect()
}

module.exports = { RedisService, redisService, getRedisClient, pingRedis, disconnectRedis }
