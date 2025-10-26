const router = require('express').Router()
const https = require('https')

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (r) => {
      if (r.statusCode && r.statusCode >= 400) {
        return reject(new Error('Status ' + r.statusCode))
      }
      let data = ''
      r.on('data', (chunk) => (data += chunk))
      r.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json)
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

// GET /api/fx/cad-vnd
router.get('/cad-vnd', async (_req, res) => {
  const primaryUrl = 'https://open.er-api.com/v6/latest/CAD'
  const fallbackUrl = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/USD`

  try {
    let rate = null
    let source = null
    let fetchedAt = new Date().toISOString()

    try {
      const j = await fetchJson(primaryUrl)
      if (j && j.rates && typeof j.rates.VND === 'number') {
        rate = j.rates.VND + 200 // add 200 VND margin
        source = 'open.er-api.com'
        fetchedAt = j.time_last_update_utc || fetchedAt
      }
    } catch (_e) {
      // try fallback next
    }

    if (rate === null) {
      try {
        const j2 = await fetchJson(fallbackUrl)
        if (j2 && j2.rates && typeof j2.rates.VND === 'number') {
          rate = j2.rates.VND
          source = 'exchangerate.host'
        }
      } catch (_e) {
        // no-op, handled below
      }
    }

    if (rate === null) {
      return res.status(502).json({ ok: false, message: 'Rate not available' })
    }

    return res.json({ ok: true, pair: 'CAD_VND', rate, fetchedAt, source })
  } catch (_e) {
    return res.status(500).json({ ok: false, message: 'Internal error' })
  }
})

module.exports = router
