require('dotenv').config()
const router = require('express').Router()
const https = require('https')
const logger = require('../utils/logger')

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

// Fetch USDC/CAD from Coinbase using native fetch (Node 18+)
async function fetchUsdcCadFromCoinbase() {
  const url = 'https://api.coinbase.com/v2/prices/USDC-CAD/spot';
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return Number(data.data.amount); // Returns CAD per USDC (e.g., 1.41 means 1 USDC = 1.41 CAD)
  } catch (err) {
    logger.error(`[FX] Coinbase USDC-CAD fetch failed: ${err.message}`);
    return null;
  }
}

// Fetch USDC/USD peg from Coinbase to account for market fluctuation
async function fetchUsdcUsdFromCoinbase() {
  const url = 'https://api.coinbase.com/v2/prices/USDC-USD/spot';
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return Number(data.data.amount); // Returns USD per USDC (usually ~1.0, but can fluctuate slightly)
  } catch (err) {
    logger.error(`[FX] Coinbase USDC-USD fetch failed: ${err.message}`);
    return null;
  }
}

// Fetch USD/VND from exchange rate APIs
async function fetchUsdVnd() {
  const apiKey = process.env.EXCHANGE_API_KEY;
  const candidates = [];
  
  if (apiKey) {
    candidates.push({ 
      url: `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`, 
      source: 'exchangerate-api.com', 
      type: 'conversion_rates' 
    });
  }
  candidates.push({ 
    url: 'https://open.er-api.com/v6/latest/USD', 
    source: 'open.er-api.com', 
    type: 'rates' 
  });

  for (const candidate of candidates) {
    try {
      const j = await fetchJson(candidate.url);
      
      if (candidate.type === 'conversion_rates' && j?.conversion_rates?.VND) {
        return { rate: Number(j.conversion_rates.VND), source: candidate.source, fetchedAt: j.time_last_update_utc };
      } else if (candidate.type === 'rates' && j?.rates?.VND) {
        return { rate: Number(j.rates.VND), source: candidate.source, fetchedAt: j.time_last_update_utc };
      }
    } catch (err) {
      logger.error(`[FX] ${candidate.source} USD/VND fetch failed: ${err.message}`);
      continue;
    }
  }
  
  return null;
}

// GET /api/fx/cad-vnd
router.get('/cad-vnd', async (_req, res) => {
  try {
    // Step 1: Fetch USDC/CAD from Coinbase (returns CAD per USDC, e.g., 1.41)
    const cadPerUsdc = await fetchUsdcCadFromCoinbase();
    if (!cadPerUsdc) {
      return res.status(502).json({ 
        ok: false, 
        message: 'Unable to fetch USDC/CAD rate from Coinbase.' 
      });
    }

    // Step 2: Fetch real-time USDC/USD peg from Coinbase (usually ~1.0, but can fluctuate)
    const usdcUsdPeg = await fetchUsdcUsdFromCoinbase();
    if (!usdcUsdPeg) {
      return res.status(502).json({ 
        ok: false, 
        message: 'Unable to fetch USDC/USD peg from Coinbase.' 
      });
    }
    // Calculate CAD per USD using the actual peg
    const cadPerUsd = cadPerUsdc * usdcUsdPeg;
    
    // Step 3: Fetch USD/VND rate (VND per USD)
    const usdVndData = await fetchUsdVnd();
    if (!usdVndData) {
      return res.status(502).json({ 
        ok: false, 
        message: 'Unable to fetch USD/VND exchange rate.' 
      });
    }

    // Step 4: Calculate VND per CAD = (VND/USD) ÷ (CAD/USD)
    const cadToVnd = usdVndData.rate / cadPerUsd;

    // Apply business margin of +50 VND
    const withMargin = cadToVnd + 50;


    return res.json({ 
      ok: true, 
      pair: 'CAD_VND', 
      rate: Math.round(withMargin), // Round to nearest VND
      calculation: {
        cadPerUsdc: cadPerUsdc,
        usdcUsdPeg: usdcUsdPeg,
        cadPerUsd: cadPerUsd,
        usdVnd: usdVndData.rate,
        baseRate: Math.round(cadToVnd),
        margin: 0
      },
      sources: {
        usdcCad: 'coinbase.com',
        usdVnd: usdVndData.source
      },
      fetchedAt: usdVndData.fetchedAt || new Date().toISOString()
    });

  } catch (err) {
    logger.error(`[FX] CAD-VND calculation error: ${err.message}`);
    return res.status(500).json({ 
      ok: false, 
      message: 'Error calculating exchange rate: ' + err.message 
    });
  }
})

module.exports = router
