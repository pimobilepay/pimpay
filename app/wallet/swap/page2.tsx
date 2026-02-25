"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowDown,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  X,
  Zap,
  AlertCircle,
  ArrowRight,
  Search,
  Check,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Asset {
  id: string;
  name: string;
  symbol: string;
  color: string;
  category: "native" | "major" | "stablecoin";
}

const CRYPTO_ASSETS: Asset[] = [
  // Native / Ecosystem
  { id: "PI", name: "Pi Network", symbol: "PI", color: "#7c3aed", category: "native" },
  { id: "SDA", name: "Sidra Assets", symbol: "SDA", color: "#d97706", category: "native" },
  // Major
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
];

const CATEGORY_LABELS: Record<string, string> = {
  native: "Ecosysteme",
  major: "Principales",
  stablecoin: "Stablecoins",
};

function CryptoIcon({ asset, size = 40 }: { asset: Asset; size?: number }) {
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

export default function CryptoSwapPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState<"from" | "to" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({
    PI: 314159,
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
  });

  const [balances, setBalances] = useState<Record<string, string>>({});

  const [fromAsset, setFromAsset] = useState<Asset>(CRYPTO_ASSETS[1]); // SDA
  const [toAsset, setToAsset] = useState<Asset>(CRYPTO_ASSETS[12]); // USDT
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(0);

  const fetchMarketData = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,stellar,tron,cardano,dogecoin,the-open-network,tether,usd-coin,dai&vs_currencies=usd",
        { signal: AbortSignal.timeout(5000) }
      );
      const data = await res.json();
      setMarketPrices((prev) => ({
        ...prev,
        BTC: data.bitcoin?.usd || prev.BTC,
        ETH: data.ethereum?.usd || prev.ETH,
        BNB: data.binancecoin?.usd || prev.BNB,
        SOL: data.solana?.usd || prev.SOL,
        XRP: data.ripple?.usd || prev.XRP,
        XLM: data.stellar?.usd || prev.XLM,
        TRX: data.tron?.usd || prev.TRX,
        ADA: data.cardano?.usd || prev.ADA,
        DOGE: data.dogecoin?.usd || prev.DOGE,
        TON: data["the-open-network"]?.usd || prev.TON,
        USDT: data.tether?.usd || 1,
        USDC: data["usd-coin"]?.usd || 1,
        DAI: data.dai?.usd || 1,
      }));
    } catch {
      // fallback prices already set
    }
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/balance");
      if (res.ok) {
        const result = await res.json();
        const b: Record<string, string> = {};
        for (const asset of CRYPTO_ASSETS) {
          b[asset.id] = result[asset.id] || "0.00";
        }
        setBalances(b);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchMarketData();
    loadUserData();
  }, [fetchMarketData, loadUserData]);

  useEffect(() => {
    const amount = parseFloat(fromAmount);
    if (
      !isNaN(amount) &&
      amount > 0 &&
      marketPrices[fromAsset.id] &&
      marketPrices[toAsset.id]
    ) {
      const res = (amount * marketPrices[fromAsset.id]) / marketPrices[toAsset.id];
      setToAmount(res);
    } else {
      setToAmount(0);
    }
  }, [fromAmount, fromAsset, toAsset, marketPrices]);

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
    setSwapError(null);
    setShowConfirm(true);
  };

  const handleSwapExecute = async () => {
    if (loading) return;
    setLoading(true);
    setSwapError(null);
    try {
      const response = await fetch("/api/wallet/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(fromAmount),
          fromCurrency: fromAsset.symbol,
          toCurrency: toAsset.symbol,
        }),
      });

      if (response.ok) {
        toast.success("Transaction validee par PimPay !");
        setFromAmount("");
        setShowConfirm(false);
        setSwapError(null);
        await loadUserData();
      } else {
        const data = await response.json();
        const errMsg = data.error || "Le swap a echoue";
        setSwapError(errMsg);
        setShowConfirm(false);
        toast.error(errMsg);
      }
    } catch {
      setSwapError("Erreur reseau. Verifiez votre connexion.");
      setShowConfirm(false);
      toast.error("Erreur reseau");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAsset = (asset: Asset) => {
    if (isSelecting === "from") {
      if (asset.id === toAsset.id) {
        setToAsset(fromAsset);
      }
      setFromAsset(asset);
    } else {
      if (asset.id === fromAsset.id) {
        setFromAsset(toAsset);
      }
      setToAsset(asset);
    }
    setIsSelecting(null);
    setSearchQuery("");
    setFromAmount("");
  };

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return CRYPTO_ASSETS;
    const q = searchQuery.toLowerCase();
    return CRYPTO_ASSETS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.symbol.toLowerCase().includes(q)
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

  const formatToAmount = () => {
    if (toAmount <= 0) return "0.00";
    if (toAsset.id === "BTC") return toAmount.toFixed(8);
    if (toAsset.id === "PI") return toAmount.toFixed(8);
    if (toAmount < 0.01) return toAmount.toFixed(6);
    return toAmount.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const getExchangeRate = () => {
    if (!marketPrices[fromAsset.id] || !marketPrices[toAsset.id]) return "---";
    const rate = marketPrices[fromAsset.id] / marketPrices[toAsset.id];
    if (toAsset.id === "BTC" || toAsset.id === "PI") return rate.toFixed(8);
    if (rate < 0.001) return rate.toFixed(8);
    return rate.toFixed(4);
  };

  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  const selectedId = isSelecting === "from" ? fromAsset.id : toAsset.id;

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
              <TrendingUp size={8} className="text-blue-500" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">
                Exchange
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            fetchMarketData();
            loadUserData();
          }}
          className={`w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 ${loading ? "animate-spin" : ""}`}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="px-6">
        {/* Error Banner */}
        {swapError && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
            <div className="flex-1">
              <p className="text-xs font-bold text-red-400">{swapError}</p>
              <button 
                onClick={() => setSwapError(null)} 
                className="text-[9px] text-red-300/60 font-bold uppercase mt-1 hover:text-red-300 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
        <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-2xl relative">
          {/* FROM */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 px-2">
              <span>Depuis</span>
              <span className="text-blue-400 font-bold">
                Solde: {balances[fromAsset.id] || "0.00"} {fromAsset.symbol}
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
                className="flex items-center gap-2 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10 active:scale-95 transition-all"
              >
                <CryptoIcon asset={fromAsset} size={32} />
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
              <span>
                Vers{" "}
                <span className="text-slate-600 font-medium ml-1">
                  (${marketPrices[toAsset.id]?.toLocaleString()})
                </span>
              </span>
              <span className="text-slate-500">
                Solde: {balances[toAsset.id] || "0.00"}
              </span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between">
              <div className="text-2xl font-black truncate w-1/2 text-slate-300">
                {formatToAmount()}
              </div>
              <button
                onClick={() => setIsSelecting("to")}
                className="flex items-center gap-2 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10 active:scale-95 transition-all"
              >
                <CryptoIcon asset={toAsset} size={32} />
                <span className="font-black text-sm">{toAsset.symbol}</span>
                <ChevronDown size={16} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Rate */}
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-3 flex justify-between items-center text-[10px] font-bold">
            <span className="text-slate-500 uppercase">Taux de change</span>
            <span className="text-blue-400 italic bg-blue-500/10 px-2 py-1 rounded-md">
              1 {fromAsset.symbol} = {getExchangeRate()} {toAsset.symbol}
            </span>
          </div>

          {/* Action */}
          <button
            onClick={handleRequestConfirm}
            disabled={loading || !fromAmount || parseFloat(fromAmount) <= 0}
            className="w-full bg-blue-600 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30 overflow-hidden"
          >
            <Zap size={18} fill="currentColor" className="text-yellow-400" />
            {"Echanger maintenant"}
          </button>
        </div>

        {/* Footer Info */}
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
          {/* Modal Header */}
          <div className="px-6 pt-10 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tighter">
                  Selectionner
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {isSelecting === "from" ? "Actif source" : "Actif cible"}
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
                placeholder="Rechercher un actif..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none placeholder:text-slate-600 focus:border-blue-500/50 transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Token List */}
          <div className="flex-1 overflow-y-auto px-6 pb-10">
            {Object.entries(groupedAssets).map(([category, assets]) => (
              <div key={category} className="mb-6">
                <div className="flex items-center gap-2 mb-3 ml-1">
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                </div>
                <div className="space-y-2">
                  {assets.map((asset) => {
                    const isSelected = asset.id === selectedId;
                    const balance = balances[asset.id] || "0.00";
                    const price = marketPrices[asset.id];
                    const balanceValue =
                      parseFloat(balance) * (price || 0);

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
                          <CryptoIcon asset={asset} size={44} />
                          <div className="text-left">
                            <p className="font-black text-sm leading-tight">
                              {asset.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                              {asset.symbol}
                              {price && (
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
                              {parseFloat(balance) > 0
                                ? parseFloat(balance).toLocaleString(undefined, {
                                    maximumFractionDigits: 6,
                                  })
                                : "0.00"}
                            </p>
                            {balanceValue > 0 && (
                              <p className="text-[9px] text-slate-600 font-bold">
                                ${balanceValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
            ))}

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
                    <CryptoIcon asset={fromAsset} size={20} />
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      {fromAsset.symbol}
                    </p>
                  </div>
                </div>
                <ArrowRight className="text-blue-500" size={24} />
                <div className="text-center">
                  <p className="text-2xl font-black text-blue-400">
                    {toAmount.toFixed(4)}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <CryptoIcon asset={toAsset} size={20} />
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
                {"Attention : Cette operation de conversion est irreversible dans le Ledger PimPay."}
              </p>
            </div>
          </div>

          <button
            onClick={handleSwapExecute}
            disabled={loading}
            className="w-full bg-blue-600 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all mb-4"
          >
            {loading ? (
              <RefreshCw className="animate-spin" />
            ) : (
              "Confirmer le Swap"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
