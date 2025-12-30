"use client";

import { useState, useEffect } from "react";
import { 
  ArrowDown, Settings2, RefreshCw, 
  ChevronDown, Zap, AlertCircle, Loader2, ArrowLeft, Globe
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PI_CONSENSUS_USD } from "@/lib/exchange";

export default function SwapPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSwapping, setIsSwapping] = useState(false);
  
  // États pour le formulaire
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(0);
  const [selectedFiat, setSelectedFiat] = useState("USD");

  // Taux de conversion simulés pour les devises locales
  const fiatRates: any = {
    USD: 1,
    XAF: 600,
    CDF: 2800
  };

  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        toast.error("Erreur de synchronisation");
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchUserData();
  }, []);

  useEffect(() => {
    const amount = parseFloat(fromAmount);
    if (!isNaN(amount) && amount > 0) {
      // Calcul : Montant Pi * GCV * Taux Fiat
      setToAmount(amount * PI_CONSENSUS_USD * fiatRates[selectedFiat]);
    } else {
      setToAmount(0);
    }
  }, [fromAmount, selectedFiat]);

  const handleMax = () => {
    if (user?.balance) setFromAmount(user.balance.toString());
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 p-6 font-sans">
      {/* Navigation & Header */}
      <div className="flex justify-between items-center mb-2 pt-4">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl border border-white/10">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter">Pi Protocol Swap</h1>
        <button className="p-2 bg-white/5 rounded-xl border border-white/10 text-slate-400">
          <Settings2 size={20} />
        </button>
      </div>
      <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">
        Échangez vos Pi Network Assets instantanément
      </p>

      {/* Affichage du Solde Réel */}
      <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex justify-between items-center">
        <div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Solde Total Disponible</p>
          <p className="text-lg font-black text-blue-400">{user?.balance?.toLocaleString() || "0.00"} π</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Valeur GCV</p>
          <p className="text-xs font-mono font-bold text-emerald-400">≈ ${(user?.balance * PI_CONSENSUS_USD).toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-2 relative">
        {/* SECTION DE DÉPART (PI) */}
        <div className="bg-slate-900/40 border border-white/10 rounded-[32px] p-6">
          <div className="flex justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase">Depuis</span>
            <button onClick={handleMax} className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md">MAX</button>
          </div>
          <div className="flex justify-between items-center">
            <input 
              type="number" 
              placeholder="0.00"
              className="bg-transparent text-3xl font-black outline-none w-1/2"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
            />
            <div className="bg-blue-600 px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm">
              <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px]">π</span>
              PI
            </div>
          </div>
        </div>

        {/* SWITCH ICON */}
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-[#020617] p-2 rounded-2xl border-4 border-[#020617]">
            <div className="bg-slate-800 p-2 rounded-xl text-blue-400">
              <ArrowDown size={18} />
            </div>
          </div>
        </div>

        {/* SECTION D'ARRIVÉE (FIAT/USD/CDF/XAF) */}
        <div className="bg-slate-900/40 border border-white/10 rounded-[32px] p-6 pt-10">
          <div className="flex justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase">Vers (Estimation)</span>
            <div className="flex gap-2">
                {["USD", "XAF", "CDF"].map((fiat) => (
                    <button 
                      key={fiat}
                      onClick={() => setSelectedFiat(fiat)}
                      className={`text-[9px] font-black px-2 py-1 rounded-md border ${selectedFiat === fiat ? 'bg-blue-600 border-blue-600' : 'border-white/10 text-slate-500'}`}
                    >
                        {fiat}
                    </button>
                ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-3xl font-black text-slate-200">
              {toAmount > 0 ? toAmount.toLocaleString() : "0.00"}
            </div>
            <div className="bg-slate-800 px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm">
              <Globe size={16} className="text-emerald-500" />
              {selectedFiat}
            </div>
          </div>
        </div>
      </div>

      {/* RECAPITULATIF */}
      <div className="mt-8 p-6 bg-white/5 rounded-[32px] border border-white/5 space-y-4">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-500">Taux de change</span>
          <span className="text-blue-400">1 π = {PI_CONSENSUS_USD.toLocaleString()} USD</span>
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-500">Frais de réseau</span>
          <span className="text-emerald-400">0.01 π</span>
        </div>
      </div>

      <button 
        onClick={() => {
            setIsSwapping(true);
            setTimeout(() => { setIsSwapping(false); toast.success("Swap validé !"); router.push("/dashboard"); }, 2000);
        }}
        disabled={isSwapping || !fromAmount}
        className="w-full mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {isSwapping ? <RefreshCw className="animate-spin" /> : <Zap size={20} />}
        {isSwapping ? "Synchronisation..." : "Confirmer le Swap"}
      </button>
    </div>
  );
}
