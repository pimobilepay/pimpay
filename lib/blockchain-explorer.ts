/**
 * Blockchain Explorer URL Generator
 * Returns the appropriate blockchain explorer URL based on currency/chain and transaction hash
 */

export interface BlockchainExplorerConfig {
  name: string;
  txUrl: (hash: string) => string;
  addressUrl: (address: string) => string;
  icon?: string;
}

export const BLOCKCHAIN_EXPLORERS: Record<string, BlockchainExplorerConfig> = {
  // Pi Network
  PI: {
    name: "Pi Explorer",
    txUrl: (hash) => `https://blockexplorer.minepi.com/tx/${hash}`,
    addressUrl: (address) => `https://blockexplorer.minepi.com/address/${address}`,
  },
  
  // Sidra Chain
  SDA: {
    name: "Sidra Ledger",
    txUrl: (hash) => `https://ledger.sidrachain.com/tx/${hash}`,
    addressUrl: (address) => `https://ledger.sidrachain.com/address/${address}`,
  },
  
  // Bitcoin
  BTC: {
    name: "Blockchain.com",
    txUrl: (hash) => `https://www.blockchain.com/btc/tx/${hash}`,
    addressUrl: (address) => `https://www.blockchain.com/btc/address/${address}`,
  },
  
  // Ethereum
  ETH: {
    name: "Etherscan",
    txUrl: (hash) => `https://etherscan.io/tx/${hash}`,
    addressUrl: (address) => `https://etherscan.io/address/${address}`,
  },
  
  // USDT (TRC20 - TRON)
  USDT: {
    name: "TronScan",
    txUrl: (hash) => `https://tronscan.org/#/transaction/${hash}`,
    addressUrl: (address) => `https://tronscan.org/#/address/${address}`,
  },
  
  // USDC (ERC20)
  USDC: {
    name: "Etherscan",
    txUrl: (hash) => `https://etherscan.io/tx/${hash}`,
    addressUrl: (address) => `https://etherscan.io/address/${address}`,
  },
  
  // Binance Smart Chain
  BNB: {
    name: "BscScan",
    txUrl: (hash) => `https://bscscan.com/tx/${hash}`,
    addressUrl: (address) => `https://bscscan.com/address/${address}`,
  },
  
  // Solana
  SOL: {
    name: "Solscan",
    txUrl: (hash) => `https://solscan.io/tx/${hash}`,
    addressUrl: (address) => `https://solscan.io/account/${address}`,
  },
  
  // Tron
  TRX: {
    name: "TronScan",
    txUrl: (hash) => `https://tronscan.org/#/transaction/${hash}`,
    addressUrl: (address) => `https://tronscan.org/#/address/${address}`,
  },
  
  // XRP
  XRP: {
    name: "XRP Scan",
    txUrl: (hash) => `https://xrpscan.com/tx/${hash}`,
    addressUrl: (address) => `https://xrpscan.com/account/${address}`,
  },
  
  // Stellar
  XLM: {
    name: "Stellar Expert",
    txUrl: (hash) => `https://stellar.expert/explorer/public/tx/${hash}`,
    addressUrl: (address) => `https://stellar.expert/explorer/public/account/${address}`,
  },
  
  // Cardano
  ADA: {
    name: "CardanoScan",
    txUrl: (hash) => `https://cardanoscan.io/transaction/${hash}`,
    addressUrl: (address) => `https://cardanoscan.io/address/${address}`,
  },
  
  // Dogecoin
  DOGE: {
    name: "DogeChain",
    txUrl: (hash) => `https://dogechain.info/tx/${hash}`,
    addressUrl: (address) => `https://dogechain.info/address/${address}`,
  },
  
  // TON
  TON: {
    name: "TonScan",
    txUrl: (hash) => `https://tonscan.org/tx/${hash}`,
    addressUrl: (address) => `https://tonscan.org/address/${address}`,
  },
  
  // DAI (ERC20/BEP20)
  DAI: {
    name: "Etherscan",
    txUrl: (hash) => `https://etherscan.io/tx/${hash}`,
    addressUrl: (address) => `https://etherscan.io/address/${address}`,
  },
  
  // BUSD (BEP20)
  BUSD: {
    name: "BscScan",
    txUrl: (hash) => `https://bscscan.com/tx/${hash}`,
    addressUrl: (address) => `https://bscscan.com/address/${address}`,
  },
};

/**
 * Get the blockchain explorer URL for a transaction
 */
export function getBlockchainTxUrl(currency: string, txHash: string): string | null {
  if (!txHash || !currency) return null;
  
  const normalizedCurrency = currency.toUpperCase();
  const explorer = BLOCKCHAIN_EXPLORERS[normalizedCurrency];
  
  if (!explorer) return null;
  
  return explorer.txUrl(txHash);
}

/**
 * Get the blockchain explorer URL for an address
 */
export function getBlockchainAddressUrl(currency: string, address: string): string | null {
  if (!address || !currency) return null;
  
  const normalizedCurrency = currency.toUpperCase();
  const explorer = BLOCKCHAIN_EXPLORERS[normalizedCurrency];
  
  if (!explorer) return null;
  
  return explorer.addressUrl(address);
}

/**
 * Get the explorer name for a currency
 */
export function getExplorerName(currency: string): string {
  const normalizedCurrency = currency.toUpperCase();
  return BLOCKCHAIN_EXPLORERS[normalizedCurrency]?.name || "Blockchain Explorer";
}

/**
 * Check if a currency has blockchain explorer support
 */
export function hasBlockchainExplorer(currency: string): boolean {
  return !!BLOCKCHAIN_EXPLORERS[currency?.toUpperCase()];
}
