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
    explorerBase: "https://blockexplorer.minepi.com/tx/",
    accentColor: "text-indigo-400",
    // Price fetched from CoinGecko API
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
  DOGE: {
    symbol: "DOGE",
    name: "Dogecoin (BEP20)",
    chain: "EVM",
    network: "BSC (BEP20)",
    logo: "/doge.png",
    category: "CRYPTO",
    addressField: "sidraAddress",
    decimals: 8,
    explorerBase: "https://bscscan.com/tx/",
    accentColor: "text-yellow-500",
    defaultPrice: 0.14,
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
    decimals: 6, // USDT TRC20 uses 6 decimals
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
  EURC: {
    symbol: "EURC",
    name: "Euro Coin",
    chain: "EVM",
    network: "EVM (ERC20)",
    logo: "/eurc.png",
    category: "STABLE",
    addressField: "sidraAddress",
    decimals: 4,
    explorerBase: "https://etherscan.io/tx/",
    accentColor: "text-blue-400",
    defaultPrice: 1.08,
  },
  OUSD: {
    symbol: "OUSD",
    name: "Origin Dollar",
    chain: "EVM",
    network: "EVM (ERC20)",
    logo: "/ousd.png",
    category: "STABLE",
    addressField: "sidraAddress",
    decimals: 4,
    explorerBase: "https://etherscan.io/tx/",
    accentColor: "text-cyan-400",
    defaultPrice: 1.00,
  },
};

// --- Helpers de compatibilité ---

export const WALLET_ASSET_ORDER = [
  "PI", "SDA", "USDT", "BTC", "ETH", "BNB", "DOGE", "SOL", "XRP", "XLM", "TRX", "ADA", "TON",
  "USDC", "DAI", "BUSD", "EURC", "OUSD"
];

// ─────────────────────────────────────────────────────────────────────────────
// MATRICE DE CAPACITÉS DÉPÔT / RETRAIT (source de vérité unique)
//
// Toute la logique dépôt/retrait doit s'appuyer sur ces maps pour éviter les
// désynchronisations entre l'UI, les routes de sync et le broadcast on-chain.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Endpoint de synchronisation on-chain par actif.
 * Un actif présent ici voit ses dépôts détectés et crédités automatiquement.
 * PI est absent volontairement : ses dépôts passent par le SDK Pi (/api/pi/*).
 */
export const SYNC_ENDPOINTS: Record<string, string> = {
  SDA: "/api/wallet/sidra/sync",
  BTC: "/api/wallet/btc/sync",
  ETH: "/api/wallet/eth/sync",
  BNB: "/api/wallet/bnb/sync",
  DOGE: "/api/wallet/doge/sync",
  SOL: "/api/wallet/sol/sync",
  XRP: "/api/wallet/xrp/sync",
  XLM: "/api/wallet/xlm/sync",
  TRX: "/api/wallet/trx/sync",
  USDT: "/api/wallet/usdt/sync",
  USDC: "/api/wallet/usdc/sync",
  DAI: "/api/wallet/dai/sync",
  BUSD: "/api/wallet/busd/sync",
  EURC: "/api/wallet/eurc/sync",
  OUSD: "/api/wallet/ousd/sync",
};

/**
 * Actifs dont le dépôt est opérationnel (adresse dédiée + détection du solde).
 * PI inclus via le SDK Pi Network.
 */
export const DEPOSIT_SUPPORTED = new Set<string>(["PI", ...Object.keys(SYNC_ENDPOINTS)]);

/**
 * Actifs dont le retrait externe est réellement diffusé on-chain par le serveur.
 * - PI : via le SDK Pi Network (paiement A2U)
 * - SDA / ETH / BNB : natif EVM (clé sidraPrivateKey)
 * - USDC / BUSD / DAI / EURC / OUSD : ERC20/BEP20 (clé sidraPrivateKey)
 * - TRX / USDT : TRON / TRC20 (clé usdtPrivateKey)
 */
export const WITHDRAW_ONCHAIN_SUPPORTED = new Set<string>([
  "PI",
  "SDA",
  "ETH",
  "BNB",
  "USDC",
  "BUSD",
  "DAI",
  "EURC",
  "OUSD",
  "TRX",
  "USDT",
]);

/**
 * Actifs listés dans l'app mais SANS adresse de dépôt dédiée, SANS lecture de
 * solde et SANS broadcast. Ils sont mappés par défaut sur l'adresse EVM, ce qui
 * ferait perdre les fonds d'un utilisateur. Ils restent visibles (swap, cours)
 * mais dépôt et retrait direct sont bloqués jusqu'à implémentation réelle.
 */
export const UNSUPPORTED_ONCHAIN_ASSETS = new Set<string>(["ADA", "TON"]);

export function isDepositSupported(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return DEPOSIT_SUPPORTED.has(s) && !UNSUPPORTED_ONCHAIN_ASSETS.has(s);
}

export function isWithdrawSupported(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return WITHDRAW_ONCHAIN_SUPPORTED.has(s) && !UNSUPPORTED_ONCHAIN_ASSETS.has(s);
}

export function getSyncEndpoint(symbol: string): string | null {
  return SYNC_ENDPOINTS[symbol.toUpperCase()] ?? null;
}

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
