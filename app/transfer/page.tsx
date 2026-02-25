
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Scan,
  CheckCircle2,
  Loader2,
  Wallet as WalletIcon,
  ChevronDown,
  ShieldCheck,
  Globe,
  AlertTriangle,
  ArrowUpRight,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { QRScanner } from "@/components/qr-scanner";
import { useLanguage } from "@/context/LanguageContext";
import { CRYPTO_ASSETS, getAssetConfig } from "@/lib/crypto-config";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface WalletData {
  id?: string;
  currency: string;
  balance: number;
  type?: string;
}

interface RecipientData {
  username?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isExternal?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// METADATA STATIQUE — couvre TOUS les assets du schéma Prisma
// (fallback si CRYPTO_ASSETS ne les contient pas encore)
// ─────────────────────────────────────────────────────────────────────────────
const STATIC_META: Record<
  string,
  { symbol: string; network: string; color: string; logo: string; addressType?: string }
> = {
  // ── Fiat ──────────────────────────────────────────────────────────────────
  XAF: {
    symbol: "XAF",
    network: "PimPay",
    color: "text-emerald-400",
    logo: "",
    addressType: "internal",
  },
  // ── Pi Network ────────────────────────────────────────────────────────────
  PI: {
    symbol: "PI",
    network: "Pi Network",
    color: "text-yellow-400",
    logo: "https://assets.coingecko.com/coins/images/28830/small/pi-network.png",
    addressType: "stellar",
  },
  // ── EVM / Sidra ───────────────────────────────────────────────────────────
  SIDRA: {
    symbol: "SIDRA",
    network: "Sidra Chain",
    color: "text-teal-400",
    logo: "https://assets.coingecko.com/coins/images/36888/small/sidra.png",
    addressType: "evm",
  },
  USDT: {
    symbol: "USDT",
    network: "TRON TRC20",
    color: "text-green-400",
    logo: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
    addressType: "tron",
  },
  "USDT-ERC20": {
    symbol: "USDT",
    network: "Ethereum ERC20",
    color: "text-green-400",
    logo: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
    addressType: "evm",
  },
  USDC: {
    symbol: "USDC",
    network: "Ethereum ERC20",
    color: "text-blue-400",
    logo: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    addressType: "evm",
  },
  BUSD: {
    symbol: "BUSD",
    network: "BNB Smart Chain",
    color: "text-yellow-300",
    logo: "https://assets.coingecko.com/coins/images/9576/small/BUSD.png",
    addressType: "evm",
  },
  DAI: {
    symbol: "DAI",
    network: "Ethereum ERC20",
    color: "text-amber-400",
    logo: "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
    addressType: "evm",
  },
  // ── XRP Ledger ────────────────────────────────────────────────────────────
  XRP: {
    symbol: "XRP",
    network: "XRP Ledger",
    color: "text-sky-400",
    logo: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
    addressType: "xrp",
  },
  // ── Stellar ───────────────────────────────────────────────────────────────
  XLM: {
    symbol: "XLM",
    network: "Stellar Network",
    color: "text-indigo-400",
    logo: "https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png",
    addressType: "stellar",
  },
  // ── Solana ────────────────────────────────────────────────────────────────
  SOL: {
    symbol: "SOL",
    network: "Solana",
    color: "text-purple-400",
    logo: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
    addressType: "solana",
  },
  // ── Bitcoin ───────────────────────────────────────────────────────────────
  BTC: {
    symbol: "BTC",
    network: "Bitcoin",
    color: "text-orange-400",
    logo: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
    addressType: "bitcoin",
  },
  // ── Ethereum ──────────────────────────────────────────────────────────────
  ETH: {
    symbol: "ETH",
    network: "Ethereum",
    color: "text-violet-400",
    logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    addressType: "evm",
  },
  // ── BNB ───────────────────────────────────────────────────────────────────
  BNB: {
    symbol: "BNB",
    network: "BNB Smart Chain",
    color: "text-yellow-400",
    logo: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
    addressType: "evm",
  },
  // ── Litecoin ──────────────────────────────────────────────────────────────
  LTC: {
    symbol: "LTC",
    network: "Litecoin",
    color: "text-gray-300",
    logo: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
    addressType: "bitcoin",
  },
};

/** Récupère les métadonnées d'une devise (CRYPTO_ASSETS d'abord, puis fallback statique) */
function getCurrencyMeta(currency: string) {
  const key = currency.toUpperCase();
  // 1) Depuis la config centralisée du projet
  const config = CRYPTO_ASSETS[key];
  if (config) {
    return {
      symbol: config.symbol,
      network: config.network,
      color: config.accentColor,
      logo: config.logo ?? "",
      addressType: STATIC_META[key]?.addressType ?? "internal",
    };
  }
  // 2) Depuis les métadonnées statiques ci-dessus
  if (STATIC_META[key]) return STATIC_META[key];
  // 3) Fallback XAF
  return STATIC_META.XAF;
}

// ─────────────────────────────────────────────────────────────────────────────
// DÉTECTION D'ADRESSE EXTERNE (tous réseaux du schéma Prisma)
// ─────────────────────────────────────────────────────────────────────────────
interface DetectedAddress {
  isExternal: boolean;
  networkLabel: string;
  networkKey: string; // clé pour forcer la devise si nécessaire
}

function detectExternalAddress(
  address: string,
  selectedCurrency: string
): DetectedAddress | null {
  if (!address || address.length < 20) return null;

  // ── Pi Network / Stellar (adresses G... de 56 chars) ──────────────────────
  const isStellarLike = /^G[A-Z2-7]{55}$/.test(address);
  if (isStellarLike) {
    const isPi = selectedCurrency === "PI";
    return {
      isExternal: true,
      networkLabel: isPi ? "Pi Network" : "Stellar (XLM)",
      networkKey: isPi ? "PI" : "XLM",
    };
  }

  // ── EVM / SDA / Sidra (0x...) ─────────────────────────────────────────────
  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(address);
  if (isEvm) {
    let evmLabel = "EVM / ERC20";
    if (selectedCurrency === "SIDRA") evmLabel = "Sidra Chain";
    else if (selectedCurrency === "USDC") evmLabel = "USDC ERC20";
    else if (selectedCurrency === "BUSD") evmLabel = "BNB Smart Chain";
    else if (selectedCurrency === "DAI") evmLabel = "DAI ERC20";
    else if (selectedCurrency === "ETH") evmLabel = "Ethereum";
    else if (selectedCurrency === "BNB") evmLabel = "BNB Smart Chain";
    return { isExternal: true, networkLabel: evmLabel, networkKey: selectedCurrency };
  }

  // ── TRON TRC20 (T..., 34 chars) ───────────────────────────────────────────
  const isTron = /^T[a-zA-Z0-9]{33}$/.test(address);
  if (isTron) {
    return { isExternal: true, networkLabel: "USDT TRC20 (TRON)", networkKey: "USDT" };
  }

  // ── XRP Ledger (r..., 25-34 chars) ────────────────────────────────────────
  const isXrp = /^r[a-zA-Z0-9]{24,33}$/.test(address);
  if (isXrp) {
    return { isExternal: true, networkLabel: "XRP Ledger", networkKey: "XRP" };
  }

  // ── Solana (base58, 32-44 chars, pas de 0/O/I/l) ─────────────────────────
  const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  if (isSolana) {
    return { isExternal: true, networkLabel: "Solana (SOL)", networkKey: "SOL" };
  }

  // ── Bitcoin Legacy & SegWit (1... ou 3...) ────────────────────────────────
  const isBtcLegacy = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
  if (isBtcLegacy) {
    return { isExternal: true, networkLabel: "Bitcoin (BTC)", networkKey: "BTC" };
  }

  // ── Bitcoin Bech32 (bc1...) ───────────────────────────────────────────────
  const isBtcBech32 = /^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(address);
  if (isBtcBech32) {
    return { isExternal: true, networkLabel: "Bitcoin Bech32 (BTC)", networkKey: "BTC" };
  }

  // ── Litecoin (L... ou M...) ───────────────────────────────────────────────
  const isLtc = /^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(address);
  if (isLtc) {
    return { isExternal: true, networkLabel: "Litecoin (LTC)", networkKey: "LTC" };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES UI
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SendPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMountedRef = useRef(true);

  // Form state
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("XAF");
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Visual state
  const [isSearching, setIsSearching] = useState(false);
  const [recipientData, setRecipientData] = useState<RecipientData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);

  const networkFee = 0.01;

  // ── Fetch wallets ──────────────────────────────────────────────────────────
  const fetchWallets = async () => {
    try {
      const res = await fetch("/api/user/profile", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok && isMountedRef.current) {
        const data = await res.json();
        const userWallets: WalletData[] = data.user?.wallets || [];
        setWallets(userWallets);

        // Sélection par défaut intelligente
        const hasXAF = userWallets.find((w) => w.currency === "XAF");
        if (!hasXAF && userWallets.length > 0) {
          setSelectedCurrency(userWallets[0].currency);
        }
      }
    } catch (err) {
      console.error("Wallet fetch error:", err);
    } finally {
      if (isMountedRef.current) setIsLoadingWallets(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;
    fetchWallets();

    const addr = searchParams.get("address");
    const cur = searchParams.get("currency");
    if (addr) setRecipientId(addr);
    if (cur) setSelectedCurrency(cur.toUpperCase());

    return () => {
      isMountedRef.current = false;
    };
  }, [searchParams]);

  const currentWallet = wallets.find((w) => w.currency === selectedCurrency) ?? {
    balance: 0,
    currency: selectedCurrency,
  };

  // ── Recherche destinataire ─────────────────────────────────────────────────
  useEffect(() => {
    const abortController = new AbortController();

    const searchUser = async () => {
      if (recipientId.length < 3) {
        setRecipientData(null);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/user/search?query=${encodeURIComponent(recipientId)}`,
          { signal: abortController.signal }
        );

        if (res.ok && isMountedRef.current) {
          const data = await res.json();
          setRecipientData(data);
        } else if (isMountedRef.current) {
          // Détection adresse externe multi-réseau
          const detected = detectExternalAddress(recipientId, selectedCurrency);

          if (detected) {
            setRecipientData({
              firstName: t("transfer.externalAddress"),
              lastName: `${detected.networkLabel} ${t("transfer.externalNetwork")}`,
              avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${recipientId}`,
              isExternal: true,
            });

            // Auto-sélection de la devise si elle correspond au réseau détecté
            if (
              detected.networkKey &&
              detected.networkKey !== selectedCurrency &&
              wallets.find((w) => w.currency === detected.networkKey)
            ) {
              setSelectedCurrency(detected.networkKey);
            }
          } else {
            setRecipientData(null);
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && isMountedRef.current) setRecipientData(null);
      } finally {
        if (isMountedRef.current) setIsSearching(false);
      }
    };

    const timer = setTimeout(searchUser, 600);
    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [recipientId, selectedCurrency]);

