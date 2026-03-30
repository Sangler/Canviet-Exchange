#!/usr/bin/env node
require('dotenv').config()

const { sendUsdcFromEnv } = require('../services/evmTransfers')

function parseArgs(argv) {
  const args = { yes: false, amount: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--yes') args.yes = true
    if (a === '--amount') args.amount = argv[i + 1]
  }
  return args
}

;(async () => {
  try {
    const { yes, amount } = parseArgs(process.argv.slice(2))
    const amountUsdc = Number(amount)

    if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
      throw new Error('Usage: npm run evm:send-test -- --amount <number> --yes')
    }

    if (!yes) {
      throw new Error('Refusing to send without --yes. Usage: npm run evm:send-test -- --amount <number> --yes')
    }

    const result = await sendUsdcFromEnv({ amountUsdc })

    console.log(
      JSON.stringify(
        {
          ok: true,
          sent: {
            chain: result.chain,
            from: result.from,
            to: result.to,
            token: result.token,
            amountUsdc: result.amountHuman,
            txHash: result.txHash
          }
        },
        null,
        2
      )
    )

    process.exit(0)
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }, null, 2))
    process.exit(1)
  }
})()
