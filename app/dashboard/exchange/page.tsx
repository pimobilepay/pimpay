"use client";

import { useState, useEffect } from "react";
import { ArrowDownUp, RefreshCcw, Info } from "lucide-react";
import { toast } from "sonner";
// Vérifie bien que ces noms existent dans ton fichier lib/exchange.ts
import { PI_CONSENSUS_USD } from "@/lib/exchange"; 
import { BottomNav } from "@/components/bottom-nav";

export default function ExchangePage() {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"PI_TO_USD" | "USD_TO_PI">("PI_TO_USD");
  const [loading, setLoading] = useState(false);

  // Correction de la sécurité sur le taux : 
  // On utilise une valeur de secours (fallback) pour éviter le crash si l'import est undefined
  const rate = PI_CONSENSUS_USD || 314159;

  // Empêcher l'erreur d'hydratation côté client/serveur
  useEffect(() => {
    setMounted(true);
  }, []);

  const result = mode === "PI_TO_USD" 
    ? Number(amount) * rate 
    : Number(amount) / rate;

  const handleSwap = () => {
    setMode(prev => prev === "PI_TO_USD" ? "USD_TO_PI" : "PI_TO_USD");
    setAmount("");
  };

  const handleConfirmExchange = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("pimpay_token");
      const res = await fetch("/api/exchange/confirm", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(amount),
          mode: mode
        })
      });

      if (res.ok) {
        toast.success("Conversion réussie ! Portefeuille mis à jour.");
        setAmount("");
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Erreur lors de l'échange");
      }
    } catch (error) {
      toast.error("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  // Ne rien afficher tant que le composant n'est pas monté (évite les erreurs de rendu)
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-32">
      <div className="max-w-md mx-auto space-y-6 pt-10">

        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">Exchange</h1>
            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Protocol GCV 314159</p>
          </div>
          <div className="bg-slate-900 p-2 rounded-full text-slate-400">
            <Info size={16} />
          </div>
        </header>

        <div className="bg-slate-900/50 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-2xl backdrop-blur-sm">
          {/* SOURCE */}
          <div className="bg-black/40 p-5 rounded-3xl border border-white/5 group focus-within:border-blue-500/50 transition-all">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Vendre</p>
            <div className="flex justify-between items-center">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-transparent text-3xl font-black outline-none w-2/3 placeholder:text-slate-800"
              />
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full">
                <span className="font-black text-sm">{mode === "PI_TO_USD" ? "PI" : "USD"}</span>
              </div>
            </div>
          </div>

          {/* BOUTON SWAP */}
          <div className="flex justify-center -my-8 relative z-10">
            <button
              onClick={handleSwap}
              className="bg-blue-600 p-4 rounded-2xl border-[6px] border-[#020617] hover:scale-110 active:scale-95 transition-all shadow-xl shadow-blue-600/20"
            >
              <ArrowDownUp size={24} className="text-white" />
            </button>
          </div>

          {/* DESTINATION */}
          <div className="bg-black/40 p-5 rounded-3xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Recevoir (Estimation)</p>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-black text-emerald-400 truncate">
                {amount ? result.toLocaleString(undefined, { maximumFractionDigits: mode === "PI_TO_USD" ? 2 : 7 }) : "0.00"}
              </span>
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full">
                <span className="font-black text-sm">{mode === "PI_TO_USD" ? "USD" : "PI"}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-3 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <RefreshCcw size={12} className="text-blue-500" />
              {/* Utilisation sécurisée de rate.toLocaleString() */}
              <span>1 PI = {rate ? rate.toLocaleString() : "314,159"} USD</span>
            </div>
            <span className="text-blue-500 font-bold underline cursor-pointer">Détails</span>
          </div>

          <button
            onClick={handleConfirmExchange}
            disabled={loading}
            className="w-full py-5 bg-blue-600 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 disabled:bg-slate-800 disabled:text-slate-500"
          >
            {loading ? "Traitement en cours..." : "Confirmer la conversion"}
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-600 px-6">
          En convertissant vos actifs, vous acceptez les conditions du protocole de liquidité PIMPAY.
        </p>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