  // ── QR Scanner ────────────────────────────────────────────────────────────
  const handleQRResult = (data: string) => {
    setShowQRScanner(false);
    if (data && data.length > 0) {
      setRecipientId(data);
      toast.success(t("transfer.qrScanned"));
    }
  };

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleGoToSummary = async () => {
    if (!recipientId || !amount) {
      toast.error(t("transfer.fillAllFields"));
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error(t("transfer.invalidAmount"));
      return;
    }
    if (numericAmount > currentWallet.balance) {
      toast.error(
        t("transfer.insufficientBalance").replace("{currency}", selectedCurrency)
      );
      return;
    }

    setIsSubmitting(true);
    const params = new URLSearchParams({
      recipient: recipientId,
      recipientName: recipientData
        ? `${recipientData.firstName} ${recipientData.lastName}`
        : recipientId,
      recipientAvatar: recipientData?.avatar || "",
      amount: amount,
      currency: selectedCurrency,
      fee: networkFee.toString(),
      description: description || t("transfer.defaultDescription"),
    });
    router.push(`/transfer/summary?${params.toString()}`);
  };

  if (!mounted) return null;

  const currencyMeta = getCurrencyMeta(selectedCurrency);
  const isDisabled =
    isSubmitting ||
    !amount ||
    !recipientId ||
    parseFloat(amount) > currentWallet.balance ||
    parseFloat(amount) <= 0;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#070d1a] text-white pb-32">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#070d1a]/95 backdrop-blur-xl border-b border-white/[0.04] px-5 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="font-black text-lg">{t("transfer.title")}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-slate-500">PimPay Secure Protocol</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 rounded-xl px-3 py-1.5">
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-bold text-blue-300">Web3</span>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-5">

