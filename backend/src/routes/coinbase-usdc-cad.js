// coinbase-usdc-cad.js
// Node 18+ (built-in fetch). Fetches the latest USDC/CAD exchange rate from Coinbase.

const router = require('express').Router();
const logger = require('../utils/logger');

const BASE_URL = "https://api.coinbase.com/v2";

// GET /api/coinbase/usdc-cad
router.get('/usdc-cad', async (req, res) => {
  const pair = "USDC-CAD"; // Coinbase uses hyphen between assets
  const url = `${BASE_URL}/prices/${pair}/spot`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    logger.info(`[Coinbase] Fetched ${pair} spot price: ${data.data.amount}`);

    // Parse to number for full precision
    const price = Number(data.data.amount);

    return res.json({
      ok: true,
      pair: pair,
      price: price, // Full decimal precision
      priceFormatted: price.toFixed(8), // 8 decimal places for crypto
      currency: data.data.currency,
      source: 'coinbase.com',
      fetchedAt: new Date().toISOString()
    });

  } catch (err) {
    logger.error('[Coinbase] Error fetching USDC/CAD:', err.message);
    return res.status(502).json({
      ok: false,
      message: 'Coinbase API error: ' + err.message
    });
  }
});

module.exports = router;
