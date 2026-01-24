"use client";

import { useState, useEffect } from "react";
import { 
  ArrowDown, Settings2, Zap, AlertCircle, Loader2, ArrowLeft, RefreshCw, Clock, ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Définition des assets avec leurs couleurs et logos
const CRYPTO_ASSETS = [
  { 
    id: "SDA", 
    name: "Sidra Assets", 
    symbol: "SDA", 
    color: "bg-[#d97706]", 
    icon: (className: string) => (
      <div className={`${className} flex items-center justify-center font-bold text-[10px] border border-white/20 rounded-lg bg-gradient-to-br from-amber-400 to-amber-700`}>
        S
      </div>
    )
  },
  { 
    id: "BTC", 
    name: "Bitcoin", 
    symbol: "BTC", 
    color: "bg-orange-500", 
    icon: (className: string) => (
      <div className={`${className} flex items-center justify-center font-bold text-[10px] rounded-lg bg-[#F7931A]`}>
        ₿
      </div>
    )
  },
  { 
    id: "USDT", 
    name: "Tether", 
    symbol: "USDT", 
    color: "bg-emerald-500", 
    icon: (className: string) => (
      <div className={`${className} flex items-center justify-center font-bold text-[10px] rounded-lg bg-[#26A17B]`}>
        ₮
      </div>
    )
  },
  { 
    id: "ETH", 
    name: "Ethereum", 
    symbol: "ETH", 
    color: "bg-indigo-500", 
    icon: (className: string) => (
      <div className={`${className} flex items-center justify-center font-bold text-[10px] rounded-lg bg-[#627EEA]`}>
        Ξ
      </div>
    )
  },
];

export default function CryptoSwapPage() {
  const router = useRouter();
  const [fromAsset, setFromAsset] = useState(CRYPTO_ASSETS[0]); // SDA par défaut
  const [toAsset, setToAsset] = useState(CRYPTO_ASSETS[2]);     // USDT par défaut
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Simulation des taux
  const rates: Record<string, number> = { SDA: 1.2, BTC: 65000, USDT: 1, ETH: 3500 };

  useEffect(() => {
    const amount = parseFloat(fromAmount);
    if (!isNaN(amount) && amount > 0) {
      const res = (amount * rates[fromAsset.id]) / rates[toAsset.id];
      setToAmount(res);
    } else {
      setToAmount(0);
    }
  }, [fromAmount, fromAsset, toAsset]);

  const toggleAssets = () => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setFromAmount("");
    setQuote(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24 p-6 font-sans">
      {/* Header identique à l'image Sidra mais style Pimpay */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <button onClick={() => router.back()} className="p-2 text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">Swap Crypto</h1>
        <div className="flex gap-4">
          <RefreshCw size={20} className="text-slate-400" />
          <Settings2 size={20} className="text-slate-400" />
        </div>
      </div>

      {/* Box de Swap principale */}
      <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 space-y-4">
        
        {/* FROM */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-medium text-slate-500 px-2">
            <span>Depuis</span>
            <span>Solde: 0.000</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="bg-transparent text-2xl font-bold outline-none w-1/2 placeholder:text-slate-700"
            />
            <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors border border-white/10">
              {fromAsset.icon("w-6 h-6")}
              <span className="font-bold text-sm">{fromAsset.symbol}</span>
              <ChevronDown size={16} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Bouton d'inversion central */}
        <div className="flex justify-center -my-6 relative z-10">
          <button 
            onClick={toggleAssets}
            className="bg-[#020617] p-2 rounded-full border-4 border-[#020617]"
          >
            <div className="bg-white/5 p-2 rounded-full border border-white/10 hover:bg-white/10 transition-all">
              <ArrowDown size={18} className="text-blue-500" />
            </div>
          </button>
        </div>

        {/* TO */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-medium text-slate-500 px-2">
            <span>Vers</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div className="text-2xl font-bold text-white">
              {toAmount > 0 ? toAmount.toFixed(4) : "0.0"}
            </div>
            <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors border border-white/10">
              {toAsset.icon("w-6 h-6")}
              <span className="font-bold text-sm">{toAsset.symbol}</span>
              <ChevronDown size={16} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold text-sm mt-4 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
        >
          <Zap size={18} fill="currentColor" />
          Confirmer l'échange
        </button>
      </div>

      {/* Section Historique (comme sur l'image Sidra) */}
      <div className="mt-8 bg-slate-900/20 border border-white/5 rounded-[2rem] p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock size={20} className="text-slate-500" />
          <h2 className="font-bold text-sm">Historique des Swaps</h2>
        </div>
        <div className="py-10 text-center space-y-2">
          <p className="text-slate-600 text-xs font-medium">Aucun historique pour le moment</p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 flex items-center justify-center gap-2 text-slate-600">
        <AlertCircle size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Powered by Elara Protocol</span>
      </div>
    </div>
  );
}
