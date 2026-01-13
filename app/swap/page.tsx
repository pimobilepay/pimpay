"use client";

import { useState, useEffect } from "react";
import {
  ArrowDown, Settings2, RefreshCw, Zap, AlertCircle, Loader2, ArrowLeft, Globe, Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PI_CONSENSUS_USD } from "@/lib/exchange";

export default function SwapPage() {
  const router = useRouter();

  // États pour les données utilisateur
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false); // Nouvel état spécifique à la confirmation finale

  // États pour le formulaire
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(0);
  const [selectedFiat, setSelectedFiat] = useState("USD");
  const [isPiToFiat, setIsPiToFiat] = useState(true);

  // États pour le système de Quote
  const [quote, setQuote] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const fiatRates: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    XAF: 600,
    XOF: 600,
    CDF: 2800
  };

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/user/profile", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      } else {
        toast.error("Impossible de charger le profil");
      }
    } catch (err) {
      toast.error("Erreur réseau");
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const getActiveBalance = () => {
    if (!userData) return 0;
    if (isPiToFiat) {
      return parseFloat(userData.balance || "0");
    } else {
      const wallet = userData.wallets?.find((w: any) => w.currency === selectedFiat);
      return wallet ? wallet.balance : 0;
    }
  };

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (quote) {
      setQuote(null);
      toast.info("Taux expiré");
    }
  }, [timeLeft, quote]);

  useEffect(() => {
    const amount = parseFloat(fromAmount);
    if (!isNaN(amount) && amount > 0) {
      const rate = PI_CONSENSUS_USD * (fiatRates[selectedFiat] || 1);
      setToAmount(isPiToFiat ? amount * rate : amount / rate);
    } else {
      setToAmount(0);
    }
    if (quote) setQuote(null);
  }, [fromAmount, selectedFiat, isPiToFiat]);

  const toggleDirection = () => {
    setIsPiToFiat(!isPiToFiat);
    setFromAmount("");
    setToAmount(0);
    setQuote(null);
  };

  // 1. OBTENIR LE DEVIS
  const getQuote = async () => {
    const amount = parseFloat(fromAmount);
    const balance = getActiveBalance();

    if (!amount || amount <= 0) return toast.error("Montant invalide");
    if (amount > balance) return toast.error("Solde insuffisant");

    setIsSwapping(true);
    try {
      const res = await fetch("/api/transaction/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          targetCurrency: isPiToFiat ? selectedFiat : "PI",
          sourceCurrency: isPiToFiat ? "PI" : selectedFiat
        })
      });
      const data = await res.json();

      if (res.ok) {
        setQuote(data);
        setTimeLeft(30);
        toast.success("Taux GCV verrouillé");
      } else {
        toast.error(data.error || "Erreur calcul");
      }
    } catch (e) {
      toast.error("Erreur de connexion");
    } finally {
      setIsSwapping(false);
    }
  };

  // 2. CONFIRMATION FINALE (Effet de chargement ajouté ici)
  const handleConfirmSwap = async () => {
    if (!quote) return;
    setIsConfirming(true); // Active l'effet de chargement spécifique

    try {
      const response = await fetch("/api/transaction/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.quoteId })
      });

      if (response.ok) {
        toast.success("Swap réussi !");
        router.push("/dashboard");
      } else {
        const data = await response.json();
        toast.error(data.error || "Échec du swap");
        setIsConfirming(false); // On rend la main en cas d'erreur
      }
    } catch (error) {
      toast.error("Erreur réseau blockchain");
      setIsConfirming(false);
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
      <div className="flex justify-between items-center mb-10 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter italic">PimPay <span className="text-blue-500">Swap</span></h1>
        <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 border border-white/10">
          <Settings2 size={18} />
        </div>
      </div>

      <div className="mb-6 p-5 bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 rounded-[2.5rem] flex justify-between items-center backdrop-blur-sm">
        <div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Disponible</p>
          <p className="text-xl font-black text-white">
            {getActiveBalance().toLocaleString(undefined, { minimumFractionDigits: isPiToFiat ? 4 : 2 })} 
            <span className="text-blue-500 italic ml-1">{isPiToFiat ? "π" : selectedFiat}</span>
          </p>
        </div>
        <div className="text-right">
          <div className={`text-[8px] px-2 py-1 rounded-md font-black uppercase tracking-widest mb-2 ${userData?.kycStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
            KYC: {userData?.kycStatus || "PENDING"}
          </div>
        </div>
      </div>

      <div className="space-y-2 relative">
        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-6 transition-all focus-within:border-blue-500/30">
          <div className="flex justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vendre</span>
            <button
              disabled={isConfirming}
              onClick={() => setFromAmount(getActiveBalance().toString())}
              className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full"
            >
              MAX
            </button>
          </div>
          <div className="flex justify-between items-center">
            <input
              disabled={isConfirming}
              type="number"
              placeholder="0.00"
              className="bg-transparent text-4xl font-black outline-none w-2/3 placeholder:text-slate-800"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
            />
            <div className="flex items-center gap-2 bg-slate-800 p-2 pr-4 rounded-2xl font-bold">
              {isPiToFiat ? (
                <><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-xs">π</div> PI</>
              ) : (
                <><div className="w-8 h-8 bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center"><Globe size={16} /></div> {selectedFiat}</>
              )}
            </div>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            disabled={isConfirming}
            onClick={toggleDirection}
            className="bg-[#020617] p-2 rounded-3xl border-8 border-[#020617] active:scale-90 transition-transform"
          >
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <ArrowDown size={20} className={isPiToFiat ? "" : "rotate-180 transition-transform"} />
            </div>
          </button>
        </div>

        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-6 pt-12">
          <div className="flex justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recevoir</span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {["USD", "EUR", "XOF", "XAF", "CDF"].map((fiat) => (
                <button
                  key={fiat}
                  disabled={isConfirming}
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
              {toAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: isPiToFiat ? 2 : 4 })}
            </div>
            <div className="flex items-center gap-2 bg-slate-800 p-2 pr-4 rounded-2xl font-bold">
              {!isPiToFiat ? (
                <><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-xs">π</div> PI</>
              ) : (
                <><div className="w-8 h-8 bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center"><Globe size={16} /></div> {selectedFiat}</>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-white/[0.02] rounded-[2.5rem] border border-white/5 space-y-4">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-500">Taux de change</span>
          <span className="text-slate-300">1 π ≈ {(PI_CONSENSUS_USD * (fiatRates[selectedFiat] || 1)).toLocaleString()} {selectedFiat}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-500">Frais de réseau</span>
          <span className="text-blue-500">0.00 {isPiToFiat ? selectedFiat : "PI"}</span>
        </div>
        {quote && (
          <div className="flex justify-between items-center pt-4 border-t border-white/5">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} className="animate-pulse" /> Expire dans
            </span>
            <span className="text-amber-500 font-mono font-bold text-sm">{timeLeft}s</span>
          </div>
        )}
      </div>

      <button
        onClick={quote ? handleConfirmSwap : getQuote}
        disabled={isSwapping || isConfirming || !fromAmount || parseFloat(fromAmount) <= 0}
        className={`w-full mt-8 p-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
          quote ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-blue-600 shadow-blue-600/20'
        }`}
      >
        {isSwapping || isConfirming ? (
          <Loader2 className="animate-spin" />
        ) : quote ? (
          <>Confirmer le Swap <Zap size={18} fill="currentColor" /></>
        ) : (
          "Obtenir un devis"
        )}
      </button>

      <div className="mt-6 flex items-center justify-center gap-2 text-slate-600 text-center">
        <AlertCircle size={12} />
        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Liquidité assurée par PimPay Protocol • GCV Standard</span>
      </div>
    </div>
  );
}
