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
  Clock,
  Pencil,
  Info,
  Copy,
  Sparkles,
  BadgeCheck,
  Share2,
  RotateCcw,
  Shield,
  Banknote,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  TYPES & DATA                                                        */
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
  { id: "PI",   name: "Pi Network",        symbol: "PI",   color: "#7c3aed", category: "native",     logo: "/pi.png",   network: "Pi / Stellar" },
  { id: "SDA",  name: "Sidra Assets",      symbol: "SDA",  color: "#d97706", category: "native",     logo: "/sda.png",  network: "Sidra / EVM" },
  { id: "BTC",  name: "Bitcoin",           symbol: "BTC",  color: "#f7931a", category: "major",      logo: "/btc.png",  network: "Bitcoin" },
  { id: "ETH",  name: "Ethereum",          symbol: "ETH",  color: "#627eea", category: "major",      logo: "/eth.png",  network: "EVM" },
  { id: "BNB",  name: "BNB",              symbol: "BNB",  color: "#f3ba2f", category: "major",      logo: "/bnb.png",  network: "BSC / EVM" },
  { id: "SOL",  name: "Solana",            symbol: "SOL",  color: "#9945ff", category: "major",      logo: "/sol.png",  network: "Solana" },
  { id: "XRP",  name: "Ripple",            symbol: "XRP",  color: "#23292f", category: "major",      logo: "/xrp.png",  network: "XRP Ledger" },
  { id: "XLM",  name: "Stellar",           symbol: "XLM",  color: "#14b8a6", category: "major",      logo: "/xlm.png",  network: "Stellar" },
  { id: "TRX",  name: "Tron",             symbol: "TRX",  color: "#eb0029", category: "major",      logo: "/trx.png",  network: "TRON" },
  { id: "ADA",  name: "Cardano",           symbol: "ADA",  color: "#0033ad", category: "major",      logo: "/ada.png",  network: "Cardano" },
  { id: "DOGE", name: "Dogecoin",          symbol: "DOGE", color: "#c2a633", category: "major",      logo: "/doge.png", network: "Dogecoin" },
  { id: "TON",  name: "Toncoin",           symbol: "TON",  color: "#0098ea", category: "major",      logo: "/ton.png",  network: "TON" },
  { id: "USDT", name: "Tether",            symbol: "USDT", color: "#26a17b", category: "stablecoin", logo: "/usdt.png", network: "USDT TRC20" },
  { id: "USDC", name: "USD Coin",          symbol: "USDC", color: "#2775ca", category: "stablecoin", logo: "/usdc.png", network: "EVM" },
  { id: "DAI",  name: "Dai",              symbol: "DAI",  color: "#f5ac37", category: "stablecoin", logo: "/dai.png",  network: "EVM" },
  { id: "BUSD", name: "Binance USD",       symbol: "BUSD", color: "#f0b90b", category: "stablecoin", logo: "/busd.png", network: "EVM" },
  { id: "USD",  name: "Dollar US",         symbol: "USD",  color: "#22c55e", category: "fiat",       flag: "US",        network: "PimPay" },
  { id: "EUR",  name: "Euro",             symbol: "EUR",  color: "#3b82f6", category: "fiat",       flag: "EU",        network: "PimPay" },
  { id: "XAF",  name: "Franc CFA (BEAC)", symbol: "XAF",  color: "#0ea5e9", category: "fiat",       flag: "CM",        network: "PimPay" },
  { id: "XOF",  name: "Franc CFA (BCEAO)",symbol: "XOF",  color: "#06b6d4", category: "fiat",       flag: "SN",        network: "PimPay" },
  { id: "CDF",  name: "Franc Congolais",   symbol: "CDF",  color: "#0284c7", category: "fiat",       flag: "CD",        network: "PimPay" },
  { id: "NGN",  name: "Naira Nigerian",    symbol: "NGN",  color: "#16a34a", category: "fiat",       flag: "NG",        network: "PimPay" },
  { id: "AED",  name: "Dirham Emirats",    symbol: "AED",  color: "#dc2626", category: "fiat",       flag: "AE",        network: "PimPay" },
  { id: "MGA",  name: "Ariary Malgache",   symbol: "MGA",  color: "#059669", category: "fiat",       flag: "MG",        network: "PimPay" },
];

