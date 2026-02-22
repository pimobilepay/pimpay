/**
 * PIMPAY - Configuration centralisee multi-chain
 * Source unique de verite pour tous les assets, reseaux, API et logos.
 * 
 * REGLES :
 * - Logos : /<symbol-minuscule>.png dans /public
 * - Reseaux : Noms reels, jamais "Pi Mainnet" par defaut
 * - API par groupe de protocole (EVM, Stellar, Tron, Uniques)
 */

// --- Groupes de protocoles ---
export type ProtocolGroup = "EVM" | "STELLAR" | "TRON" | "BTC" | "XRP" | "SOL";

export interface CryptoAsset {
  symbol: string;
  name: string;
  network: string;
  logo: string;
  group: ProtocolGroup;
  targetApi: string;
  addressPrefix: string;
  explorerBase: string;
  explorerLabel: string;
  decimals: number;
  coingeckoId?: string;
  defaultPrice: number;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  /** Champ Prisma User pour l'adresse de ce groupe */
  addressField: string;
}

// --- Mapping API par groupe ---
const API_GROUPS = {
  EVM: "/api/wallet/sidra",
  STELLAR: "/api/wallet/xlm",
  TRON: "/api/wallet/trx",
  BTC: "/api/wallet/btc",
  XRP: "/api/wallet/xrp",
  SOL: "/api/wallet/sol",
} as const;

