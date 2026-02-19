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
} from "lucide-react";
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
}

const ALL_ASSETS: Asset[] = [
  // Native / Ecosystem
  { id: "PI", name: "Pi Network", symbol: "PI", color: "#7c3aed", category: "native" },
  { id: "SDA", name: "Sidra Assets", symbol: "SDA", color: "#d97706", category: "native" },
  // Major Cryptos
  { id: "BTC", name: "Bitcoin", symbol: "BTC", color: "#f7931a", category: "major" },
  { id: "ETH", name: "Ethereum", symbol: "ETH", color: "#627eea", category: "major" },
  { id: "BNB", name: "BNB", symbol: "BNB", color: "#f3ba2f", category: "major" },
  { id: "SOL", name: "Solana", symbol: "SOL", color: "#9945ff", category: "major" },
  { id: "XRP", name: "Ripple", symbol: "XRP", color: "#23292f", category: "major" },
  { id: "XLM", name: "Stellar", symbol: "XLM", color: "#14b8a6", category: "major" },
  { id: "TRX", name: "Tron", symbol: "TRX", color: "#eb0029", category: "major" },
  { id: "ADA", name: "Cardano", symbol: "ADA", color: "#0033ad", category: "major" },
  { id: "DOGE", name: "Dogecoin", symbol: "DOGE", color: "#c2a633", category: "major" },
  { id: "TON", name: "Toncoin", symbol: "TON", color: "#0098ea", category: "major" },
  // Stablecoins
  { id: "USDT", name: "Tether", symbol: "USDT", color: "#26a17b", category: "stablecoin" },
  { id: "USDC", name: "USD Coin", symbol: "USDC", color: "#2775ca", category: "stablecoin" },
  { id: "DAI", name: "Dai", symbol: "DAI", color: "#f5ac37", category: "stablecoin" },
  { id: "BUSD", name: "Binance USD", symbol: "BUSD", color: "#f0b90b", category: "stablecoin" },
  // Fiat
  { id: "USD", name: "Dollar US", symbol: "USD", color: "#22c55e", category: "fiat", flag: "US" },
  { id: "EUR", name: "Euro", symbol: "EUR", color: "#3b82f6", category: "fiat", flag: "EU" },
  { id: "XAF", name: "Franc CFA (BEAC)", symbol: "XAF", color: "#0ea5e9", category: "fiat", flag: "CM" },
  { id: "XOF", name: "Franc CFA (BCEAO)", symbol: "XOF", color: "#06b6d4", category: "fiat", flag: "SN" },
  { id: "CDF", name: "Franc Congolais", symbol: "CDF", color: "#0284c7", category: "fiat", flag: "CD" },
  { id: "NGN", name: "Naira Nigerian", symbol: "NGN", color: "#16a34a", category: "fiat", flag: "NG" },
  { id: "AED", name: "Dirham Emirats", symbol: "AED", color: "#dc2626", category: "fiat", flag: "AE" },
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
  if (asset.category === "fiat" && asset.flag) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center shrink-0 font-black text-white"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${asset.color}, ${asset.color}aa)`,
          fontSize: size * 0.4,
        }}
      >
        {asset.symbol.charAt(0)}
      </div>
    );
  }
  return (
    <div
      className="rounded-2xl flex items-center justify-center shrink-0 font-black text-white"
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

export default function SwapPage() {
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
    // Fiat rates (vs 1 USD)
    USD: 1,
    EUR: 0.92,
    XAF: 615,
    XOF: 615,
    CDF: 2800,
    NGN: 1550,
    AED: 3.67,
  });

  const [balances, setBalances] = useState<Record<string, string>>({});

  const [fromAsset, setFromAsset] = useState<Asset>(ALL_ASSETS[12]); // USDT
  const [toAsset, setToAsset] = useState<Asset>(ALL_ASSETS[18]); // XAF
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(0);

  /* ---------- FETCHERS ---------- */

  const fetchPrices = useCallback(async () => {
    try {
      // Crypto prices
      const cryptoRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,stellar,tron,cardano,dogecoin,the-open-network,tether,usd-coin,dai&vs_currencies=usd",
        { signal: AbortSignal.timeout(5000) }
      );
      const cryptoData = await cryptoRes.json();

      // Fiat rates
      const fiatRes = await fetch(
        "https://open.er-api.com/v6/latest/USD",
        { signal: AbortSignal.timeout(5000) }
      );
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
        // Fiat from exchange-rates API
        EUR: fiatData?.rates?.EUR || prev.EUR,
        XAF: fiatData?.rates?.XAF || prev.XAF,
        XOF: fiatData?.rates?.XOF || prev.XOF,
        CDF: fiatData?.rates?.CDF || prev.CDF,
        NGN: fiatData?.rates?.NGN || prev.NGN,
        AED: fiatData?.rates?.AED || prev.AED,
      }));
    } catch {
      // fallback prices already set
    }
  }, []);

  const loadBalances = useCallback(async () => {
    try {
      // Also get profile for wallet data
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
  }, [fetchPrices, loadBalances]);

  /* ---------- CONVERSION LOGIC ---------- */

  const getValueInUsd = useCallback(
    (assetId: string, amount: number): number => {
      const isCrypto = CRYPTO_IDS.includes(assetId);
      if (isCrypto) {
        // Crypto price is already in USD
        return amount * (prices[assetId] || 0);
      }
      // Fiat: prices[assetId] = how many of this fiat per 1 USD
      return amount / (prices[assetId] || 1);
    },
    [prices]
  );

  const getAmountFromUsd = useCallback(
    (assetId: string, usdValue: number): number => {
      const isCrypto = CRYPTO_IDS.includes(assetId);
      if (isCrypto) {
        return usdValue / (prices[assetId] || 1);
      }
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
      const response = await fetch("/api/transaction/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(fromAmount),
          sourceCurrency: fromAsset.id,
          targetCurrency: toAsset.id,
          estimatedOut: toAmount,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        toast.error(err.error || "Erreur lors du calcul");
        setLoading(false);
        return;
      }

      const quoteData = await response.json();

      // Confirm the swap
      const confirmRes = await fetch("/api/transaction/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quoteData.quoteId }),
      });

      if (confirmRes.ok) {
        setIsSuccess(true);
        setShowConfirm(false);
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

  const getAssetPrice = (id: string) => {
    if (CRYPTO_IDS.includes(id)) return prices[id] || 0;
    // For fiat, show how many per 1 USD
    return prices[id] ? 1 / prices[id] : 0;
  };

  if (!isMounted)
    return <div className="min-h-screen bg-[#020617]" />;

  const selectedId = isSelecting === "from" ? fromAsset.id : toAsset.id;

  /* ---- SUCCESS SCREEN ---- */
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
          <div className="relative bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[3rem]">
            <CheckCircle2 size={80} className="text-emerald-500 animate-bounce" />
          </div>
        </div>

        <h2 className="text-xl font-black mb-2 uppercase tracking-tighter">
          Swap Reussi
        </h2>
        <p className="text-slate-400 text-sm mb-8 font-medium px-10">
          Vos fonds ont ete convertis avec succes au taux PimPay.
        </p>

        <div className="w-full bg-white/5 border border-white/5 rounded-[2.5rem] p-6 mb-10 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase">
              Vendu
            </span>
            <div className="flex items-center gap-2">
              <AssetIcon asset={fromAsset} size={24} />
              <span className="font-bold">
                {fromAmount} {fromAsset.symbol}
              </span>
            </div>
          </div>
          <div className="flex justify-center py-2 opacity-20">
            <ArrowDown size={16} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase">
              Recu
            </span>
            <div className="flex items-center gap-2">
              <AssetIcon asset={toAsset} size={24} />
              <span className="font-bold text-emerald-400">
                {formatToAmount()} {toAsset.symbol}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full p-6 bg-white text-black rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          Retour au Dashboard <ArrowRight size={18} />
        </button>
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
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">
              PimPay <span className="text-blue-500">Swap</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp size={8} className="text-blue-500" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">
                Crypto & Fiat Exchange
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            fetchPrices();
            loadBalances();
            toast.success("Taux actualises");
          }}
          className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10"
        >
          <RefreshCw size={16} />
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
                Solde: {parseFloat(balances[fromAsset.id] || "0").toLocaleString(undefined, { maximumFractionDigits: 6 })} {fromAsset.symbol}
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
                Solde: {parseFloat(balances[toAsset.id] || "0").toLocaleString(undefined, { maximumFractionDigits: 6 })}
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

          {/* Rate info */}
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-3 flex justify-between items-center text-[10px] font-bold">
            <span className="text-slate-500 uppercase">Taux</span>
            <span className="text-blue-400 italic bg-blue-500/10 px-2 py-1 rounded-md">
              1 {fromAsset.symbol} = {getExchangeRate()} {toAsset.symbol}
            </span>
          </div>

          {/* Action Button */}
          <button
            onClick={handleRequestConfirm}
            disabled={loading || !fromAmount || parseFloat(fromAmount) <= 0}
            className="w-full bg-blue-600 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
          >
            <Zap size={18} fill="currentColor" className="text-yellow-400" />
            Echanger maintenant
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-col items-center opacity-30">
          <div className="flex items-center gap-2">
            <AlertCircle size={12} />
            <span className="text-[8px] font-black uppercase tracking-widest text-center leading-relaxed">
              Securise par PimPay Ledger Technology
            </span>
          </div>
        </div>
      </div>

      {/* ASSET SELECTOR MODAL */}
      {isSelecting && (
        <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Modal Header */}
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

            {/* Search */}
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

          {/* Token / Fiat List */}
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
                  <div className="space-y-2">
                    {assets.map((asset) => {
                      const isSelected = asset.id === selectedId;
                      const balance = balances[asset.id] || "0.00";
                      const price = CRYPTO_IDS.includes(asset.id)
                        ? prices[asset.id]
                        : null;
                      const balNum = parseFloat(balance);
                      const balanceValue = CRYPTO_IDS.includes(asset.id)
                        ? balNum * (prices[asset.id] || 0)
                        : balNum / (prices[asset.id] || 1);

                      return (
                        <button
                          key={asset.id}
                          onClick={() => handleSelectAsset(asset)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.98] ${
                            isSelected
                              ? "bg-blue-500/10 border border-blue-500/20"
                              : "bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <AssetIcon asset={asset} size={44} />
                            <div className="text-left">
                              <p className="font-black text-sm leading-tight">
                                {asset.name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                                {asset.symbol}
                                {price != null && (
                                  <span className="text-slate-600 ml-2">
                                    ${price.toLocaleString()}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs font-black text-slate-300">
                                {balNum > 0
                                  ? balNum.toLocaleString(undefined, {
                                      maximumFractionDigits: 6,
                                    })
                                  : "0.00"}
                              </p>
                              {balanceValue > 0.01 && (
                                <p className="text-[9px] text-slate-600 font-bold">
                                  ~${balanceValue.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              )}
                            </div>
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
                  Aucun actif correspondant
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION SCREEN */}
      {showConfirm && (
        <div className="fixed inset-0 z-[110] bg-[#020617] p-6 flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-4 mb-8 pt-4">
            <button
              onClick={() => setShowConfirm(false)}
              className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-black uppercase tracking-tighter text-blue-500">
              Verification PimPay
            </h2>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center space-y-8">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
              <RefreshCw
                size={32}
                className={`text-blue-500 ${loading ? "animate-spin" : ""}`}
              />
            </div>

            <div className="w-full bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 space-y-6">
              <div className="flex justify-between items-center px-4">
                <div className="text-center">
                  <p className="text-2xl font-black">{fromAmount}</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <AssetIcon asset={fromAsset} size={20} />
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      {fromAsset.symbol}
                    </p>
                  </div>
                </div>
                <ArrowRight className="text-blue-500" size={24} />
                <div className="text-center">
                  <p className="text-2xl font-black text-blue-400">
                    {formatToAmount()}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <AssetIcon asset={toAsset} size={20} />
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      {toAsset.symbol}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/5 w-full" />

              <div className="space-y-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex justify-between">
                  <span>Taux</span>
                  <span>
                    1 {fromAsset.symbol} = {getExchangeRate()} {toAsset.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-500">Frais</span>
                  <span className="text-green-500">0.00 %</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
              <AlertCircle className="text-yellow-500 shrink-0" size={16} />
              <p className="text-[9px] text-yellow-200/50 leading-relaxed font-bold uppercase italic">
                Attention : Cette operation de conversion est irreversible dans
                le Ledger PimPay.
              </p>
            </div>
          </div>

          <button
            onClick={handleSwapExecute}
            disabled={loading}
            className="w-full bg-blue-600 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all mb-4 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              "Confirmer le Swap"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
