"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Zap, Info, ChevronRight, Loader2, Fingerprint, Landmark } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PaymentSummary() {
  const router = useRouter();
  const params = useSearchParams();
  const [isConfirming, setIsConfirming] = useState(false);

  const data = {
    amount: params.get("amount") || "0",
    to: params.get("to") || "Utilisateur PimPay",
    method: params.get("method") || "wallet",
    txid: params.get("txid") || "N/A"
  };

  const methodLabels: Record<string, string> = {
    wallet: "Pi Wallet",
    usd: "Solde USD",
    card: "Visa PimPay",
    external: "Pi Browser"
  };

  const handleFinalConfirm = async () => {
    setIsConfirming(true);
    try {
      const res = await fetch("/api/mpay/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (result.success) {
        router.push(`/mpay/success?txid=${data.txid}&amount=${data.amount}&to=${data.to}`);
      } else {
        router.push(`/mpay/failed?reason=${result.message}`);
      }
    } catch {
      router.push(`/mpay/failed?reason=Erreur de connexion serveur`);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[50%] h-[30%] bg-blue-600/8 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 pt-12 pb-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Confirmation</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Derniere verification</p>
          </div>
          <div className="w-11" />
        </header>

        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          <div className="h-1 flex-1 rounded-full bg-blue-600" />
          <div className="h-1 flex-1 rounded-full bg-blue-600" />
          <div className="h-1 flex-1 rounded-full bg-blue-600 animate-pulse" />
        </div>

        {/* Amount Card */}
        <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 mb-6 text-center relative overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Zap size={80} />
          </div>

          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Zap size={28} className="text-blue-500" />
          </div>

          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Montant a envoyer</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black tracking-tighter">{data.amount}</span>
            <span className="text-xl font-black text-blue-500">Pi</span>
          </div>
        </div>

        {/* Details Card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Destinataire</span>
            <span className="text-xs font-black uppercase">{data.to}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mode</span>
            <span className="text-xs font-black uppercase text-blue-400">{methodLabels[data.method] || data.method}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Frais Reseau</span>
            <span className="text-xs font-black uppercase text-emerald-400">0.01 Pi</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/[0.03] rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Debite</span>
            <span className="text-sm font-black uppercase">{(parseFloat(data.amount) + 0.01).toFixed(2)} Pi</span>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-blue-600/5 border border-blue-500/20 p-4 rounded-2xl flex gap-3 mb-8 animate-in fade-in duration-500 delay-200">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
            En confirmant, vous autorisez PimPay a debiter votre solde immediatement. Cette action est irreversible.
          </p>
        </div>

        {/* Biometric hint */}
        <div className="flex flex-col items-center gap-3 mb-8 animate-in fade-in duration-500 delay-300">
          <div className="p-4 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 animate-bounce">
            <Fingerprint size={28} />
          </div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Signature biometrique requise</p>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleFinalConfirm}
          disabled={isConfirming}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 shadow-xl shadow-blue-600/30 disabled:opacity-50 active:scale-95 transition-all"
        >
          {isConfirming ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />}
          {isConfirming ? "Traitement en cours..." : "Confirmer & Payer"}
        </button>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 opacity-30">
          <Landmark size={12} className="text-blue-500" />
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]">PimPay mPay Protocol V2</p>
        </div>
      </div>
    </main>
  );
}
