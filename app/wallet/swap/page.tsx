"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  X,
  Zap,
  AlertCircle,
  Search,
  Check,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Pencil,
  Info,
  Copy,
  Sparkles,
  BadgeCheck,
  Share2,
  RotateCcw,
  Shield,
  Banknote,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  TYPES & DATA                                                       */
/* ------------------------------------------------------------------ */

interface Asset {
  id: string;
  name: string;
  symbol: string;
  color: string;
  category: "native" | "major" | "stablecoin" | "fiat";
  flag?: string;
  logo?: string;
  network?: string;
}

const ALL_ASSETS: Asset[] = [
  // Native / Ecosystem
  { id: "PI", name: "Pi Network", symbol: "PI", color: "#7c3aed", category: "native", logo: "/pi.png", network: "Pi / Stellar" },
  { id: "SDA", name: "Sidra Assets", symbol: "SDA", color: "#d97706", category: "native", logo: "/sda.png", network: "Sidra / EVM" },
  // Major Cryptos
  { id: "BTC", name: "Bitcoin", symbol: "BTC", color: "#f7931a", category: "major", logo: "/btc.png", network: "Bitcoin" },
  { id: "ETH", name: "Ethereum", symbol: "ETH", color: "#627eea", category: "major", logo: "/eth.png", network: "EVM" },
  { id: "BNB", name: "BNB", symbol: "BNB", color: "#f3ba2f", category: "major", logo: "/bnb.png", network: "BSC / EVM" },
  { id: "SOL", name: "Solana", symbol: "SOL", color: "#9945ff", category: "major", logo: "/sol.png", network: "Solana" },
  { id: "XRP", name: "Ripple", symbol: "XRP", color: "#23292f", category: "major", logo: "/xrp.png", network: "XRP Ledger" },
  { id: "XLM", name: "Stellar", symbol: "XLM", color: "#14b8a6", category: "major", logo: "/xlm.png", network: "Stellar" },
  { id: "TRX", name: "Tron", symbol: "TRX", color: "#eb0029", category: "major", logo: "/trx.png", network: "TRON" },
  { id: "ADA", name: "Cardano", symbol: "ADA", color: "#0033ad", category: "major", logo: "/ada.png", network: "Cardano" },
  { id: "DOGE", name: "Dogecoin", symbol: "DOGE", color: "#c2a633", category: "major", logo: "/doge.png", network: "Dogecoin" },
  { id: "TON", name: "Toncoin", symbol: "TON", color: "#0098ea", category: "major", logo: "/ton.png", network: "TON" },
  // Stablecoins
  { id: "USDT", name: "Tether", symbol: "USDT", color: "#26a17b", category: "stablecoin", logo: "/usdt.png", network: "USDT TRC20" },
  { id: "USDC", name: "USD Coin", symbol: "USDC", color: "#2775ca", category: "stablecoin", logo: "/usdc.png", network: "EVM" },
  { id: "DAI", name: "Dai", symbol: "DAI", color: "#f5ac37", category: "stablecoin", logo: "/dai.png", network: "EVM" },
  { id: "BUSD", name: "Binance USD", symbol: "BUSD", color: "#f0b90b", category: "stablecoin", logo: "/busd.png", network: "EVM" },
  // Fiat
  { id: "USD", name: "Dollar US", symbol: "USD", color: "#22c55e", category: "fiat", flag: "US", network: "PimPay" },
  { id: "EUR", name: "Euro", symbol: "EUR", color: "#3b82f6", category: "fiat", flag: "EU", network: "PimPay" },
  { id: "XAF", name: "Franc CFA (BEAC)", symbol: "XAF", color: "#0ea5e9", category: "fiat", flag: "CM", network: "PimPay" },
  { id: "XOF", name: "Franc CFA (BCEAO)", symbol: "XOF", color: "#06b6d4", category: "fiat", flag: "SN", network: "PimPay" },
  { id: "CDF", name: "Franc Congolais", symbol: "CDF", color: "#0284c7", category: "fiat", flag: "CD", network: "PimPay" },
  { id: "NGN", name: "Naira Nigerian", symbol: "NGN", color: "#16a34a", category: "fiat", flag: "NG", network: "PimPay" },
  { id: "AED", name: "Dirham Emirats", symbol: "AED", color: "#dc2626", category: "fiat", flag: "AE", network: "PimPay" },
  { id: "MGA", name: "Ariary Malgache", symbol: "MGA", color: "#059669", category: "fiat", flag: "MG", network: "PimPay" },
];

