"use client";

import { XCircle, RefreshCcw, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaymentFailed() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get("reason") || "Une erreur inconnue est survenue lors de la transaction.";

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-8">
        <XCircle size={48} className="text-red-500" />
      </div>

      <h1 className="text-3xl font-black uppercase italic mb-2 tracking-tighter text-red-500">Paiement Échoué</h1>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-10">La transaction n'a pas pu être traitée</p>

      <div className="w-full max-w-xs bg-red-500/5 border border-red-500/20 rounded-3xl p-6 mb-10">
        <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-300 leading-relaxed">{reason}</p>
      </div>

      <div className="flex flex-col w-full max-w-xs gap-4">
        <button onClick={() => router.back()} className="h-14 bg-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-600/20">
          <RefreshCcw size={16} /> Réessayer
        </button>
        <button onClick={() => router.push("/wallet")} className="h-14 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest">Annuler</button>
      </div>
    </main>
  );
}
