"use client";

import { XCircle, RefreshCcw, AlertTriangle, Home, MessageCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaymentFailed() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get("reason") || "Une erreur inconnue est survenue lors de la transaction.";

  const errorTips = [
    "Verifiez votre connexion internet",
    "Assurez-vous d'avoir un solde suffisant",
    "Le reseau PimPay peut etre temporairement indisponible",
  ];

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans">
      {/* Ambient red glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-red-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 pt-12 pb-12">
        {/* Header */}
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all mb-8">
          <ArrowLeft size={20} />
        </button>

        {/* Error Icon */}
        <div className="flex flex-col items-center mb-10 animate-in zoom-in-50 duration-700">
          <div className="relative mb-6">
            <div className="absolute -inset-6 bg-red-500/10 rounded-full blur-2xl" />
            <div className="relative w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
              <XCircle size={48} className="text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">Paiement Echoue</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">La transaction a ete rejetee</p>
        </div>

        {/* Error Reason Card */}
        <div className="bg-red-500/5 border border-red-500/15 rounded-[2rem] p-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/10 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Raison de l'echec</p>
              <p className="text-sm font-medium text-slate-300 leading-relaxed">{reason}</p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Solutions possibles</p>
          <div className="space-y-3">
            {errorTips.map((tip, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl">
                <div className="w-6 h-6 bg-blue-600/20 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-black text-blue-400">{i + 1}</span>
                </div>
                <p className="text-xs font-medium text-slate-400">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 animate-in fade-in duration-500 delay-200">
          <button
            onClick={() => router.back()}
            className="w-full bg-blue-600 p-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
          >
            <RefreshCcw size={16} /> Reessayer
          </button>

          <button
            onClick={() => router.push("/mpay")}
            className="w-full bg-white/5 border border-white/10 p-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all"
          >
            <Home size={16} /> Retour a mPay
          </button>

          <button className="w-full bg-white/[0.02] border border-white/5 p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <MessageCircle size={14} /> Contacter le support
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 opacity-30">
          <ShieldAlert size={12} className="text-red-500" />
          <p className="text-[8px] font-bold uppercase tracking-[0.2em]">PimPay Error Handler V2</p>
        </div>
      </div>
    </main>
  );
}