        {/* ── SÉLECTEUR DE PORTEFEUILLE ──────────────────────────────────────── */}
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2 px-1">
            {t("transfer.fundSource")}
          </p>
          <div className="relative">
            <button
              onClick={() => setShowWalletPicker(!showWalletPicker)}
              className="w-full bg-[#0c1629] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                  {currencyMeta.logo ? (
                    <img
                      src={currencyMeta.logo}
                      alt={selectedCurrency}
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <WalletIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-black text-sm">{selectedCurrency}</p>
                  <p className="text-xs text-slate-500">
                    {isLoadingWallets
                      ? t("transfer.loadingWallets")
                      : `${currentWallet.balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })} ${t("transfer.availableSuffix")}`}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform ${
                  showWalletPicker ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* ── Dropdown portefeuilles ──────────────────────────────────── */}
            {showWalletPicker && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0c1629] border border-white/[0.06] rounded-2xl overflow-hidden z-20 shadow-2xl">
                {wallets.length > 0 ? (
                  wallets.map((w) => {
                    const meta = getCurrencyMeta(w.currency);
                    return (
                      <button
                        key={w.currency}
                        onClick={() => {
                          setSelectedCurrency(w.currency);
                          setShowWalletPicker(false);
                        }}
                        className="w-full p-4 flex items-center gap-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {meta?.logo ? (
                            <img
                              src={meta.logo}
                              alt={w.currency}
                              className="w-6 h-6 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="text-[10px] font-black text-slate-400">
                              {w.currency.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-bold text-sm ${meta?.color ?? "text-white"}`}>
                            {w.currency}
                          </p>
                          <p className="text-xs text-slate-500">
                            {w.balance.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}{" "}
                            {w.currency}
                          </p>
                        </div>
                        {/* Badge réseau */}
                        <span className="text-[9px] text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">
                          {meta?.network}
                        </span>
                        {selectedCurrency === w.currency && (
                          <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="p-4 text-sm text-slate-500 text-center">
                    {t("transfer.noWallet")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Infos réseau */}
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[11px] text-slate-500">{currencyMeta.network}</span>
            </div>
            <span className="text-[11px] text-slate-600">
              {t("common.fee")}: {networkFee} {selectedCurrency}
            </span>
          </div>
        </div>

        {/* ── DESTINATAIRE ────────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2 px-1">
            {t("transfer.beneficiary")}
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              value={recipientId}
              placeholder={t("transfer.recipientPlaceholder") || "Adresse, username…"}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full bg-[#0c1629] border border-white/[0.06] rounded-2xl p-4 pl-12 pr-14 text-sm text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-700"
            />
            <button
              onClick={() => setShowQRScanner(true)}
              className="absolute right-3 top-[0.75rem] p-2 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors active:scale-90"
            >
              <Scan className="w-4 h-4" />
            </button>
          </div>

          {/* Indicateur de recherche */}
          {isSearching && (
            <div className="flex items-center gap-2 mt-2 px-1">
              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-500">{t("transfer.searchingBlockchain")}</span>
            </div>
          )}

          {/* Carte destinataire */}
          {recipientData && (
            <div className="mt-3 bg-[#0c1629] border border-white/[0.06] rounded-2xl p-3 flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <img
                  src={
                    recipientData.avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${recipientData.firstName}`
                  }
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover bg-white/5"
                />
                {!recipientData.isExternal && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">
                  {recipientData.firstName} {recipientData.lastName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {recipientData.isExternal ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {t("transfer.external")}
                    </span>
                  ) : (
                    `@${recipientData.username || "pimuser"}`
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setRecipientId("");
                  setRecipientData(null);
                }}
                className="p-1.5 text-slate-600 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── SAISIE MONTANT ──────────────────────────────────────────────────── */}
        <div className="bg-[#0c1629] border border-white/[0.06] rounded-2xl p-5">
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent p-3 text-5xl font-black outline-none text-center text-white placeholder:text-white/5 transition-all"
            />
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={`text-sm font-bold ${currencyMeta.color}`}>
                {selectedCurrency}
              </span>
              {amount && parseFloat(amount) > currentWallet.balance && (
                <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-0.5">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] text-red-400">
                    {t("transfer.insufficient")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Montants rapides */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
                  amount === val.toString()
                    ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                    : "bg-white/[0.03] border-white/5 text-slate-500 hover:text-slate-300"
                }`}
              >
                {val.toLocaleString()}
              </button>
            ))}
            <button
              onClick={() => setAmount(currentWallet.balance.toString())}
              className="flex-shrink-0 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase border bg-white/[0.03] border-white/5 text-emerald-500 hover:border-emerald-500/30 transition-all"
            >
              MAX
            </button>
          </div>
        </div>

        {/* ── NOTE OPTIONNELLE ────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2 px-1">
            {t("transfer.noteOptional")}
          </p>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("transfer.notePlaceholder") || "Ex: Remboursement dîner…"}
            className="w-full bg-[#0c1629] border border-white/[0.06] rounded-2xl p-4 text-sm text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700 resize-none"
          />
        </div>

        {/* ── RÉSUMÉ ──────────────────────────────────────────────────────────── */}
        {amount && parseFloat(amount) > 0 && (
          <div className="bg-[#0c1629] border border-white/[0.06] rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {t("transfer.summaryLabel")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t("transfer.amountLabel")}</span>
              <span className="font-bold">
                {parseFloat(amount).toLocaleString()} {selectedCurrency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t("transfer.networkFee")}</span>
              <span className="font-bold text-slate-400">
                {networkFee} {selectedCurrency}
              </span>
            </div>
            <div className="border-t border-white/[0.06] pt-2 flex justify-between text-sm">
              <span className="font-bold">{t("transfer.totalDebit")}</span>
              <span className="font-black text-blue-400">
                {(parseFloat(amount) + networkFee).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                {selectedCurrency}
              </span>
            </div>
          </div>
        )}

        {/* ── BOUTON CONTINUER ────────────────────────────────────────────────── */}
        <button
          disabled={isDisabled}
          onClick={handleGoToSummary}
          className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-sm ${
            isDisabled
              ? "bg-slate-800/50 text-slate-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/15 active:scale-[0.98]"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("transfer.processing")}
            </>
          ) : (
            <>
              {t("transfer.continueBtn")}
              <ArrowUpRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* ── MENTION SÉCURITÉ ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2 pb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-[11px] text-slate-600">{t("transfer.encryptedTransaction")}</span>
        </div>
      </div>

      {/* ── MODALES ──────────────────────────────────────────────────────────── */}
      {showQRScanner && (
        <QRScanner onResult={handleQRResult} onClose={() => setShowQRScanner(false)} />
      )}

      <BottomNav onMenuOpen={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
