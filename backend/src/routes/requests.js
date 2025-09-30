const router = require('express').Router()

// Temporary in-memory mock dataset for demo
const mock = [
  {
    _id: 'req_001',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    fromCurrency: 'CAD',
    toCurrency: 'VND',
    amountSent: 250,
    amountReceived: 250 * 18800,
    exchangeRate: 18800,
    status: 'pending',
  },
  {
    _id: 'req_002',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    fromCurrency: 'CAD',
    toCurrency: 'VND',
    amountSent: 500,
    amountReceived: 500 * 18800,
    exchangeRate: 18800,
    status: 'completed',
  },
]

// GET /api/requests
router.get('/', (req, res) => {
  res.json({ ok: true, count: mock.length, requests: mock })
})

module.exports = router
