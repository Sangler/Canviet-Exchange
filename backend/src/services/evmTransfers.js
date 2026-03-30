const { ethers } = require('ethers');

const EVM_DEBUG = String(process.env.EVM_DEBUG || '').toLowerCase() === 'true';

function parsePositiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 value) returns (bool)'
];

// Simple in-process lock to serialize tx broadcasting from a single wallet.
// NOTE: This only protects you within ONE Node.js instance.
let walletQueue = Promise.resolve();

function withWalletLock(fn) {
  const run = walletQueue.then(fn, fn);
  // Ensure queue continues even if a job fails.
  walletQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function getRequiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function getProvider() {
  const rpcUrl =
    process.env.POLYGON_AMOY_RPC_URL ||
    process.env.POLYGON_RPC_URL ||
    process.env.EVM_RPC_URL;

  if (!rpcUrl) {
    throw new Error('Missing Polygon RPC URL (set POLYGON_AMOY_RPC_URL)');
  }

  return new ethers.providers.JsonRpcProvider(rpcUrl);
}

async function sendErc20Transfer({
  tokenAddress,
  fromPrivateKey,
  toAddress,
  amountHuman,
  chainLabel = 'polygon-amoy'
}) {
  if (!tokenAddress) throw new Error('tokenAddress is required');
  if (!fromPrivateKey) throw new Error('fromPrivateKey is required');
  if (!toAddress) throw new Error('toAddress is required');
  if (typeof amountHuman === 'undefined' || amountHuman === null) throw new Error('amountHuman is required');

  const provider = getProvider();
  const wallet = new ethers.Wallet(fromPrivateKey, provider);

  if (EVM_DEBUG) {
    try {
      console.log(
        `[EVM] prepare transfer chain=${chainLabel} from=${wallet.address} to=${String(toAddress)} token=${String(tokenAddress)} amount=${String(amountHuman)}`
      );
    } catch (_) {
      // ignore
    }
  }

  const to = ethers.utils.getAddress(toAddress);
  const token = ethers.utils.getAddress(tokenAddress);

  const contract = new ethers.Contract(token, ERC20_ABI, wallet);

  let decimals = 6;
  try {
    decimals = await contract.decimals();
  } catch (_) {
    decimals = 6;
  }

  const amountBaseUnits = ethers.utils.parseUnits(String(amountHuman), decimals);
  if (amountBaseUnits.lte(0)) throw new Error('Amount must be > 0');

  const balance = await contract.balanceOf(wallet.address);
  if (balance.lt(amountBaseUnits)) {
    throw new Error(
      `Insufficient token balance. Have ${ethers.utils.formatUnits(balance, decimals)}, need ${ethers.utils.formatUnits(amountBaseUnits, decimals)}`
    );
  }

  // Fee overrides (prefer EIP-1559 if supported)
  const feeData = await provider.getFeeData();
  const overrides = {};
  // Polygon Amoy (and some RPCs) may reject low EIP-1559 tips.
  // Use safe minimums, configurable via env.
  const minTipGwei = parsePositiveNumber(process.env.EVM_MIN_PRIORITY_FEE_GWEI, 30);
  const minMaxFeeGwei = parsePositiveNumber(process.env.EVM_MIN_MAX_FEE_GWEI, 30);
  const minGasPriceGwei = parsePositiveNumber(process.env.EVM_MIN_GAS_PRICE_GWEI, 30);

  const minTipWei = ethers.utils.parseUnits(String(minTipGwei), 'gwei');
  const minMaxFeeWei = ethers.utils.parseUnits(String(minMaxFeeGwei), 'gwei');
  const minGasPriceWei = ethers.utils.parseUnits(String(minGasPriceGwei), 'gwei');

  if (feeData && (feeData.maxFeePerGas || feeData.maxPriorityFeePerGas)) {
    let maxPriority = feeData.maxPriorityFeePerGas || minTipWei;
    let maxFee = feeData.maxFeePerGas || minMaxFeeWei;

    if (maxPriority.lt(minTipWei)) {
      if (EVM_DEBUG) console.log(`[EVM] bumping maxPriorityFeePerGas to ${minTipGwei} gwei (was ${ethers.utils.formatUnits(maxPriority, 'gwei')} gwei)`);
      maxPriority = minTipWei;
    }
    if (maxFee.lt(minMaxFeeWei)) {
      if (EVM_DEBUG) console.log(`[EVM] bumping maxFeePerGas to ${minMaxFeeGwei} gwei (was ${ethers.utils.formatUnits(maxFee, 'gwei')} gwei)`);
      maxFee = minMaxFeeWei;
    }
    if (maxFee.lt(maxPriority)) {
      maxFee = maxPriority;
    }

    overrides.maxFeePerGas = maxFee;
    overrides.maxPriorityFeePerGas = maxPriority;
  } else if (feeData && feeData.gasPrice) {
    let gasPrice = feeData.gasPrice;
    if (gasPrice.lt(minGasPriceWei)) {
      if (EVM_DEBUG) console.log(`[EVM] bumping gasPrice to ${minGasPriceGwei} gwei (was ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei)`);
      gasPrice = minGasPriceWei;
    }
    overrides.gasPrice = gasPrice;
  }

  // Gas estimate + buffer
  try {
    const estimated = await contract.estimateGas.transfer(to, amountBaseUnits);
    overrides.gasLimit = estimated.mul(120).div(100);
  } catch (_) {
    // If estimate fails, let ethers/provider choose.
  }

  const tx = await contract.transfer(to, amountBaseUnits, overrides);

  if (EVM_DEBUG) {
    try {
      console.log(`[EVM] broadcasted txHash=${tx.hash}`);
    } catch (_) {
      // ignore
    }
  }

  return {
    chain: chainLabel,
    from: wallet.address,
    to,
    token,
    decimals,
    amountHuman: String(amountHuman),
    amountBaseUnits: amountBaseUnits.toString(),
    txHash: tx.hash
  };
}

async function sendUsdcFromEnv({ amountUsdc }) {
  const tokenAddress = getRequiredEnv('EVM_USDC_TOKEN_ADDRESS');
  const fromPrivateKey = getRequiredEnv('EVM_WALLET_A_PRIVATE_KEY');
  const toAddress = getRequiredEnv('EVM_WALLET_B_ADDRESS');

  return withWalletLock(() =>
    sendErc20Transfer({
      tokenAddress,
      fromPrivateKey,
      toAddress,
      amountHuman: amountUsdc,
      chainLabel: 'polygon-amoy'
    })
  );
}

module.exports = {
  sendErc20Transfer,
  sendUsdcFromEnv,
  withWalletLock
};