// --- Configuration de tous les assets ---
export const CRYPTO_ASSETS: Record<string, CryptoAsset> = {
  PI: {
    symbol: "PI",
    name: "Pi Network",
    network: "Stellar / Pi Network",
    logo: "/pi.png",
    group: "STELLAR",
    targetApi: API_GROUPS.STELLAR,
    addressPrefix: "G",
    explorerBase: "https://minepi.com/blockexplorer/tx/",
    explorerLabel: "Pi Explorer",
    decimals: 8,
    defaultPrice: 314159,
    accentColor: "text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/20",
    addressField: "xlmAddress",
  },
  SDA: {
    symbol: "SDA",
    name: "Sidra Chain",
    network: "EVM Network",
    logo: "/sda.png",
    group: "EVM",
    targetApi: API_GROUPS.EVM,
    addressPrefix: "0x",
    explorerBase: "https://ledger.sidrachain.com/tx/",
    explorerLabel: "Sidra Ledger",
    decimals: 4,
    defaultPrice: 1.20,
    accentColor: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/20",
    addressField: "sidraAddress",
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    network: "Tron Network (TRC20)",
    logo: "/usdt.png",
    group: "TRON",
    targetApi: API_GROUPS.TRON,
    addressPrefix: "T",
    explorerBase: "https://tronscan.org/#/transaction/",
    explorerLabel: "TronScan",
    decimals: 4,
    coingeckoId: "tether",
    defaultPrice: 1.00,
    accentColor: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/20",
    addressField: "usdtAddress",
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    network: "Bitcoin Mainnet",
    logo: "/btc.png",
    group: "BTC",
    targetApi: API_GROUPS.BTC,
    addressPrefix: "bc1",
    explorerBase: "https://www.blockchain.com/btc/tx/",
    explorerLabel: "Blockchain.com",
    decimals: 8,
    coingeckoId: "bitcoin",
    defaultPrice: 0,
    accentColor: "text-orange-400",
    accentBg: "bg-orange-500/10",
    accentBorder: "border-orange-500/20",
    addressField: "walletAddress",
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    network: "EVM Network",
    logo: "/eth.png",
    group: "EVM",
    targetApi: API_GROUPS.EVM,
    addressPrefix: "0x",
    explorerBase: "https://etherscan.io/tx/",
    explorerLabel: "Etherscan",
    decimals: 8,
    coingeckoId: "ethereum",
    defaultPrice: 0,
    accentColor: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-400/20",
    addressField: "sidraAddress",
  },
  BNB: {
    symbol: "BNB",
    name: "BNB",
    network: "EVM Network",
    logo: "/bnb.png",
    group: "EVM",
    targetApi: API_GROUPS.EVM,
    addressPrefix: "0x",
    explorerBase: "https://bscscan.com/tx/",
    explorerLabel: "BscScan",
    decimals: 8,
    coingeckoId: "binancecoin",
    defaultPrice: 0,
    accentColor: "text-yellow-400",
    accentBg: "bg-yellow-500/10",
    accentBorder: "border-yellow-500/20",
    addressField: "sidraAddress",
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    network: "Solana Mainnet",
    logo: "/sol.png",
    group: "SOL",
    targetApi: API_GROUPS.SOL,
    addressPrefix: "",
    explorerBase: "https://solscan.io/tx/",
    explorerLabel: "Solscan",
    decimals: 8,
    coingeckoId: "solana",
    defaultPrice: 0,
    accentColor: "text-purple-400",
    accentBg: "bg-purple-500/10",
    accentBorder: "border-purple-400/20",
    addressField: "solAddress",
  },
  XRP: {
    symbol: "XRP",
    name: "Ripple",
    network: "XRP Ledger",
    logo: "/xrp.png",
    group: "XRP",
    targetApi: API_GROUPS.XRP,
    addressPrefix: "r",
    explorerBase: "https://xrpscan.com/tx/",
    explorerLabel: "XRP Scan",
    decimals: 6,
    coingeckoId: "ripple",
    defaultPrice: 0,
    accentColor: "text-slate-300",
    accentBg: "bg-slate-500/10",
    accentBorder: "border-slate-400/20",
    addressField: "xrpAddress",
  },
  XLM: {
    symbol: "XLM",
    name: "Stellar",
    network: "Stellar / Pi Network",
    logo: "/xlm.png",
    group: "STELLAR",
    targetApi: API_GROUPS.STELLAR,
    addressPrefix: "G",
    explorerBase: "https://stellar.expert/explorer/public/tx/",
    explorerLabel: "Stellar Expert",
    decimals: 7,
    coingeckoId: "stellar",
    defaultPrice: 0,
    accentColor: "text-sky-400",
    accentBg: "bg-sky-500/10",
    accentBorder: "border-sky-400/20",
    addressField: "xlmAddress",
  },
  TRX: {
    symbol: "TRX",
    name: "Tron",
    network: "Tron Network (TRC20)",
    logo: "/trx.png",
    group: "TRON",
    targetApi: API_GROUPS.TRON,
    addressPrefix: "T",
    explorerBase: "https://tronscan.org/#/transaction/",
    explorerLabel: "TronScan",
    decimals: 6,
    coingeckoId: "tron",
    defaultPrice: 0,
    accentColor: "text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    addressField: "usdtAddress",
  },
  ADA: {
    symbol: "ADA",
    name: "Cardano",
    network: "Cardano Mainnet",
    logo: "/ada.png",
    group: "EVM",
    targetApi: API_GROUPS.EVM,
    addressPrefix: "addr1",
    explorerBase: "https://cardanoscan.io/transaction/",
    explorerLabel: "CardanoScan",
    decimals: 6,
    coingeckoId: "cardano",
    defaultPrice: 0,
    accentColor: "text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/20",
    addressField: "sidraAddress",
  },
  DOGE: {
    symbol: "DOGE",
    name: "Dogecoin",
    network: "Dogecoin Network",
    logo: "/doge.png",
    group: "EVM",
    targetApi: API_GROUPS.EVM,
    addressPrefix: "D",
    explorerBase: "https://dogechain.info/tx/",
    explorerLabel: "DogeChain",
    decimals: 6,
    coingeckoId: "dogecoin",
    defaultPrice: 0,
    accentColor: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-400/20",
    addressField: "sidraAddress",
  },
  TON: {
    symbol: "TON",
    name: "Toncoin",
    network: "TON Network",
    logo: "/ton.png",
    group: "EVM",
    targetApi: API_GROUPS.EVM,
    addressPrefix: "EQ",
    explorerBase: "https://tonscan.org/tx/",
    explorerLabel: "TonScan",
    decimals: 6,
    coingeckoId: "the-open-network",
    defaultPrice: 0,
    accentColor: "text-sky-400",
    accentBg: "bg-sky-500/10",
    accentBorder: "border-sky-400/20",
    addressField: "sidraAddress",
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    network: "EVM Network",
    logo: "/usdc.png",
    group: "EVM",
    targetApi: API_GROUPS.EVM,
    addressPrefix: "0x",
    explorerBase: "https://etherscan.io/tx/",
    explorerLabel: "Etherscan",
    decimals: 4,
    coingeckoId: "usd-coin",
    defaultPrice: 1.00,
    accentColor: "text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-400/20",
    addressField: "sidraAddress",
  },
  DAI: {
    symbol: "DAI",
    name: "Dai",
    network: "EVM Network",
    logo: "/dai.png",
    group: "EVM",
    targetApi: API_GROUPS.EVM,
    addressPrefix: "0x",
    explorerBase: "https://etherscan.io/tx/",
    explorerLabel: "Etherscan",
    decimals: 4,
    coingeckoId: "dai",
    defaultPrice: 1.00,
    accentColor: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/20",
    addressField: "sidraAddress",
  },
  BUSD: {
    symbol: "BUSD",
    name: "Binance USD",
    network: "EVM Network",
    logo: "/busd.png",
    group: "EVM",
    targetApi: API_GROUPS.EVM,
    addressPrefix: "0x",
    explorerBase: "https://bscscan.com/tx/",
    explorerLabel: "BscScan",
    decimals: 4,
    coingeckoId: "binance-usd",
    defaultPrice: 1.00,
    accentColor: "text-yellow-400",
    accentBg: "bg-yellow-500/10",
    accentBorder: "border-yellow-500/20",
    addressField: "sidraAddress",
  },
  MATIC: {
    symbol: "MATIC",
    name: "Polygon",
    network: "EVM Network",
    logo: "/matic.png",
    group: "EVM",
    targetApi: API_GROUPS.EVM,
    addressPrefix: "0x",
    explorerBase: "https://polygonscan.com/tx/",
    explorerLabel: "PolygonScan",
    decimals: 8,
    coingeckoId: "matic-network",
    defaultPrice: 0,
    accentColor: "text-purple-400",
    accentBg: "bg-purple-500/10",
    accentBorder: "border-purple-400/20",
    addressField: "sidraAddress",
  },
};

