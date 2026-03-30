#!/usr/bin/env node
require('dotenv').config()

const { ethers } = require('ethers')

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)'
]

function getRpcUrl() {
  return process.env.POLYGON_AMOY_RPC_URL || process.env.POLYGON_RPC_URL || process.env.EVM_RPC_URL
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

;(async () => {
  try {
    const rpcUrl = getRpcUrl()
    if (!rpcUrl) throw new Error('Missing Polygon RPC URL (set POLYGON_AMOY_RPC_URL)')

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const network = await provider.getNetwork()

    const tokenAddress = requireEnv('EVM_USDC_TOKEN_ADDRESS')
    const walletAPk = requireEnv('EVM_WALLET_A_PRIVATE_KEY')
    const walletB = requireEnv('EVM_WALLET_B_ADDRESS')

    const walletA = new ethers.Wallet(walletAPk, provider)
    const token = new ethers.Contract(ethers.utils.getAddress(tokenAddress), ERC20_ABI, provider)

    let decimals = 6
    try {
      decimals = await token.decimals()
    } catch (_) {
      decimals = 6
    }

    const [nativeA, nativeB, tokenA, tokenB] = await Promise.all([
      provider.getBalance(walletA.address),
      provider.getBalance(walletB),
      token.balanceOf(walletA.address),
      token.balanceOf(walletB)
    ])

    console.log(
      JSON.stringify(
        {
          ok: true,
          rpcUrl,
          chainId: network && network.chainId,
          networkName: network && network.name,
          tokenAddress: ethers.utils.getAddress(tokenAddress),
          tokenDecimals: decimals,
          walletA: walletA.address,
          walletB: ethers.utils.getAddress(walletB),
          nativeBalance: {
            walletA: ethers.utils.formatEther(nativeA),
            walletB: ethers.utils.formatEther(nativeB)
          },
          tokenBalance: {
            walletA: ethers.utils.formatUnits(tokenA, decimals),
            walletB: ethers.utils.formatUnits(tokenB, decimals)
          },
          autoSendEnabled: String(process.env.EVM_AUTO_SEND_USDC || '').toLowerCase() === 'true'
        },
        null,
        2
      )
    )

    process.exit(0)
  } catch (e) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: String(e && e.message ? e.message : e),
          autoSendEnabled: String(process.env.EVM_AUTO_SEND_USDC || '').toLowerCase() === 'true'
        },
        null,
        2
      )
    )
    process.exit(1)
  }
})()
