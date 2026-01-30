"use client";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowDown,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  X,
  Zap,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Définition des types
interface Asset {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  bgColor: string;
}

const CRYPTO_ASSETS: Asset[] = [
  { id: "PI", name: "Pi Network", symbol: "PI", icon: "/pi-coin.png", bgColor: "bg-indigo-600" },
  { id: "BTC", name: "Bitcoin", symbol: "BTC", icon: "/bitcoin.png", bgColor: "bg-[#f7931a]" },
  { id: "SDA", name: "Sidra Assets", symbol: "SDA", icon: "/sidrachain.png", bgColor: "bg-[#d97706]" },
  { id: "USDT", name: "Tether", symbol: "USDT", icon: "/tether-usdt.png", bgColor: "bg-[#0d9488]" },
];

export default function CryptoSwapPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState<"from" | "to" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false); // État pour la confirmation

  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({
    PI: 314159,
    BTC: 0,
    SDA: 1.2,
    USDT: 1
  });

  const [balances, setBalances] = useState<Record<string, string>>({
    PI: "0.0000", BTC: "0.0000", SDA: "0.00", USDT: "0.00"
  });

  const [fromAsset, setFromAsset] = useState<Asset>(CRYPTO_ASSETS[2]);
  const [toAsset, setToAsset] = useState<Asset>(CRYPTO_ASSETS[3]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(0);

  const fetchMarketData = useCallback(async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd');
      const data = await res.json();
      setMarketPrices(prev => ({
        ...prev,
        BTC: data.bitcoin?.usd || 95000,
        USDT: data.tether?.usd || 1
      }));
    } catch (err) {
      console.error("Erreur prix marché:", err);
    }
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet/balance');
      if (res.ok) {
        const result = await res.json();
        setBalances({
          PI: result.PI || "0.0000",
          BTC: result.BTC || "0.0000",
          SDA: result.SDA || "0.00",
          USDT: result.USDT || "0.00"
        });
      }
    } catch (err) {
      console.error("Erreur soldes:", err);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchMarketData();
    loadUserData();
  }, [fetchMarketData, loadUserData]);

  useEffect(() => {
    const amount = parseFloat(fromAmount);
    if (!isNaN(amount) && amount > 0 && marketPrices[fromAsset.id] && marketPrices[toAsset.id]) {
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

  // Ouvre l'étape de confirmation
  const handleRequestConfirm = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return toast.error("Entrez un montant valide");
    const currentBalance = parseFloat(balances[fromAsset.id]);
    if (parseFloat(fromAmount) > currentBalance) return toast.error(`Solde ${fromAsset.symbol} insuffisant`);
    
    setShowConfirm(true);
  };

  const handleSwapExecute = async () => {
    if (loading) return; // Anti-double clic
    setLoading(true);
    try {
      const response = await fetch('/api/wallet/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(fromAmount),
          fromCurrency: fromAsset.symbol,
          toCurrency: toAsset.symbol
        })
      });

      if (response.ok) {
        toast.success("Transaction validée par PimPay !");
        setFromAmount("");
        setShowConfirm(false);
        await loadUserData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Le swap a échoué");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24 p-6 font-sans">
      {/* Header Original */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <button onClick={() => router.back()} className="p-2 text-slate-400 active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-black italic uppercase tracking-tighter">
          PimPay <span className="text-blue-500">Swap</span>
        </h1>
        <button onClick={() => { fetchMarketData(); loadUserData(); }} className={`p-2 text-slate-400 ${loading ? 'animate-spin' : ''}`}>
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-2xl relative">
        {/* FROM */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 px-2">
            <span>Depuis</span>
            <span className="text-blue-400 font-bold">Solde: {balances[fromAsset.id]} {fromAsset.symbol}</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between focus-within:border-blue-500/50 transition-colors">
            <input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="bg-transparent text-2xl font-black outline-none w-1/2 placeholder:text-slate-700"
            />
            <button onClick={() => setIsSelecting("from")} className="flex items-center gap-2 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10 active:scale-95 transition-all">
              <img src={fromAsset.icon} className="w-8 h-8 object-contain rounded-lg shadow-lg" alt={fromAsset.symbol} />
              <span className="font-black text-sm">{fromAsset.symbol}</span>
              <ChevronDown size={16} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Bouton Inversion */}
        <div className="flex justify-center -my-7 relative z-10">
          <button onClick={toggleAssets} className="bg-blue-600 p-3 rounded-full border-8 border-[#020617] shadow-xl active:rotate-180 transition-all duration-500 hover:bg-blue-500">
            <ArrowDown size={20} />
          </button>
        </div>

        {/* TO */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 px-2">
            <span>Vers <span className="text-slate-600 font-medium ml-1">(${marketPrices[toAsset.id]?.toLocaleString()})</span></span>
            <span className="text-slate-500">Solde: {balances[toAsset.id]}</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between">
            <div className="text-2xl font-black truncate w-1/2 text-slate-300">
                {toAmount > 0 ? toAmount.toLocaleString(undefined, { maximumFractionDigits: (toAsset.id === "BTC" || toAsset.id === "PI") ? 8 : 2 }) : "0.00"}
            </div>
            <button onClick={() => setIsSelecting("to")} className="flex items-center gap-2 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10 active:scale-95 transition-all">
              <img src={toAsset.icon} className="w-8 h-8 object-contain rounded-lg shadow-lg" alt={toAsset.symbol} />
              <span className="font-black text-sm">{toAsset.symbol}</span>
              <ChevronDown size={16} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Taux */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-3 flex justify-between items-center text-[10px] font-bold">
          <span className="text-slate-500 uppercase">Taux de change</span>
          <span className="text-blue-400 italic bg-blue-500/10 px-2 py-1 rounded-md">
            1 {fromAsset.symbol} = {(marketPrices[fromAsset.id] / marketPrices[toAsset.id]).toFixed(toAsset.id === "BTC" ? 8 : 4)} {toAsset.symbol}
          </span>
        </div>

        {/* Bouton qui appelle la confirmation */}
        <button
          onClick={handleRequestConfirm}
          disabled={loading || !fromAmount || parseFloat(fromAmount) <= 0}
          className="w-full bg-blue-600 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30 overflow-hidden"
        >
          <Zap size={18} fill="currentColor" className="text-yellow-400" />
          Échanger maintenant
        </button>
      </div>

      {/* MODAL DE SÉLECTION D'ACTIFS ORIGINAL */}
      {isSelecting && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black uppercase italic tracking-tighter">Sélectionner</h2>
            <button onClick={() => setIsSelecting(null)} className="p-3 bg-white/5 rounded-full"><X size={24} /></button>
          </div>
          <div className="space-y-3 overflow-y-auto">
            {CRYPTO_ASSETS.map((asset) => (
              <div key={asset.id} onClick={() => { if (isSelecting === "from") setFromAsset(asset); else setToAsset(asset); setIsSelecting(null); }} className="group border border-white/5 bg-white/5 p-4 rounded-3xl flex items-center justify-between active:scale-95 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${asset.bgColor} rounded-xl p-2 flex items-center justify-center shadow-inner`}>
                    <img src={asset.icon} alt={asset.name} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="font-black text-sm">{asset.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{asset.symbol}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PAGE DE CONFIRMATION SÉCURISÉE --- */}
      {showConfirm && (
        <div className="fixed inset-0 z-[110] bg-[#020617] p-6 flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-4 mb-8 pt-4">
            <button onClick={() => setShowConfirm(false)} className="p-2 text-slate-400"><ArrowLeft size={24} /></button>
            <h2 className="text-lg font-black uppercase italic tracking-tighter text-blue-500">Vérification PimPay</h2>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center space-y-8">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
               <RefreshCw size={32} className={`text-blue-500 ${loading ? 'animate-spin' : ''}`} />
            </div>

            <div className="w-full bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 space-y-6">
                <div className="flex justify-between items-center px-4">
                  <div className="text-center">
                    <p className="text-2xl font-black">{fromAmount}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{fromAsset.symbol}</p>
                  </div>
                  <ArrowRight className="text-blue-500" size={24} />
                  <div className="text-center">
                    <p className="text-2xl font-black text-blue-400">{toAmount.toFixed(4)}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{toAsset.symbol}</p>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full" />

                <div className="space-y-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <div className="flex justify-between"><span>Taux</span><span>1 {fromAsset.symbol} = {(marketPrices[fromAsset.id] / marketPrices[toAsset.id]).toFixed(4)} {toAsset.symbol}</span></div>
                  <div className="flex justify-between"><span className="text-green-500">Frais</span><span className="text-green-500">0.00 %</span></div>
                </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                <AlertCircle className="text-yellow-500 shrink-0" size={16} />
                <p className="text-[9px] text-yellow-200/50 leading-relaxed font-bold uppercase italic">
                  Attention : Cette opération de conversion est irréversible dans le Ledger PimPay.
                </p>
            </div>
          </div>

          <button
            onClick={handleSwapExecute}
            disabled={loading}
            className="w-full bg-blue-600 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all mb-4"
          >
            {loading ? <RefreshCw className="animate-spin" /> : "Confirmer le Swap"}
          </button>
        </div>
      )}

      {/* Footer Info Original */}
      <div className="mt-12 flex flex-col items-center opacity-30">
        <div className="flex items-center gap-2">
            <AlertCircle size={12} />
            <span className="text-[8px] font-black uppercase tracking-widest text-center leading-relaxed">
              Sécurisé par PimPay Ledger Technology<br/>Synchronisation Blockchain Temps Réel (Sidra/Pi)
            </span>
        </div>
      </div>
    </div>
  );
}
