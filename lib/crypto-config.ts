/**
 * PIMPAY - Configuration centralisée multi-chain v2.5
 * Fusionnée pour supporter Sidra Chain, Pi Network et les nouveaux assets.
 */

export type ChainKey = "PIMPAY" | "EVM" | "TRON" | "BTC" | "SOL" | "XRP" | "STELLAR" | "TON" | "ADA";
export type AssetCategory = "CRYPTO" | "STABLE" | "FIAT";

export interface CryptoAsset {
  symbol: string;
  name: string;
  chain: ChainKey;
  network: string;
  logo: string;
  category: AssetCategory;
  /** Champs techniques pour la logique métier et Prisma */
  addressField: string;
  decimals: number;
  explorerBase: string;
  accentColor: string;
  defaultPrice?: number;
}

// --- Configuration de tous les assets ---
export const CRYPTO_ASSETS: Record<string, CryptoAsset> = {
  PI: {
    symbol: "PI",
    name: "Pi Network",
    chain: "STELLAR",
    network: "Pi / Stellar",
    logo: "/pi.png",
    category: "CRYPTO",
    addressField: "xlmAddress",
    decimals: 8,
    explorerBase: "https://minepi.com/blockexplorer/tx/",
    accentColor: "text-indigo-400",
    defaultPrice: 314159,
  },
  SDA: {
    symbol: "SDA",
    name: "Sidra Chain",
    chain: "EVM",
    network: "Sidra / EVM",
    logo: "/sda.png",
    category: "CRYPTO",
    addressField: "sidraAddress",
    decimals: 4,
    explorerBase: "https://ledger.sidrachain.com/tx/",
    accentColor: "text-amber-400",
    defaultPrice: 1.20,
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    chain: "BTC",
    network: "Bitcoin",
    logo: "/btc.png",
    category: "CRYPTO",
    addressField: "walletAddress",
    decimals: 8,
    explorerBase: "https://www.blockchain.com/btc/tx/",
    accentColor: "text-orange-400",
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    chain: "EVM",
    network: "EVM",
    logo: "/eth.png",
    category: "CRYPTO",
    addressField: "sidraAddress",
    decimals: 8,
    explorerBase: "https://etherscan.io/tx/",
    accentColor: "text-sky-400",
  },
  BNB: {
    symbol: "BNB",
    name: "BNB",
    chain: "EVM",
    network: "BSC / EVM",
    logo: "/bnb.png",
    category: "CRYPTO",
    addressField: "sidraAddress",
    decimals: 8,
    explorerBase: "https://bscscan.com/tx/",
    accentColor: "text-yellow-400",
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    chain: "SOL",
    network: "Solana",
    logo: "/sol.png",
    category: "CRYPTO",
    addressField: "solAddress",
    decimals: 8,
    explorerBase: "https://solscan.io/tx/",
    accentColor: "text-purple-400",
  },
  XRP: {
    symbol: "XRP",
    name: "Ripple",
    chain: "XRP",
    network: "XRP Ledger",
    logo: "/xrp.png",
    category: "CRYPTO",
    addressField: "xrpAddress",
    decimals: 6,
    explorerBase: "https://xrpscan.com/tx/",
    accentColor: "text-slate-300",
  },
  XLM: {
    symbol: "XLM",
    name: "Stellar",
    chain: "STELLAR",
    network: "Stellar",
    logo: "/xlm.png",
    category: "CRYPTO",
    addressField: "xlmAddress",
    decimals: 7,
    explorerBase: "https://stellar.expert/explorer/public/tx/",
    accentColor: "text-cyan-300",
  },
  TRX: {
    symbol: "TRX",
    name: "Tron",
    chain: "TRON",
    network: "TRON",
    logo: "/trx.png",
    category: "CRYPTO",
    addressField: "usdtAddress",
    decimals: 6,
    explorerBase: "https://tronscan.org/#/transaction/",
    accentColor: "text-red-400",
  },
  ADA: {
    symbol: "ADA",
    name: "Cardano",
    chain: "ADA",
    network: "Cardano",
    logo: "/ada.png",
    category: "CRYPTO",
    addressField: "sidraAddress", // Par défaut mappé sur EVM si pas de champ spécifique
    decimals: 6,
    explorerBase: "https://cardanoscan.io/transaction/",
    accentColor: "text-blue-300",
  },
  TON: {
    symbol: "TON",
    name: "Toncoin",
    chain: "TON",
    network: "TON",
    logo: "/ton.png",
    category: "CRYPTO",
    addressField: "sidraAddress",
    decimals: 9,
    explorerBase: "https://tonscan.org/tx/",
    accentColor: "text-sky-300",
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    chain: "TRON",
    network: "USDT TRC20",
    logo: "/usdt.png",
    category: "STABLE",
    addressField: "usdtAddress",
    decimals: 4,
    explorerBase: "https://tronscan.org/#/transaction/",
    accentColor: "text-emerald-400",
    defaultPrice: 1.00,
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    chain: "EVM",
    network: "EVM",
    logo: "/usdc.png",
    category: "STABLE",
    addressField: "sidraAddress",
    decimals: 4,
    explorerBase: "https://etherscan.io/tx/",
    accentColor: "text-blue-400",
    defaultPrice: 1.00,
  },
  DAI: {
    symbol: "DAI",
    name: "DAI",
    chain: "EVM",
    network: "EVM",
    logo: "/dai.png",
    category: "STABLE",
    addressField: "sidraAddress",
    decimals: 4,
    explorerBase: "https://etherscan.io/tx/",
    accentColor: "text-amber-300",
    defaultPrice: 1.00,
  },
  BUSD: {
    symbol: "BUSD",
    name: "Binance USD",
    chain: "EVM",
    network: "EVM",
    logo: "/busd.png",
    category: "STABLE",
    addressField: "sidraAddress",
    decimals: 4,
    explorerBase: "https://bscscan.com/tx/",
    accentColor: "text-yellow-400",
    defaultPrice: 1.00,
  },
};

// --- Helpers de compatibilité ---

export const WALLET_ASSET_ORDER = [
  "PI", "SDA", "USDT", "BTC", "ETH", "BNB", "SOL", "XRP", "XLM", "TRX", "ADA", "TON"
];

export function getAssetConfig(symbol: string): CryptoAsset {
  return CRYPTO_ASSETS[symbol.toUpperCase()] || CRYPTO_ASSETS.PI;
}

export function getExplorerLink(symbol: string, hash: string): string {
  const config = getAssetConfig(symbol);
  return `${config.explorerBase}${hash}`;
}

export function getAddressField(symbol: string): string {
  return getAssetConfig(symbol).addressField;
}