// --- Helpers ---

/** Liste ordonnee des symboles affiches dans le wallet */
export const WALLET_ASSET_ORDER = [
  "PI", "SDA", "USDT", "BTC", "ETH", "BNB", "SOL", "XRP", "XLM", "TRX", "ADA", "DOGE", "TON",
];

/** Stablecoins affiches separement */
export const STABLECOIN_ORDER = ["USDC", "DAI", "BUSD"];

/** Tous les symboles dans l'ordre d'affichage */
export const ALL_SYMBOLS = [...WALLET_ASSET_ORDER, ...STABLECOIN_ORDER];

/** Obtenir l'asset config pour un symbole (fallback PI) */
export function getAssetConfig(symbol: string): CryptoAsset {
  return CRYPTO_ASSETS[symbol.toUpperCase()] || CRYPTO_ASSETS.PI;
}

/** Obtenir l'API cible pour un symbole */
export function getTargetApi(symbol: string): string {
  return getAssetConfig(symbol).targetApi;
}

/** Obtenir le lien explorateur d'une transaction */
export function getExplorerLink(symbol: string, hash: string): string {
  const config = getAssetConfig(symbol);
  return `${config.explorerBase}${hash}`;
}

/** Mapper symbole -> champ adresse Prisma */
export function getAddressField(symbol: string): string {
  return getAssetConfig(symbol).addressField;
}

/** Resoudre l'adresse d'un symbole depuis les donnees user */
export function resolveAddress(symbol: string, addresses: Record<string, string>): string {
  return addresses[symbol.toUpperCase()] || "";
}

/** Build CoinGecko ID list pour les prix du marche */
export function getCoinGeckoIds(): string {
  const ids = Object.values(CRYPTO_ASSETS)
    .filter((a) => a.coingeckoId)
    .map((a) => a.coingeckoId);
  return [...new Set(ids)].join(",");
}

/** Map CoinGecko ID -> symbols pour mise a jour des prix */
export function mapCoinGeckoPrices(data: Record<string, { usd?: number }>): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const [symbol, asset] of Object.entries(CRYPTO_ASSETS)) {
    if (asset.coingeckoId && data[asset.coingeckoId]?.usd) {
      prices[symbol] = data[asset.coingeckoId].usd!;
    } else {
      prices[symbol] = asset.defaultPrice;
    }
  }
  return prices;
}
