"use client";

import { useState } from "react";
import { 
  ArrowLeft, Wallet, CreditCard, DollarSign, 
  ChevronRight, Loader2, ShieldCheck, Zap, Delete 
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

export default function MPayCheckout() {
  const router = useRouter();
  const params = useSearchParams();

  // États
  const [step, setStep] = useState(1); // 1: Montant, 2: Méthode
  const [amount, setAmount] = useState(params.get("amount") || "");
  const [selectedMethod, setSelectedMethod] = useState("wallet");
  const [loading, setLoading] = useState(false);

  const receiver = params.get("to") || "Utilisateur PimPay";
  const txid = params.get("txid") || "TX-" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const methods = [
    { id: "wallet", title: "Wallet (Pi)", desc: "Solde interne π", icon: <Zap size={22}/>, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "usd", title: "Solde USD", desc: "Fonds en dollars", icon: <DollarSign size={22}/>, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: "card", title: "Visa PimPay", desc: "Carte virtuelle", icon: <CreditCard size={22}/>, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "external", title: "Pi Browser", desc: "Wallet Externe", icon: <Wallet size={22}/>, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  // Gestion du clavier numérique
  const handleKeyPress = (val: string) => {
    if (val === "delete") {
      setAmount(prev => prev.slice(0, -1));
    } else if (val === ".") {
      if (!amount.includes(".")) setAmount(prev => prev + val);
    } else {
      if (amount.length < 8) setAmount(prev => prev + val);
    }
  };

  // Redirection vers le résumé (Summary) avant le paiement
  const handleGoToSummary = () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error("Montant invalide");
    
    // On encode les paramètres pour la page summary
    const query = new URLSearchParams({
      amount,
      method: selectedMethod,
      to: receiver,
      txid
    }).toString();

    router.push(`/mpay/summary?${query}`);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-hidden">
      <div className="max-w-md mx-auto px-6 pt-12 pb-10 flex flex-col min-h-screen">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => step === 1 ? router.back() : setStep(1)} className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <ArrowLeft size={20} />
          </button>
          <div className="text-right">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">PimPay Terminal</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">{step === 1 ? "Saisie Montant" : "Mode de paiement"}</p>
          </div>
        </div>

        {/* ÉTAPE 1 : CLAVIER NUMÉRIQUE */}
        {step === 1 ? (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-5">
            <div className="text-center mb-10">
               <p className="text-slate-500 text-[11px] font-bold uppercase mb-2 tracking-widest">Montant à envoyer</p>
               <div className="flex items-center justify-center gap-2">
                 <span className="text-6xl font-black italic tracking-tighter">{amount || "0"}</span>
                 <span className="text-2xl font-black text-blue-600 italic">π</span>
               </div>
            </div>

            {/* CLAVIER GRID */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className="h-16 rounded-2xl bg-white/5 border border-white/5 text-xl font-bold hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
                >
                  {key === "delete" ? <Delete size={24} className="text-red-500" /> : key}
                </button>
              ))}
            </div>

            <button
              disabled={!amount || parseFloat(amount) <= 0}
              onClick={() => setStep(2)}
              className="w-full h-16 bg-blue-600 rounded-[22px] font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 disabled:opacity-30 flex items-center justify-center gap-2"
            >
              Suivant <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          /* ÉTAPE 2 : SÉLECTION MÉTHODE */
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-5">
            <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 mb-8 text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total à payer</p>
              <p className="text-3xl font-black">{amount} π</p>
            </div>

            <div className="space-y-3 flex-1">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-[22px] border transition-all ${
                    selectedMethod === m.id ? "bg-blue-600/10 border-blue-500" : "bg-white/[0.03] border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${selectedMethod === m.id ? "bg-blue-600 text-white" : `${m.bg} ${m.color}`}`}>
                      {m.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-tight">{m.title}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{m.desc}</p>
                    </div>
                  </div>
                  {selectedMethod === m.id && <CheckCircle size={18} className="text-blue-500" />}
                </button>
              ))}
            </div>

            <div className="mt-8">
              <button
                onClick={handleGoToSummary}
                className="w-full h-16 bg-blue-600 rounded-[22px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
              >
                Continuer vers le résumé <ChevronRight size={18}/>
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 opacity-30">
          <ShieldCheck size={12} className="text-blue-500" />
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]">PimPay Secure Node V2</p>
        </div>
      </div>
    </main>
  );
}

function CheckCircle({ size, className }: { size: number, className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