const CATEGORY_LABELS: Record<string, string> = {
  native: "Ecosysteme",
  major: "Principales",
  stablecoin: "Stablecoins",
  fiat: "Devises Fiat",
};
const CATEGORY_ORDER = ["native", "major", "stablecoin", "fiat"];

const CRYPTO_IDS = [
  "PI","SDA","BTC","ETH","BNB","SOL","XRP","XLM",
  "TRX","ADA","DOGE","TON","USDT","USDC","DAI","BUSD",
];

// Paires supportées par Sun.io (DEX TRON). Toute paire contenant un de ces tokens
// et avec l'autre aussi dans cette liste sera routée vers Sun.io.
const SUNIO_TOKENS = new Set(["TRX", "USDT", "USDC", "USDD", "SUN", "JST", "BTT", "WIN", "NFT", "WTRX"]);

function isSunioSwap(from: string, to: string): boolean {
  return SUNIO_TOKENS.has(from) && SUNIO_TOKENS.has(to) && from !== to;
}

/* ------------------------------------------------------------------ */
/*  ICON COMPONENT                                                      */
/* ------------------------------------------------------------------ */

function AssetIcon({ asset, size = 40 }: { asset: Asset; size?: number }) {
  if (asset.logo) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0 overflow-hidden"
        style={{ width: size, height: size, background: `${asset.color}22`, border: `1px solid ${asset.color}33` }}
      >
        <img src={asset.logo} alt={asset.symbol} className="w-3/4 h-3/4 object-contain" />
      </div>
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-black text-white"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${asset.color}, ${asset.color}cc)`, fontSize: size * 0.35 }}
    >
      {asset.symbol.slice(0, 2)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */

export default function SwapPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState<"from" | "to" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Prix ──────────────────────────────────────────────────────────────
  const [prices, setPrices] = useState<Record<string, number>>({
    PI: 0, BTC: 95000, SDA: 1.2, USDT: 1, USDC: 1, DAI: 1, BUSD: 1,
    ETH: 3200, BNB: 600, SOL: 180, XRP: 2.5, XLM: 0.4,
    TRX: 0.12, ADA: 0.65, DOGE: 0.15, TON: 5.5,
    USD: 1, EUR: 0.92, XAF: 615, XOF: 615, CDF: 2800,
    NGN: 1550, AED: 3.67, MGA: 4500,
  });
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});

  // ── Swap state ────────────────────────────────────────────────────────
  const [fromAsset, setFromAsset] = useState<Asset>(ALL_ASSETS[12]); // USDT
  const [toAsset, setToAsset] = useState<Asset>(ALL_ASSETS[8]);       // TRX
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(0);
  const [slippage, setSlippage] = useState(1);
  const [editingSlippage, setEditingSlippage] = useState(false);
  const [slippageInput, setSlippageInput] = useState("1");

  // ── Résultat swap ─────────────────────────────────────────────────────
  const [transactionRef, setTransactionRef] = useState("");
  const [transactionTime, setTransactionTime] = useState<Date | null>(null);
  const [swapTxHash, setSwapTxHash] = useState<string | null>(null);

  // ── Quote Sun.io (pour les paires TRON) ──────────────────────────────
  const [sunioQuote, setSunioQuote] = useState<{
    amountOut: string; minAmountOut: string; priceImpact: string; route: string[];
  } | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);

  /* ---------- FETCHERS ---------- */

  const fetchPrices = useCallback(async (showLoading = false) => {
    if (showLoading) setIsPriceLoading(true);
    try {
      const piRes = await fetch("/api/pi-price", { cache: "no-store" });
      if (piRes.ok) {
        const piData = await piRes.json();
        if (piData.success && piData.price > 0) setPrices((prev) => ({ ...prev, PI: piData.price }));
      }
      const cryptoRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,stellar,tron,cardano,dogecoin,the-open-network,tether,usd-coin,dai&vs_currencies=usd",
        { signal: AbortSignal.timeout(8000), cache: "no-store" }
      );
      const cryptoData = await cryptoRes.json();
      const fiatRes = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(8000), cache: "no-store" });
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
        EUR: fiatData?.rates?.EUR || prev.EUR,
        XAF: fiatData?.rates?.XAF || prev.XAF,
        XOF: fiatData?.rates?.XOF || prev.XOF,
        CDF: fiatData?.rates?.CDF || prev.CDF,
        NGN: fiatData?.rates?.NGN || prev.NGN,
        AED: fiatData?.rates?.AED || prev.AED,
        MGA: fiatData?.rates?.MGA || prev.MGA,
      }));
      setLastPriceUpdate(new Date());
      if (showLoading) toast.success("Taux mis a jour!");
    } catch {
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
        for (const asset of ALL_ASSETS) b[asset.id] = result[asset.id] || "0.00";
        setBalances(b);
      }
      if (profRes.ok) {
        const profData = await profRes.json();
        if (profData.user?.wallets) {
          const wb: Record<string, string> = {};
          for (const w of profData.user.wallets) wb[w.currency] = String(w.balance);
          setBalances((prev) => ({ ...prev, ...wb }));
        }
      }
    } catch { /* silently fail */ }
  }, []);

  // ── Quote Sun.io : appel automatique quand paire TRON + montant valide ──
  const fetchSunioQuote = useCallback(async (from: string, to: string, amount: number, slip: number) => {
    if (!isSunioSwap(from, to) || !amount || amount <= 0) {
      setSunioQuote(null);
      return;
    }
    setIsQuoteLoading(true);
    try {
      const slippageBps = Math.round(slip * 100); // % → bps
      const res = await fetch(
        `/api/swap/sunio?from=${from}&to=${to}&amount=${amount}&slippage=${slippageBps}`,
        { signal: AbortSignal.timeout(10_000) }
      );
      if (!res.ok) { setSunioQuote(null); return; }
      const data = await res.json();
      if (data.success && data.quote) {
        setSunioQuote(data.quote);
        setToAmount(parseFloat(data.quote.amountOut));
      }
    } catch {
      setSunioQuote(null);
    } finally {
      setIsQuoteLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchPrices();
    loadBalances();
    const interval = setInterval(() => fetchPrices(), 30000);
    return () => clearInterval(interval);
  }, [fetchPrices, loadBalances]);

  /* ---------- CONVERSION LOGIC ---------- */

  const getValueInUsd = useCallback(
    (assetId: string, amount: number) =>
      CRYPTO_IDS.includes(assetId) ? amount * (prices[assetId] || 0) : amount / (prices[assetId] || 1),
    [prices]
  );

  const getAmountFromUsd = useCallback(
    (assetId: string, usdValue: number) =>
      CRYPTO_IDS.includes(assetId) ? usdValue / (prices[assetId] || 1) : usdValue * (prices[assetId] || 1),
    [prices]
  );

  // Quand le montant ou les assets changent, on recalcule le toAmount
  useEffect(() => {
    const amount = parseFloat(fromAmount);
    if (isNaN(amount) || amount <= 0) {
      setToAmount(0);
      setSunioQuote(null);
      return;
    }

    // Pour les paires TRON → on déclenche le quote Sun.io (asynchrone)
    if (isSunioSwap(fromAsset.id, toAsset.id)) {
      // Afficher une estimation locale immédiate pendant le chargement du quote
      const usd = getValueInUsd(fromAsset.id, amount);
      setToAmount(getAmountFromUsd(toAsset.id, usd));
      // Puis on remplace par le vrai quote Sun.io
      const debounce = setTimeout(() => {
        fetchSunioQuote(fromAsset.id, toAsset.id, amount, slippage);
      }, 600);
      return () => clearTimeout(debounce);
    }

    // Pour les autres paires → calcul par prix CoinGecko
    const usd = getValueInUsd(fromAsset.id, amount);
    setToAmount(getAmountFromUsd(toAsset.id, usd));
    setSunioQuote(null);
  }, [fromAmount, fromAsset, toAsset, slippage, getValueInUsd, getAmountFromUsd, fetchSunioQuote]);

  /* ---------- ACTIONS ---------- */

  const toggleAssets = () => {
    const prev = fromAsset;
    setFromAsset(toAsset);
    setToAsset(prev);
    setFromAmount("");
    setSunioQuote(null);
  };

  const handleRequestConfirm = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return toast.error("Entrez un montant valide");
    if (parseFloat(fromAmount) > parseFloat(balances[fromAsset.id] || "0"))
      return toast.error(`Solde ${fromAsset.symbol} insuffisant`);
    setShowConfirm(true);
  };

  // ── Exécution du swap ─────────────────────────────────────────────────
  const handleSwapExecute = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const amount = parseFloat(fromAmount);
      const useSunio = isSunioSwap(fromAsset.id, toAsset.id);

      // ── Route 1 : Sun.io (paires TRON on-chain) ──────────────────────
      if (useSunio) {
        const slippageBps = Math.round(slippage * 100);
        const res = await fetch("/api/swap/sunio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromToken: fromAsset.id,
            toToken: toAsset.id,
            amount,
            slippage: slippageBps,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Swap Sun.io échoué");
          setLoading(false);
          return;
        }

        setTransactionRef(data.reference || `SWAP-${Date.now().toString(36).toUpperCase()}`);
        setTransactionTime(new Date());
        setSwapTxHash(data.txHash || null);
        // Met à jour le toAmount avec le vrai montant reçu
        if (data.amountOut) setToAmount(data.amountOut);
        setIsSuccess(true);
        setShowConfirm(false);
        loadBalances(); // rafraîchir les soldes
        toast.success("Swap Sun.io réussi !", {
          description: `${fromAmount} ${fromAsset.symbol} → ${data.amountOut?.toFixed(6) || formatToAmount()} ${toAsset.symbol}`,
          duration: 5000,
        });
        return;
      }

      // ── Route 2 : Swap interne PimPay (paires non-TRON) ──────────────
      const quoteRes = await fetch("/api/transaction/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          sourceCurrency: fromAsset.id,
          targetCurrency: toAsset.id,
          estimatedOut: toAmount,
        }),
      });

      if (!quoteRes.ok) {
        const err = await quoteRes.json();
        toast.error(err.error || "Erreur lors du calcul");
        setLoading(false);
        return;
      }

      const quoteData = await quoteRes.json();

      const confirmRes = await fetch("/api/transaction/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quoteData.quoteId }),
      });

      if (confirmRes.ok) {
        const result = await confirmRes.json();
        setTransactionRef(result.transactionId || `SWAP-${Date.now().toString(36).toUpperCase()}`);
        setTransactionTime(new Date());
        setSwapTxHash(null);
        setIsSuccess(true);
        setShowConfirm(false);
        loadBalances();
        toast.success("Swap effectue avec succes!", {
          description: `${fromAmount} ${fromAsset.symbol} converti en ${formatToAmount()} ${toAsset.symbol}`,
          duration: 5000,
        });
      } else {
        const err = await confirmRes.json();
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
    setSunioQuote(null);
  };

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return ALL_ASSETS;
    const q = searchQuery.toLowerCase();
    return ALL_ASSETS.filter((a) =>
      a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
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
    if (rate > 1000) return rate.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return rate.toFixed(4);
  };

  const getMinimumReceived = () => {
    // Pour Sun.io : on utilise le minAmountOut du quote
    if (sunioQuote) return parseFloat(sunioQuote.minAmountOut).toFixed(6);
    if (toAmount <= 0) return "0.00";
    const min = toAmount * (1 - slippage / 100);
    if (["BTC", "PI", "ETH"].includes(toAsset.id)) return min.toFixed(8);
    if (min < 0.01) return min.toFixed(6);
    return min.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const NETWORK_FEE = CRYPTO_IDS.includes(fromAsset.id) ? `0.01 ${fromAsset.symbol}` : "0.00";

  // Label de la source de prix
  const priceSource = isSunioSwap(fromAsset.id, toAsset.id) ? "Sun.io (SunSwap)" : "CoinGecko & ExchangeRate-API";

  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  const selectedId = isSelecting === "from" ? fromAsset.id : toAsset.id;

  /* ---- SUCCESS SCREEN ---- */
  if (isSuccess) {
    const copyRef = () => { navigator.clipboard.writeText(transactionRef); toast.success("Reference copiee!"); };

    return (
      <div className="min-h-screen bg-[#020617] text-white overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 0.3, scale: 1.2 }} transition={{ duration: 1.5 }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px]" />
          {[...Array(20)].map((_, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 100, x: Math.random() * 400 - 200 }}
              animate={{ opacity: [0, 1, 0], y: -200, x: Math.random() * 400 - 200 }}
              transition={{ duration: 3 + Math.random() * 2, delay: Math.random() * 2, repeat: Infinity, repeatDelay: Math.random() * 3 }}
              className="absolute bottom-0 left-1/2 w-2 h-2 bg-emerald-400/60 rounded-full"
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col min-h-screen p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between pt-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <BadgeCheck size={16} className="text-emerald-400" />
              </div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em]">Transaction Confirmee</span>
            </div>
            <button onClick={copyRef} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-[9px] font-bold text-slate-400 hover:bg-white/10 transition-all">
              <Copy size={10} /> Copier Ref
            </button>
          </motion.div>

          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-emerald-500/30 rounded-full blur-2xl" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
              </div>
              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.7 }}
                className="absolute -right-1 -top-1 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles size={14} className="text-white" />
              </motion.div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center mb-8">
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
              Swap <span className="text-emerald-400">Reussi</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Vos fonds ont ete convertis avec succes</p>
            {swapTxHash && (
              <p className="text-[10px] text-emerald-400/70 mt-1 font-mono">
                via Sun.io · TRON
              </p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/10 rounded-[2rem] p-5 mb-4 backdrop-blur-xl"
          >
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
              <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-9 h-9 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shrink-0">
                <ArrowRight size={16} className="text-emerald-400" />
              </motion.div>
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

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={10} className="text-blue-400" /><p className="text-[8px] font-black text-slate-500 uppercase">Taux</p></div>
                <p className="text-xs font-bold text-white">1 {fromAsset.symbol} = {getExchangeRate()} {toAsset.symbol}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><Banknote size={10} className="text-amber-400" /><p className="text-[8px] font-black text-slate-500 uppercase">Frais</p></div>
                <p className="text-xs font-bold text-white">{NETWORK_FEE || "0.00"}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><Clock size={10} className="text-purple-400" /><p className="text-[8px] font-black text-slate-500 uppercase">Date</p></div>
                <p className="text-xs font-bold text-white">{transactionTime?.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                <p className="text-[10px] text-slate-400">{transactionTime?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><Shield size={10} className="text-emerald-400" /><p className="text-[8px] font-black text-slate-500 uppercase">Statut</p></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-xs font-bold text-emerald-400">Confirme</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Référence + hash blockchain */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Reference PimPay</p>
                <p className="text-xs font-mono font-bold text-white">{transactionRef}</p>
              </div>
              <button onClick={copyRef} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all">
                <Copy size={14} className="text-slate-400" />
              </button>
            </div>
            {swapTxHash && (
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Hash TRON (Sun.io)</p>
                <a
                  href={`https://tronscan.org/#/transaction/${swapTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {swapTxHash.substring(0, 20)}...
                  <ExternalLink size={10} />
                </a>
              </div>
            )}
          </motion.div>

          <div className="flex-1" />

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="space-y-3 pb-4">
            <div className="flex gap-3">
              <button onClick={() => { setIsSuccess(false); setFromAmount(""); setToAmount(0); setSunioQuote(null); setSwapTxHash(null); }}
                className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                <RotateCcw size={14} /> Nouveau Swap
              </button>
              <button onClick={() => {
                const text = `J'ai converti ${fromAmount} ${fromAsset.symbol} en ${formatToAmount()} ${toAsset.symbol} sur PimPay!`;
                if (navigator.share) navigator.share({ text }); else { navigator.clipboard.writeText(text); toast.success("Copie!"); }
              }} className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all">
                <Share2 size={18} />
              </button>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/dashboard")}
              className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20">
              Retour au Dashboard <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ---- MAIN UI ---- */
  const sunioActive = isSunioSwap(fromAsset.id, toAsset.id);

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-10 pb-6 sticky top-0 bg-[#020617]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-black uppercase tracking-tight">M<span className="text-blue-500">SWAP</span></h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isPriceLoading || isQuoteLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {isPriceLoading || isQuoteLoading ? "Mise a jour..." : "Taux en direct"}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => { fetchPrices(true); loadBalances(); }} disabled={isPriceLoading}
          className={`w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 ${isPriceLoading ? "opacity-50" : ""}`}>
          <RefreshCw size={16} className={isPriceLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="px-6">
        {/* Badge Sun.io si la paire est routée via Sun.io */}
        {sunioActive && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
              Routé via Sun.io · SunSwap TRON
            </span>
            {sunioQuote && (
              <span className="text-[9px] text-emerald-400/60 ml-2">
                Impact: {parseFloat(sunioQuote.priceImpact || "0").toFixed(2)}%
              </span>
            )}
          </motion.div>
        )}

        {/* Swap Card */}
        <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-2xl relative">
          {/* FROM */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 px-2">
              <span>Vendre</span>
              <span className="text-blue-400 font-bold">
                Solde: {parseFloat(balances[fromAsset.id] || "0").toLocaleString(undefined, { maximumFractionDigits: 6 })} {fromAsset.symbol}
              </span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between focus-within:border-blue-500/50 transition-colors">
              <input type="number" placeholder="0.0" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)}
                className="bg-transparent text-2xl font-black outline-none w-1/2 placeholder:text-slate-700" />
              <button onClick={() => setIsSelecting("from")}
                className="flex items-center gap-2.5 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10 active:scale-95 transition-all">
                <AssetIcon asset={fromAsset} size={32} />
                <span className="font-black text-sm">{fromAsset.symbol}</span>
                <ChevronDown size={16} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex justify-center -my-7 relative z-10">
            <button onClick={toggleAssets}
              className="bg-blue-600 p-3 rounded-full border-8 border-[#020617] shadow-xl active:rotate-180 transition-all duration-500 hover:bg-blue-500">
              <ArrowDown size={20} />
            </button>
          </div>

          {/* TO */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 px-2">
              <span>Recevoir</span>
              <span className="text-slate-500">Solde: {parseFloat(balances[toAsset.id] || "0").toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 w-1/2">
                {isQuoteLoading ? (
                  <Loader2 size={20} className="text-slate-500 animate-spin" />
                ) : (
                  <div className="text-2xl font-black truncate text-slate-300">{formatToAmount()}</div>
                )}
              </div>
              <button onClick={() => setIsSelecting("to")}
                className="flex items-center gap-2.5 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10 active:scale-95 transition-all">
                <AssetIcon asset={toAsset} size={32} />
                <span className="font-black text-sm">{toAsset.symbol}</span>
                <ChevronDown size={16} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Swap Details Panel */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Rate</span>
              <span className="text-sm font-semibold text-white">1 {fromAsset.symbol} = {getExchangeRate()} {toAsset.symbol}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Network fee</span>
              <span className="text-sm font-semibold text-white">{NETWORK_FEE}</span>
            </div>
            {sunioActive && sunioQuote && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Price Impact</span>
                <span className={`text-sm font-semibold ${parseFloat(sunioQuote.priceImpact) > 2 ? "text-red-400" : "text-emerald-400"}`}>
                  {parseFloat(sunioQuote.priceImpact).toFixed(2)}%
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Slippage</span>
              {editingSlippage ? (
                <div className="flex items-center gap-2">
                  <input type="number" min="0.1" max="50" step="0.1" value={slippageInput}
                    onChange={(e) => setSlippageInput(e.target.value)}
                    onBlur={() => { const v = parseFloat(slippageInput); if (!isNaN(v) && v > 0 && v <= 50) setSlippage(v); else setSlippageInput(String(slippage)); setEditingSlippage(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { const v = parseFloat(slippageInput); if (!isNaN(v) && v > 0 && v <= 50) setSlippage(v); else setSlippageInput(String(slippage)); setEditingSlippage(false); } }}
                    className="w-16 bg-white/10 border border-blue-500/40 rounded-lg px-2 py-1 text-sm font-semibold text-white text-right outline-none" autoFocus />
                  <span className="text-sm font-semibold text-white">%</span>
                </div>
              ) : (
                <button onClick={() => { setSlippageInput(String(slippage)); setEditingSlippage(true); }}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  {slippage}% <Pencil size={12} className="text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Minimum received</span>
              <span className="text-sm font-semibold text-white">{getMinimumReceived()} {toAsset.symbol}</span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {sunioActive ? (
                <span className="text-xs text-emerald-500/70 font-semibold">Powered by Sun.io · SunSwap</span>
              ) : (
                <span className="text-xs text-slate-500">May include 0.3% pool fee</span>
              )}
              <Info size={13} className="text-slate-500" />
            </div>
          </div>

          {/* Action Button */}
          <button onClick={handleRequestConfirm}
            disabled={loading || !fromAmount || parseFloat(fromAmount) <= 0 || isQuoteLoading}
            className="w-full bg-blue-600 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30">
            {isQuoteLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={18} fill="currentColor" className="text-yellow-400" />}
            {isQuoteLoading ? "Calcul du prix..." : "Echanger maintenant"}
          </button>
        </div>

        {/* Live Price Info */}
        <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPriceLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix du marche</span>
            </div>
            {lastPriceUpdate && (
              <span className="text-[9px] font-medium text-slate-500">
                MAJ: {lastPriceUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[fromAsset, toAsset].map((asset) => (
              <div key={asset.id} className="bg-white/5 rounded-xl p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <AssetIcon asset={asset} size={20} />
                  <span className="text-[10px] font-bold text-white">{asset.symbol}</span>
                </div>
                <p className="text-xs font-black text-white">
                  {CRYPTO_IDS.includes(asset.id)
                    ? `$${prices[asset.id]?.toLocaleString() || "---"}`
                    : `1 USD = ${prices[asset.id]?.toLocaleString() || "---"} ${asset.symbol}`}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-slate-500 text-center">Source: {priceSource} (rafraichi toutes les 30s)</p>
        </div>

        <div className="mt-8 flex flex-col items-center opacity-30">
          <div className="flex items-center gap-2">
            <AlertCircle size={12} />
            <span className="text-[8px] font-black uppercase tracking-widest text-center">Securise par PimPay Ledger Technology</span>
          </div>
        </div>
      </div>

      {/* ASSET SELECTOR MODAL */}
      {isSelecting && (
        <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="px-6 pt-10 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tighter">Selectionner</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {isSelecting === "from" ? "Actif a vendre" : "Actif a recevoir"}
                </p>
              </div>
              <button onClick={() => { setIsSelecting(null); setSearchQuery(""); }}
                className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                <X size={20} />
              </button>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="Rechercher un actif..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none placeholder:text-slate-600 focus:border-blue-500/50 transition-colors" autoFocus />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-10">
            {CATEGORY_ORDER.map((category) => {
              const assets = groupedAssets[category];
              if (!assets || assets.length === 0) return null;
              return (
                <div key={category} className="mb-6">
                  <div className="flex items-center gap-2 mb-3 ml-1">
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: category === "fiat" ? "#22c55e" : category === "stablecoin" ? "#26a17b" : "#3b82f6" }} />
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">{CATEGORY_LABELS[category] || category}</span>
                  </div>
                  <div className="space-y-1">
                    {assets.map((asset) => {
                      const isSelected = asset.id === selectedId;
                      const balNum = parseFloat(balances[asset.id] || "0");
                      const sunioCompatible = SUNIO_TOKENS.has(asset.id);
                      return (
                        <button key={asset.id} onClick={() => handleSelectAsset(asset)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.98] ${isSelected ? "bg-blue-500/10 border border-blue-500/20" : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"}`}>
                          <div className="flex items-center gap-3">
                            <AssetIcon asset={asset} size={44} />
                            <div className="text-left">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-sm" style={{ color: asset.color }}>{asset.symbol}</p>
                                {sunioCompatible && (
                                  <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded font-bold">SUN.IO</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {balNum > 0 ? balNum.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "0,00"} {asset.symbol}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {asset.network && (
                              <span className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-2 py-1 rounded-md">{asset.network}</span>
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
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Aucun actif correspondant</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION SCREEN */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-[#020617] overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }}
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/30 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen p-6">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 pt-4 mb-6">
                <button onClick={() => setShowConfirm(false)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight">Resume du <span className="text-blue-500">Swap</span></h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Verifiez les details avant confirmation</p>
                </div>
              </motion.div>

              {/* Badge route */}
              {sunioActive && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                  className="flex items-center justify-center gap-2 mb-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Sun.io · SunSwap TRON on-chain</span>
                </motion.div>
              )}

              <div className="flex-1 flex flex-col justify-center space-y-5">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: "spring" }} className="flex justify-center mb-2">
                  <motion.div animate={{ rotate: loading ? 360 : 0 }} transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
                    className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/30">
                    <RefreshCw size={28} className="text-blue-400" />
                  </motion.div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/10 rounded-[2rem] p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-5 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Vous vendez</p>
                      <div className="flex items-center gap-2">
                        <AssetIcon asset={fromAsset} size={40} />
                        <div className="min-w-0"><p className="text-xl font-black text-white truncate">{fromAmount}</p><p className="text-xs text-slate-400 font-bold">{fromAsset.symbol}</p></div>
                      </div>
                    </div>
                    <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-10 h-10 shrink-0 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
                      <ArrowRight size={16} className="text-blue-400" />
                    </motion.div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Vous recevez</p>
                      <div className="flex items-center gap-2 justify-end">
                        <div className="min-w-0"><p className="text-xl font-black text-blue-400 truncate">{formatToAmount()}</p><p className="text-xs text-slate-400 font-bold">{toAsset.symbol}</p></div>
                        <AssetIcon asset={toAsset} size={40} />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2"><TrendingUp size={12} className="text-blue-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Taux de change</span></div>
                      <span className="text-xs font-black text-white">1 {fromAsset.symbol} = {getExchangeRate()} {toAsset.symbol}</span>
                    </div>
                    {sunioActive && sunioQuote && (
                      <div className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-2"><Zap size={12} className="text-emerald-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Price Impact</span></div>
                        <span className={`text-xs font-black ${parseFloat(sunioQuote.priceImpact) > 2 ? "text-red-400" : "text-emerald-400"}`}>{parseFloat(sunioQuote.priceImpact).toFixed(2)}%</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2"><Banknote size={12} className="text-amber-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Frais reseau</span></div>
                      <span className="text-xs font-black text-white">{NETWORK_FEE}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2"><Zap size={12} className="text-purple-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Slippage</span></div>
                      <span className="text-xs font-black text-white">{slippage}%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2"><Shield size={12} className="text-emerald-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Minimum recu</span></div>
                      <span className="text-xs font-black text-emerald-400">{getMinimumReceived()} {toAsset.symbol}</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                  <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                  <div>
                    <p className="text-[10px] font-black text-amber-400 uppercase mb-1">Attention</p>
                    <p className="text-[9px] text-amber-200/60 leading-relaxed font-medium">
                      {sunioActive
                        ? "Ce swap est exécuté on-chain sur TRON via Sun.io. Il est irreversible une fois confirmé. Vérifiez le price impact avant de continuer."
                        : "Cette operation de conversion est irreversible. Assurez-vous que les details sont corrects avant de confirmer."}
                    </p>
                  </div>
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-3 pb-4">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSwapExecute} disabled={loading}
                  className="w-full py-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 disabled:opacity-50">
                  {loading ? <><Loader2 className="animate-spin" size={18} /><span>Traitement en cours...</span></>
                    : <><CheckCircle2 size={18} /><span>Confirmer le Swap</span></>}
                </motion.button>
                <button onClick={() => setShowConfirm(false)} disabled={loading}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all disabled:opacity-50">
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
