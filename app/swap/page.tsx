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

  // Interface pour typer les données utilisateur
  const [user, setUser] = useState<{ balance: number; kycStatus: string } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSwapping, setIsSwapping] = useState(false);

  // États pour le formulaire
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(0);
  const [selectedFiat, setSelectedFiat] = useState("USD");

  // Nouveau : Gestion du sens du swap (Pi -> Fiat ou Fiat -> Pi)
  const [isPiToFiat, setIsPiToFiat] = useState(true);

  // États pour le système de Quote (Verrouillage)
  const [quote, setQuote] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Ajout des devises EUR et XOF
  const fiatRates: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    XAF: 600,
    XOF: 600,
    CDF: 2800
  };

  // 1. Récupération réelle du solde
  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch("/api/user/wallet-info");
        if (res.ok) {
          const data = await res.json();
          setUser({
            balance: data.userData?.balance || 0,
            kycStatus: data.userData?.kycStatus || "PENDING"
          });
        } else {
          toast.error("Impossible de charger le solde");
        }
      } catch (err) {
        toast.error("Erreur de synchronisation réseau");
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
      toast.info("Le taux a expiré, veuillez recalculer.");
    }
  }, [timeLeft, quote]);

  // 3. Calcul de l'estimation visuelle
  useEffect(() => {
    const amount = parseFloat(fromAmount);
    if (!isNaN(amount) && amount > 0) {
      const rate = PI_CONSENSUS_USD * (fiatRates[selectedFiat] || 1);
      if (isPiToFiat) {
        setToAmount(amount * rate);
      } else {
        setToAmount(amount / rate);
      }
    } else {
      setToAmount(0);
    }
    if (quote) setQuote(null);
  }, [fromAmount, selectedFiat, isPiToFiat]);

  // Fonction pour basculer le sens du swap
  const toggleDirection = () => {
    setIsPiToFiat(!isPiToFiat);
    setFromAmount("");
    setToAmount(0);
    setQuote(null);
  };

  // 4. Demander un devis (Quote)
  const getQuote = async () => {
    const amount = parseFloat(fromAmount);
    const balance = user?.balance || 0;

    if (!amount || amount <= 0) return toast.error("Entrez un montant valide");

    if (isPiToFiat && amount > balance) return toast.error("Solde Pi insuffisant");

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
        toast.success("Taux PimPay verrouillé (30s)");
      } else {
        toast.error(data.error || "Erreur lors du calcul");
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
        toast.success("Swap réussi !");
        window.location.href = "/swap";
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

  // LOGIQUE DE CONVERSION DU SOLDE AFFICHÉ
  const displayBalance = () => {
    if (!user) return "0.00";
    if (isPiToFiat) {
      return user.balance.toFixed(4);
    } else {
      // Conversion du solde Pi en devise Fiat sélectionnée pour l'affichage "Disponible"
      const converted = user.balance * PI_CONSENSUS_USD * (fiatRates[selectedFiat] || 1);
      return converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

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

      {/* Affichage du Solde Dynamique */}
      <div className="mb-6 p-5 bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 rounded-[2.5rem] flex justify-between items-center backdrop-blur-sm">
        <div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Disponible</p>
          <p className="text-xl font-black text-white">
            {displayBalance()} <span className="text-blue-500 italic">{isPiToFiat ? "π" : selectedFiat}</span>
          </p>
        </div>
        <div className="text-right">
          <div className={`text-[8px] px-2 py-1 rounded-md font-black uppercase tracking-widest mb-2 ${user?.kycStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
            KYC: {user?.kycStatus || "EN ATTENTE"}
          </div>
        </div>
      </div>

      <div className="space-y-2 relative">
        {/* FROM */}
        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-6 transition-all focus-within:border-blue-500/30">
          <div className="flex justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vendre</span>
            {isPiToFiat && (
              <button
                onClick={() => {
                  const max = (user?.balance || 0) - 0.01;
                  setFromAmount(max > 0 ? max.toFixed(4) : "0");
                }}
                className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full"
              >
                MAX
              </button>
            )}
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
              {isPiToFiat ? (
                <>
                  <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-xs">π</div>
                  PI
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center">
                    <Globe size={16} />
                  </div>
                  {selectedFiat}
                </>
              )}
            </div>
          </div>
        </div>

        {/* INTERCHANGE ICON */}
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={toggleDirection}
            className="bg-[#020617] p-2 rounded-3xl border-8 border-[#020617] active:scale-90 transition-transform"
          >
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <ArrowDown size={20} className={isPiToFiat ? "" : "rotate-180 transition-transform"} />
            </div>
          </button>
        </div>

        {/* TO */}
        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-6 pt-12">
          <div className="flex justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recevoir</span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {["USD", "EUR", "XOF", "XAF", "CDF"].map((fiat) => (
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
              {toAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: isPiToFiat ? 2 : 4 })}
            </div>
            <div className="flex items-center gap-2 bg-slate-800 p-2 pr-4 rounded-2xl font-bold">
              {!isPiToFiat ? (
                <>
                  <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-xs">π</div>
                  PI
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center">
                    <Globe size={16} />
                  </div>
                  {selectedFiat}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DÉTAILS DU DEVIS */}
      <div className="mt-8 p-6 bg-white/[0.02] rounded-[2.5rem] border border-white/5 space-y-4">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-500">Taux de change</span>
          <span className="text-slate-300">1 π ≈ {(PI_CONSENSUS_USD * (fiatRates[selectedFiat] || 1)).toLocaleString()} {selectedFiat}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-500">Frais de réseau</span>
          <span className="text-blue-500">0.01 π</span>
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
        disabled={isSwapping || !fromAmount || parseFloat(fromAmount) <= 0}
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
          "Obtenir un devis"
        )}
      </button>

      <div className="mt-6 flex items-center justify-center gap-2 text-slate-600">
        <AlertCircle size={12} />
        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Liquidité assurée par PimPay Protocol</span>
      </div>
    </div>
  );
}