const CATEGORY_LABELS: Record<string, string> = {
  native: "Ecosysteme",
  major: "Principales",
  stablecoin: "Stablecoins",
  fiat: "Devises Fiat",
};

const CATEGORY_ORDER = ["native", "major", "stablecoin", "fiat"];

const CRYPTO_IDS = [
  "PI", "SDA", "BTC", "ETH", "BNB", "SOL", "XRP", "XLM",
  "TRX", "ADA", "DOGE", "TON", "USDT", "USDC", "DAI", "BUSD",
];

const PI_GCV = 314159;

/* ------------------------------------------------------------------ */
/*  ICON COMPONENT                                                     */
/* ------------------------------------------------------------------ */

function AssetIcon({ asset, size = 40 }: { asset: Asset; size?: number }) {
  if (asset.logo) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          width: size,
          height: size,
          background: `${asset.color}22`,
          border: `1px solid ${asset.color}33`,
        }}
      >
        <img
          src={asset.logo}
          alt={asset.symbol}
          className="w-3/4 h-3/4 object-contain"
        />
      </div>
    );
  }
  if (asset.category === "fiat" && asset.flag) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0 font-black text-white"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${asset.color}, ${asset.color}aa)`,
          fontSize: size * 0.4,
        }}
      >
        {asset.symbol.slice(0, 2)}
      </div>
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-black text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${asset.color}, ${asset.color}cc)`,
        fontSize: size * 0.35,
      }}
    >
      {asset.symbol.slice(0, 2)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function WalletSwapPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState<"from" | "to" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [prices, setPrices] = useState<Record<string, number>>({
    PI: PI_GCV,
    BTC: 95000,
    SDA: 1.2,
    USDT: 1,
    USDC: 1,
    DAI: 1,
    BUSD: 1,
    ETH: 3200,
    BNB: 600,
    SOL: 180,
    XRP: 2.5,
    XLM: 0.4,
    TRX: 0.12,
    ADA: 0.65,
    DOGE: 0.15,
    TON: 5.5,
    USD: 1,
    EUR: 0.92,
    XAF: 615,
    XOF: 615,
    CDF: 2800,
    NGN: 1550,
    AED: 3.67,
    MGA: 4500,
  });
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);

  const [balances, setBalances] = useState<Record<string, string>>({});

  const [fromAsset, setFromAsset] = useState<Asset>(ALL_ASSETS[12]); // USDT
  const [toAsset, setToAsset] = useState<Asset>(ALL_ASSETS[18]); // XAF
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(0);
  const [slippage, setSlippage] = useState(1);
  const [editingSlippage, setEditingSlippage] = useState(false);
  const [slippageInput, setSlippageInput] = useState("1");
  const [transactionRef, setTransactionRef] = useState("");
  const [transactionTime, setTransactionTime] = useState<Date | null>(null);

  /* ---------- FETCHERS ---------- */

  const fetchPrices = useCallback(async (showLoading = false) => {
    if (showLoading) setIsPriceLoading(true);
    try {
      const [cryptoRes, fiatRes] = await Promise.all([
        fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,stellar,tron,cardano,dogecoin,the-open-network,tether,usd-coin,dai&vs_currencies=usd",
          { signal: AbortSignal.timeout(8000), cache: "no-store" }
        ),
        fetch("https://open.er-api.com/v6/latest/USD", {
          signal: AbortSignal.timeout(8000), cache: "no-store"
        }),
      ]);

      const cryptoData = await cryptoRes.json();
      const fiatData = await fiatRes.json();

      setPrices((prev) => ({
        ...prev,
        BTC: cryptoData.bitcoin?.usd || prev.BTC,
        ETH: cryptoData.ethereum?.usd || prev.ETH,
        BNB: cryptoData.binancecoin?.usd || prev.BNB,
        SOL: cryptoData.solana?.usd || prev.SOL,
        XRP: cryptoData.ripple?.usd || prev.XRP,
        XLM: cryptoData.stellar?.usd || prev.XLM,
        TRX: cryptoData.tron?.usd || prev.TRX,
        ADA: cryptoData.cardano?.usd || prev.ADA,
        DOGE: cryptoData.dogecoin?.usd || prev.DOGE,
        TON: cryptoData["the-open-network"]?.usd || prev.TON,
        USDT: cryptoData.tether?.usd || 1,
        USDC: cryptoData["usd-coin"]?.usd || 1,
        DAI: cryptoData.dai?.usd || 1,
        // Fiat rates (how many units per 1 USD)
        EUR: fiatData?.rates?.EUR || prev.EUR,
        GBP: fiatData?.rates?.GBP || 0.79,
        XAF: fiatData?.rates?.XAF || prev.XAF,
        XOF: fiatData?.rates?.XOF || prev.XOF,
        CDF: fiatData?.rates?.CDF || prev.CDF,
        NGN: fiatData?.rates?.NGN || prev.NGN,
        AED: fiatData?.rates?.AED || prev.AED,
        MGA: fiatData?.rates?.MGA || prev.MGA,
        CNY: fiatData?.rates?.CNY || 7.24,
        INR: fiatData?.rates?.INR || 83.5,
        JPY: fiatData?.rates?.JPY || 154,
        KRW: fiatData?.rates?.KRW || 1340,
        BRL: fiatData?.rates?.BRL || 4.95,
        GHS: fiatData?.rates?.GHS || 15.5,
        KES: fiatData?.rates?.KES || 129,
        ZAR: fiatData?.rates?.ZAR || 18.5,
      }));
      setLastPriceUpdate(new Date());
      if (showLoading) toast.success("Taux mis a jour!");
    } catch (e) {
      console.warn("Price fetch failed, using cached values");
    } finally {
      setIsPriceLoading(false);
    }
  }, []);

  const loadBalances = useCallback(async () => {
    try {
      const [balRes, profRes] = await Promise.all([
        fetch("/api/wallet/balance"),
        fetch("/api/user/profile", { cache: "no-store" }),
      ]);
      if (balRes.ok) {
        const result = await balRes.json();
        const b: Record<string, string> = {};
        for (const asset of ALL_ASSETS) {
          b[asset.id] = result[asset.id] || "0.00";
        }
        setBalances(b);
      }
      if (profRes.ok) {
        const profData = await profRes.json();
        if (profData.user?.wallets) {
          const wb: Record<string, string> = {};
          for (const w of profData.user.wallets) {
            wb[w.currency] = String(w.balance);
          }
          setBalances((prev) => ({ ...prev, ...wb }));
        }
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchPrices();
    loadBalances();
    
    // Auto-refresh prices every 30 seconds
    const priceInterval = setInterval(() => {
      fetchPrices();
    }, 30000);
    
    return () => clearInterval(priceInterval);
  }, [fetchPrices, loadBalances]);

  /* ---------- CONVERSION LOGIC (USD as pivot) ---------- */

  const getValueInUsd = useCallback(
    (assetId: string, amount: number): number => {
      const isCrypto = CRYPTO_IDS.includes(assetId);
      if (isCrypto) return amount * (prices[assetId] || 0);
      return amount / (prices[assetId] || 1);
    },
    [prices]
  );

  const getAmountFromUsd = useCallback(
    (assetId: string, usdValue: number): number => {
      const isCrypto = CRYPTO_IDS.includes(assetId);
      if (isCrypto) return usdValue / (prices[assetId] || 1);
      return usdValue * (prices[assetId] || 1);
    },
    [prices]
  );

  useEffect(() => {
    const amount = parseFloat(fromAmount);
    if (!isNaN(amount) && amount > 0) {
      const usd = getValueInUsd(fromAsset.id, amount);
      const result = getAmountFromUsd(toAsset.id, usd);
      setToAmount(result);
    } else {
      setToAmount(0);
    }
  }, [fromAmount, fromAsset, toAsset, getValueInUsd, getAmountFromUsd]);

  /* ---------- ACTIONS ---------- */

  const toggleAssets = () => {
    const prevFrom = fromAsset;
    setFromAsset(toAsset);
    setToAsset(prevFrom);
    setFromAmount("");
  };

  const handleRequestConfirm = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0)
      return toast.error("Entrez un montant valide");
    const currentBalance = parseFloat(balances[fromAsset.id] || "0");
    if (parseFloat(fromAmount) > currentBalance)
      return toast.error(`Solde ${fromAsset.symbol} insuffisant`);
    setShowConfirm(true);
  };

  const handleSwapExecute = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/wallet/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(fromAmount),
          fromCurrency: fromAsset.id,
          toCurrency: toAsset.id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setTransactionRef(result.transactionId || `SWAP-${Date.now().toString(36).toUpperCase()}`);
        setTransactionTime(new Date());
        setIsSuccess(true);
        setShowConfirm(false);
        await loadBalances();
        toast.success("Swap effectue avec succes!", {
          description: `${fromAmount} ${fromAsset.symbol} converti en ${formatToAmount()} ${toAsset.symbol}`,
          duration: 5000,
        });
      } else {
        const err = await response.json();
        toast.error(err.error || "Le swap a echoue");
      }
    } catch {
      toast.error("Erreur reseau");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- SELECTOR HELPERS ---------- */

  const handleSelectAsset = (asset: Asset) => {
    if (isSelecting === "from") {
      if (asset.id === toAsset.id) setToAsset(fromAsset);
      setFromAsset(asset);
    } else {
      if (asset.id === fromAsset.id) setFromAsset(toAsset);
      setToAsset(asset);
    }
    setIsSelecting(null);
    setSearchQuery("");
    setFromAmount("");
  };

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return ALL_ASSETS;
    const q = searchQuery.toLowerCase();
    return ALL_ASSETS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.symbol.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const groupedAssets = useMemo(() => {
    const groups: Record<string, Asset[]> = {};
    for (const asset of filteredAssets) {
      if (!groups[asset.category]) groups[asset.category] = [];
      groups[asset.category].push(asset);
    }
    return groups;
  }, [filteredAssets]);

  /* ---------- DISPLAY HELPERS ---------- */

  const formatToAmount = () => {
    if (toAmount <= 0) return "0.00";
    if (["BTC", "PI", "ETH"].includes(toAsset.id)) return toAmount.toFixed(8);
    if (toAmount < 0.01) return toAmount.toFixed(6);
    if (toAsset.category === "fiat") return toAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return toAmount.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const getExchangeRate = () => {
    const usd = getValueInUsd(fromAsset.id, 1);
    const rate = getAmountFromUsd(toAsset.id, usd);
    if (["BTC", "PI", "ETH"].includes(toAsset.id)) return rate.toFixed(8);
    if (rate < 0.001) return rate.toFixed(8);
    if (rate > 1000)
      return rate.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return rate.toFixed(4);
  };

  const getMinimumReceived = () => {
    if (toAmount <= 0) return "0.00";
    const min = toAmount * (1 - slippage / 100);
    if (["BTC", "PI", "ETH"].includes(toAsset.id)) return min.toFixed(8);
    if (min < 0.01) return min.toFixed(6);
    return min.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const NETWORK_FEE = CRYPTO_IDS.includes(fromAsset.id) ? `0.01 ${fromAsset.symbol}` : "0.00";

  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  const selectedId = isSelecting === "from" ? fromAsset.id : toAsset.id;

  /* ---- SUCCESS SCREEN ---- */
  if (isSuccess) {
    const copyRef = () => {
      navigator.clipboard.writeText(transactionRef);
      toast.success("Reference copiee!");
    };

    const NETWORK_FEE = CRYPTO_IDS.includes(fromAsset.id) ? `0.01 ${fromAsset.symbol}` : "0.00";

    return (
      <div className="min-h-screen bg-[#020617] text-white overflow-hidden relative">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.3, scale: 1.2 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px]"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-emerald-500/10 to-transparent"
          />
          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 100, x: Math.random() * 400 - 200 }}
              animate={{ 
                opacity: [0, 1, 0],
                y: -200,
                x: Math.random() * 400 - 200 
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                repeatDelay: Math.random() * 3
              }}
              className="absolute bottom-0 left-1/2 w-2 h-2 bg-emerald-400/60 rounded-full"
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col min-h-screen p-6">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between pt-4 mb-6"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <BadgeCheck size={16} className="text-emerald-400" />
              </div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em]">
                Transaction Confirmee
              </span>
            </div>
            <button 
              onClick={copyRef}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-[9px] font-bold text-slate-400 hover:bg-white/10 transition-all"
            >
              <Copy size={10} /> Copier Ref
            </button>
          </motion.div>

          {/* Success Icon */}
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-emerald-500/30 rounded-full blur-2xl"
              />
              <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                >
                  <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
                </motion.div>
              </div>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="absolute -right-1 -top-1 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <Sparkles size={14} className="text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
              Swap <span className="text-emerald-400">Reussi</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Vos fonds ont ete convertis avec succes au taux PimPay
            </p>
          </motion.div>

          {/* Main Transaction Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/10 rounded-[2rem] p-5 mb-4 backdrop-blur-xl"
          >
            {/* From/To */}
            <div className="flex items-center justify-between mb-6 gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Vendu</p>
                <div className="flex items-center gap-2">
                  <AssetIcon asset={fromAsset} size={36} />
                  <div className="min-w-0">
                    <p className="text-lg font-black truncate">{fromAmount}</p>
                    <p className="text-xs text-slate-400 font-bold">{fromAsset.symbol}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center shrink-0">
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-9 h-9 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20"
                >
                  <ArrowRight size={16} className="text-emerald-400" />
                </motion.div>
              </div>

              <div className="flex-1 min-w-0 text-right">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Recu</p>
                <div className="flex items-center gap-2 justify-end">
                  <div className="min-w-0">
                    <p className="text-lg font-black text-emerald-400 truncate">{formatToAmount()}</p>
                    <p className="text-xs text-slate-400 font-bold">{toAsset.symbol}</p>
                  </div>
                  <AssetIcon asset={toAsset} size={36} />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={10} className="text-blue-400" />
                  <p className="text-[8px] font-black text-slate-500 uppercase">Taux</p>
                </div>
                <p className="text-xs font-bold text-white">1 {fromAsset.symbol} = {getExchangeRate()} {toAsset.symbol}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Banknote size={10} className="text-amber-400" />
                  <p className="text-[8px] font-black text-slate-500 uppercase">Frais</p>
                </div>
                <p className="text-xs font-bold text-white">{NETWORK_FEE || "0.00"}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock size={10} className="text-purple-400" />
                  <p className="text-[8px] font-black text-slate-500 uppercase">Date & Heure</p>
                </div>
                <p className="text-xs font-bold text-white">
                  {transactionTime?.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-[10px] text-slate-400">
                  {transactionTime?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield size={10} className="text-emerald-400" />
                  <p className="text-[8px] font-black text-slate-500 uppercase">Statut</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-xs font-bold text-emerald-400">Confirme</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Transaction Reference */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Reference Transaction</p>
                <p className="text-xs font-mono font-bold text-white">{transactionRef}</p>
              </div>
              <button 
                onClick={copyRef}
                className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all"
              >
                <Copy size={14} className="text-slate-400" />
              </button>
            </div>
          </motion.div>

          {/* Network Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-4 mb-8"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: fromAsset.color }} />
              <span className="text-[9px] font-bold text-slate-400">{fromAsset.network || "PimPay"}</span>
            </div>
            <ArrowRight size={12} className="text-slate-600" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: toAsset.color }} />
              <span className="text-[9px] font-bold text-slate-400">{toAsset.network || "PimPay"}</span>
            </div>
          </motion.div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-3 pb-4"
          >
            {/* Secondary Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setFromAmount("");
                  setToAmount(0);
                }}
                className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
              >
                <RotateCcw size={14} /> Nouveau Swap
              </button>
              <button
                onClick={() => {
                  const shareText = `J'ai converti ${fromAmount} ${fromAsset.symbol} en ${formatToAmount()} ${toAsset.symbol} sur PimPay!`;
                  if (navigator.share) {
                    navigator.share({ text: shareText });
                  } else {
                    navigator.clipboard.writeText(shareText);
                    toast.success("Copie dans le presse-papier!");
                  }
                }}
                className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <Share2 size={18} />
              </button>
            </div>

            {/* Primary Action */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/wallet")}
              className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20"
            >
              Retour au Wallet <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ---- MAIN UI ---- */
  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-10 pb-6 sticky top-0 bg-[#020617]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-black uppercase tracking-tight">
              M<span className="text-blue-500">SWAP</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isPriceLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {isPriceLoading ? "Mise a jour..." : "Taux en direct"}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            fetchPrices(true);
            loadBalances();
          }}
          disabled={isPriceLoading}
          className={`w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 ${isPriceLoading ? "opacity-50" : ""}`}
        >
          <RefreshCw size={16} className={isPriceLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="px-6">
        {/* Swap Card */}
        <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-2xl relative">
          {/* FROM */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 px-2">
              <span>Vendre</span>
              <span className="text-blue-400 font-bold">
                {"Solde: "}
                {parseFloat(balances[fromAsset.id] || "0").toLocaleString(
                  undefined,
                  { maximumFractionDigits: 6 }
                )}{" "}
                {fromAsset.symbol}
              </span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between focus-within:border-blue-500/50 transition-colors">
              <input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="bg-transparent text-2xl font-black outline-none w-1/2 placeholder:text-slate-700"
              />
              <button
                onClick={() => setIsSelecting("from")}
                className="flex items-center gap-2.5 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10 active:scale-95 transition-all"
              >
                <AssetIcon asset={fromAsset} size={32} />
                <span className="font-black text-sm">{fromAsset.symbol}</span>
                <ChevronDown size={16} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex justify-center -my-7 relative z-10">
            <button
              onClick={toggleAssets}
              className="bg-blue-600 p-3 rounded-full border-8 border-[#020617] shadow-xl active:rotate-180 transition-all duration-500 hover:bg-blue-500"
            >
              <ArrowDown size={20} />
            </button>
          </div>

          {/* TO */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 px-2">
              <span>Recevoir</span>
              <span className="text-slate-500">
                {"Solde: "}
                {parseFloat(balances[toAsset.id] || "0").toLocaleString(
                  undefined,
                  { maximumFractionDigits: 6 }
                )}
              </span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between">
              <div className="text-2xl font-black truncate w-1/2 text-slate-300">
                {formatToAmount()}
              </div>
              <button
                onClick={() => setIsSelecting("to")}
                className="flex items-center gap-2.5 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10 active:scale-95 transition-all"
              >
                <AssetIcon asset={toAsset} size={32} />
                <span className="font-black text-sm">{toAsset.symbol}</span>
                <ChevronDown size={16} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Swap Details Panel */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-3">
            {/* Rate */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Rate</span>
              <span className="text-sm font-semibold text-white">
                {"1 "}{fromAsset.symbol}{" = "}{getExchangeRate()}{" "}{toAsset.symbol}
              </span>
            </div>
            {/* Network fee */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Network fee</span>
              <span className="text-sm font-semibold text-white">{NETWORK_FEE}</span>
            </div>
            {/* Slippage */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Slippage</span>
              {editingSlippage ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    value={slippageInput}
                    onChange={(e) => setSlippageInput(e.target.value)}
                    onBlur={() => {
                      const val = parseFloat(slippageInput);
                      if (!isNaN(val) && val > 0 && val <= 50) setSlippage(val);
                      else setSlippageInput(String(slippage));
                      setEditingSlippage(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseFloat(slippageInput);
                        if (!isNaN(val) && val > 0 && val <= 50) setSlippage(val);
                        else setSlippageInput(String(slippage));
                        setEditingSlippage(false);
                      }
                    }}
                    className="w-16 bg-white/10 border border-blue-500/40 rounded-lg px-2 py-1 text-sm font-semibold text-white text-right outline-none"
                    autoFocus
                  />
                  <span className="text-sm font-semibold text-white">%</span>
                </div>
              ) : (
                <button
                  onClick={() => { setSlippageInput(String(slippage)); setEditingSlippage(true); }}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white"
                >
                  {slippage}%
                  <Pencil size={12} className="text-slate-400" />
                </button>
              )}
            </div>
            {/* Minimum received */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Minimum received</span>
              <span className="text-sm font-semibold text-white">
                {getMinimumReceived()}{" "}{toAsset.symbol}
              </span>
            </div>
            {/* Divider */}
            <div className="h-px bg-white/5" />
            {/* Pool fee note */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="text-xs text-slate-500">May include 0.3% pool fee</span>
              <Info size={13} className="text-slate-500" />
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleRequestConfirm}
            disabled={loading || !fromAmount || parseFloat(fromAmount) <= 0}
            className="w-full bg-blue-600 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
          >
            <Zap size={18} fill="currentColor" className="text-yellow-400" />
            {"Echanger maintenant"}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-col items-center opacity-30">
          <div className="flex items-center gap-2">
            <AlertCircle size={12} />
            <span className="text-[8px] font-black uppercase tracking-widest text-center leading-relaxed">
              {"Securise par PimPay Ledger Technology"}
            </span>
          </div>
        </div>
      </div>

      {/* ASSET SELECTOR MODAL */}
      {isSelecting && (
        <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="px-6 pt-10 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tighter">
                  Selectionner
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {isSelecting === "from"
                    ? "Actif a vendre"
                    : "Actif a recevoir"}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsSelecting(null);
                  setSearchQuery("");
                }}
                className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                placeholder="Rechercher un actif ou une devise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none placeholder:text-slate-600 focus:border-blue-500/50 transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-10">
            {CATEGORY_ORDER.map((category) => {
              const assets = groupedAssets[category];
              if (!assets || assets.length === 0) return null;
              return (
                <div key={category} className="mb-6">
                  <div className="flex items-center gap-2 mb-3 ml-1">
                    <div
                      className="w-1 h-1 rounded-full"
                      style={{
                        backgroundColor:
                          category === "fiat"
                            ? "#22c55e"
                            : category === "stablecoin"
                              ? "#26a17b"
                              : "#3b82f6",
                      }}
                    />
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                      {CATEGORY_LABELS[category] || category}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {assets.map((asset) => {
                      const isSelected = asset.id === selectedId;
                      const balance = balances[asset.id] || "0.00";
                      const balNum = parseFloat(balance);

                      return (
                        <button
                          key={asset.id}
                          onClick={() => handleSelectAsset(asset)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.98] ${
                            isSelected
                              ? "bg-blue-500/10 border border-blue-500/20"
                              : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <AssetIcon asset={asset} size={44} />
                            <div className="text-left">
                              <p className="font-bold text-sm" style={{ color: asset.color }}>
                                {asset.symbol}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {balNum > 0
                                  ? balNum.toLocaleString(undefined, {
                                      maximumFractionDigits: 6,
                                    })
                                  : "0,00"}{" "}
                                {asset.symbol}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {asset.network && (
                              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-2 py-1 rounded-md">
                                {asset.network}
                              </span>
                            )}
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                <Check size={14} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredAssets.length === 0 && (
              <div className="text-center py-16">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  {"Aucun actif correspondant"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION SCREEN */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-[#020617] overflow-hidden"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.2 }}
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/30 rounded-full blur-[100px]"
              />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen p-6">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 pt-4 mb-6"
              >
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight">
                    Resume du <span className="text-blue-500">Swap</span>
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Verifiez les details avant confirmation
                  </p>
                </div>
              </motion.div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col justify-center space-y-5">
                {/* Swap Animation Icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring" }}
                  className="flex justify-center mb-2"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: loading ? 360 : 0 }}
                      transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
                      className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/30"
                    >
                      <RefreshCw size={28} className="text-blue-400" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Transaction Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/10 rounded-[2rem] p-5 backdrop-blur-xl"
                >
                  {/* From/To Display */}
                  <div className="flex items-center justify-between mb-5 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Vous vendez</p>
                      <div className="flex items-center gap-2">
                        <AssetIcon asset={fromAsset} size={40} />
                        <div className="min-w-0">
                          <p className="text-xl font-black text-white truncate">{fromAmount}</p>
                          <p className="text-xs text-slate-400 font-bold">{fromAsset.symbol}</p>
                        </div>
                      </div>
                    </div>
                    
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-10 h-10 shrink-0 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20"
                    >
                      <ArrowRight size={16} className="text-blue-400" />
                    </motion.div>

                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Vous recevez</p>
                      <div className="flex items-center gap-2 justify-end">
                        <div className="min-w-0">
                          <p className="text-xl font-black text-blue-400 truncate">{formatToAmount()}</p>
                          <p className="text-xs text-slate-400 font-bold">{toAsset.symbol}</p>
                        </div>
                        <AssetIcon asset={toAsset} size={40} />
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

                  {/* Details */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={12} className="text-blue-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Taux de change</span>
                      </div>
                      <span className="text-xs font-black text-white">
                        1 {fromAsset.symbol} = {getExchangeRate()} {toAsset.symbol}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Banknote size={12} className="text-amber-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Frais reseau</span>
                      </div>
                      <span className="text-xs font-black text-white">{NETWORK_FEE}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Zap size={12} className="text-purple-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Slippage</span>
                      </div>
                      <span className="text-xs font-black text-white">{slippage}%</span>
                    </div>

                    <div className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Shield size={12} className="text-emerald-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Minimum recu</span>
                      </div>
                      <span className="text-xs font-black text-emerald-400">{getMinimumReceived()} {toAsset.symbol}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Network Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-4"
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: fromAsset.color }} />
                    <span className="text-[9px] font-bold text-slate-400">{fromAsset.network || "PimPay"}</span>
                  </div>
                  <ArrowRight size={12} className="text-slate-600" />
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: toAsset.color }} />
                    <span className="text-[9px] font-bold text-slate-400">{toAsset.network || "PimPay"}</span>
                  </div>
                </motion.div>

                {/* Warning */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl"
                >
                  <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                  <div>
                    <p className="text-[10px] font-black text-amber-400 uppercase mb-1">Attention</p>
                    <p className="text-[9px] text-amber-200/60 leading-relaxed font-medium">
                      Cette operation de conversion est irreversible. Assurez-vous que les details sont corrects avant de confirmer.
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3 pb-4"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSwapExecute}
                  disabled={loading}
                  className="w-full py-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Traitement en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Confirmer le Swap</span>
                    </>
                  )}
                </motion.button>

                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  <X size={14} /> Annuler
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
