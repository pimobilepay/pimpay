"use client";

import { useState } from "react";
import {
  ArrowLeft, Wallet, CreditCard, DollarSign,
  ChevronRight, Loader2, ShieldCheck, Zap, Delete,
  CheckCircle2, Landmark
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function MPayCheckout() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(params.get("amount") || "");
  const [selectedMethod, setSelectedMethod] = useState("wallet");
  const [loading, setLoading] = useState(false);

  const receiver = params.get("to") || "Utilisateur PimPay";
  const txid = params.get("txid") || "TX-" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const methods = [
    { id: "wallet", title: "Wallet Pi", desc: "Solde interne PimPay", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10", activeBg: "bg-amber-600" },
    { id: "usd", title: "Solde USD", desc: "Fonds en dollars", icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10", activeBg: "bg-emerald-600" },
    { id: "card", title: "Visa PimPay", desc: "Carte virtuelle", icon: CreditCard, color: "text-blue-500", bg: "bg-blue-500/10", activeBg: "bg-blue-600" },
    { id: "external", title: "Pi Browser", desc: "Wallet externe", icon: Wallet, color: "text-indigo-500", bg: "bg-indigo-500/10", activeBg: "bg-indigo-600" },
  ];

  const handleKeyPress = (val: string) => {
    if (val === "delete") {
      setAmount(prev => prev.slice(0, -1));
    } else if (val === ".") {
      if (!amount.includes(".")) setAmount(prev => prev + val);
    } else {
      if (amount.length < 8) setAmount(prev => prev + val);
    }
  };

  const handleGoToSummary = () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error("Montant invalide");
    const query = new URLSearchParams({ amount, method: selectedMethod, to: receiver, txid }).toString();
    router.push(`/mpay/summary?${query}`);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-hidden">
      <div className="max-w-md mx-auto px-6 pt-12 pb-10 flex flex-col min-h-screen">

        {/* HEADER */}
        <header className="flex items-center justify-between mb-8">
          <button onClick={() => step === 1 ? router.back() : setStep(1)} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">PimPay Terminal</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">{step === 1 ? "Saisie Montant" : "Mode de paiement"}</p>
          </div>
          <div className="w-11" />
        </header>

        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          <div className={`h-1 flex-1 rounded-full transition-all ${step >= 1 ? "bg-blue-600" : "bg-white/10"}`} />
          <div className={`h-1 flex-1 rounded-full transition-all ${step >= 2 ? "bg-blue-600" : "bg-white/10"}`} />
        </div>

        {/* STEP 1: NUMERIC KEYPAD */}
        {step === 1 ? (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-5 duration-500">
            {/* Receiver badge */}
            <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-2xl mb-6 self-center">
              <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                <Zap size={14} className="text-blue-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{receiver}</span>
            </div>

            <div className="text-center mb-8">
              <p className="text-slate-500 text-[10px] font-bold uppercase mb-3 tracking-widest">Montant a envoyer</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-6xl font-black tracking-tighter">{amount || "0"}</span>
                <span className="text-2xl font-black text-blue-600">Pi</span>
              </div>
            </div>

            {/* NUMPAD */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className="h-16 rounded-2xl bg-white/[0.04] border border-white/5 text-xl font-bold hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
                >
                  {key === "delete" ? <Delete size={22} className="text-red-500" /> : key}
                </button>
              ))}
            </div>

            <button
              disabled={!amount || parseFloat(amount) <= 0}
              onClick={() => setStep(2)}
              className="w-full h-16 bg-blue-600 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 disabled:opacity-30 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              Suivant <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          /* STEP 2: SELECT METHOD */
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-5 duration-500">
            <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 mb-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Zap size={60} />
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest">Total a payer</p>
              <p className="text-4xl font-black tracking-tight">{amount} <span className="text-blue-500">Pi</span></p>
              <p className="text-[9px] font-bold text-slate-600 mt-2 uppercase">{"Vers: " + receiver}</p>
            </div>

            <div className="space-y-3 flex-1">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all active:scale-[0.98] ${
                    selectedMethod === m.id ? "bg-blue-600/10 border-blue-500/50" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-all ${selectedMethod === m.id ? `${m.activeBg} text-white` : `${m.bg} ${m.color}`}`}>
                      <m.icon size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-tight">{m.title}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{m.desc}</p>
                    </div>
                  </div>
                  {selectedMethod === m.id && <CheckCircle2 size={18} className="text-blue-500" />}
                </button>
              ))}
            </div>

            <div className="mt-8">
              <button
                onClick={handleGoToSummary}
                className="w-full h-16 bg-blue-600 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
              >
                Continuer <ChevronRight size={18} />
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
