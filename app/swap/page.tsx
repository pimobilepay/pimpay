"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowDown, Settings2, RefreshCw, Zap, AlertCircle, Loader2, ArrowLeft, Globe, Clock
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

  // États pour le système de Quote (Verrouillage)
  const [quote, setQuote] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const fiatRates: any = { USD: 1, XAF: 600, CDF: 2800 };

  // 1. Récupération du solde
  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch("/api/user/wallet-info");
        if (res.ok) {
          const data = await res.json();
          setUser({
            balance: data.userData.balance,
            kycStatus: data.userData.kycStatus
          });
        }
      } catch (err) {
        toast.error("Erreur de synchronisation");
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchUserData();
  }, []);

  // 2. Timer pour l'expiration du devis
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (quote) {
      setQuote(null);
      toast.info("Le taux a expiré, veuillez rafraîchir.");
    }
  }, [timeLeft, quote]);

  // 3. Calcul de l'estimation visuelle
  useEffect(() => {
    const amount = parseFloat(fromAmount);
    if (!isNaN(amount) && amount > 0) {
      const result = amount * PI_CONSENSUS_USD * fiatRates[selectedFiat];
      setToAmount(result);
    } else {
      setToAmount(0);
    }
    if (quote) setQuote(null); // Reset le devis si le montant change
  }, [fromAmount, selectedFiat]);

  // 4. Demander un devis (Quote)
  const getQuote = async () => {
    const amount = parseFloat(fromAmount);
    if (!amount || amount <= 0) return toast.error("Montant invalide");
    if (amount > (user?.balance || 0)) return toast.error("Solde insuffisant");

    setIsSwapping(true);
    try {
      const res = await fetch("/api/transaction/swap/quote", {
        method: "POST",
        body: JSON.stringify({ amount, targetCurrency: selectedFiat })
      });
      const data = await res.json();
      if (res.ok) {
        setQuote(data);
        setTimeLeft(30);
        toast.success("Taux verrouillé pour 30s");
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error("Erreur de connexion au moteur de swap");
    } finally {
      setIsSwapping(false);
    }
  };

  // 5. Exécution finale du Swap
  const handleConfirmSwap = async () => {
    if (!quote) return;
    setIsSwapping(true);

    try {
      const response = await fetch("/api/transaction/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.quoteId })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Swap Pi/Fiat réussi !");
        router.push("/wallet");
      } else {
        toast.error(data.error || "Le swap a échoué");
      }
    } catch (error) {
      toast.error("Erreur réseau blockchain");
    } finally {
      setIsSwapping(false);
      setQuote(null);
    }
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
      {/* Header */}
      <div className="flex justify-between items-center mb-10 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter italic">PimPay <span className="text-blue-500">Swap</span></h1>
        <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 border border-white/10">
          <Settings2 size={18} />
        </div>
      </div>

      {/* Wallet Info */}
      <div className="mb-6 p-5 bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 rounded-[2.5rem] flex justify-between items-center backdrop-blur-sm">
        <div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Disponible</p>
          <p className="text-xl font-black text-white">{user?.balance?.toFixed(4) || "0.0000"} <span className="text-blue-500 italic">π</span></p>
        </div>
        <div className="text-right">
          <div className={`text-[8px] px-2 py-1 rounded-md font-black uppercase tracking-widest mb-2 ${user?.kycStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
            KYC: {user?.kycStatus || "NON VERIFIÉ"}
          </div>
        </div>
      </div>

      <div className="space-y-2 relative">
        {/* FROM (PI) */}
        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-6 transition-all focus-within:border-blue-500/30">
          <div className="flex justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vendre</span>
            <button onClick={() => setFromAmount((user?.balance - 0.01).toString())} className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">MAX</button>
          </div>
          <div className="flex justify-between items-center">
            <input
              type="number"
              placeholder="0.00"
              className="bg-transparent text-4xl font-black outline-none w-2/3 placeholder:text-slate-800"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
            />
            <div className="flex items-center gap-2 bg-slate-800 p-2 pr-4 rounded-2xl font-bold">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-xs">π</div>
              PI
            </div>
          </div>
        </div>

        {/* INTERCHANGE ICON */}
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-[#020617] p-2 rounded-3xl border-8 border-[#020617]">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <ArrowDown size={20} />
            </div>
          </div>
        </div>

        {/* TO (FIAT) */}
        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-6 pt-12">
          <div className="flex justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recevoir</span>
            <div className="flex gap-1.5">
              {["USD", "XAF", "CDF"].map((fiat) => (
                <button
                  key={fiat}
                  onClick={() => setSelectedFiat(fiat)}
                  className={`text-[8px] font-black px-3 py-1 rounded-full border transition-all ${selectedFiat === fiat ? 'bg-white text-black border-white' : 'border-white/10 text-slate-500'}`}
                >
                  {fiat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className={`text-4xl font-black ${toAmount > 0 ? 'text-white' : 'text-slate-800'}`}>
              {toAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 bg-slate-800 p-2 pr-4 rounded-2xl font-bold">
              <div className="w-8 h-8 bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center">
                <Globe size={16} />
              </div>
              {selectedFiat}
            </div>
          </div>
        </div>
      </div>

      {/* DÉTAILS DU DEVIS */}
      <div className="mt-8 p-6 bg-white/[0.02] rounded-[2.5rem] border border-white/5 space-y-4">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-500">Taux de change</span>
          <span className="text-slate-300">1 π ≈ {PI_CONSENSUS_USD.toLocaleString()} USD</span>
        </div>
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-500">Frais (Network)</span>
          <span className="text-blue-500">0.01 π</span>
        </div>
        {quote && (
          <div className="flex justify-between items-center pt-4 border-t border-white/5 animate-pulse">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} /> Expire dans
            </span>
            <span className="text-amber-500 font-mono font-bold text-sm">{timeLeft}s</span>
          </div>
        )}
      </div>

      <button
        onClick={quote ? handleConfirmSwap : getQuote}
        disabled={isSwapping || !fromAmount}
        className={`w-full mt-8 p-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
          quote 
            ? 'bg-emerald-600 shadow-emerald-600/20 active:scale-95' 
            : 'bg-blue-600 shadow-blue-600/20 active:scale-95'
        }`}
      >
        {isSwapping ? (
          <RefreshCw className="animate-spin" />
        ) : quote ? (
          <>Confirmer le Swap <Zap size={18} fill="currentColor" /></>
        ) : (
          "Calculer le taux"
        )}
      </button>

      <div className="mt-6 flex items-center justify-center gap-2 text-slate-600">
        <AlertCircle size={12} />
        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Liquidité assurée par PimPay Protocol</span>
      </div>
    </div>
  );
}
