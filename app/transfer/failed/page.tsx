"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XCircle, RefreshCcw, AlertTriangle, Home } from "lucide-react";

function FailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Une erreur inconnue est survenue";

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-8 text-center">
      {/* Icone d'échec avec effet de lueur rouge */}
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full"></div>
        <div className="relative w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
          <XCircle size={48} className="text-red-500" />
        </div>
      </div>

      <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 text-red-500 italic">
        Transaction Échouée
      </h1>

      {/* Boîte d'erreur stylisée */}
      <div className="w-full max-w-sm p-6 bg-red-500/5 border border-red-500/10 rounded-[32px] mb-12">
        <p className="text-red-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 justify-center mb-3">
          <AlertTriangle size={14} /> Détails de l'incident
        </p>
        <div className="h-[1px] w-12 bg-red-500/20 mx-auto mb-3"></div>
        <p className="text-slate-300 text-sm font-bold italic px-4 leading-relaxed">
          "{error}"
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* Bouton Réessayer */}
        <button 
          onClick={() => router.back()} 
          className="w-full bg-red-600 hover:bg-red-500 py-6 rounded-[28px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-red-600/20"
        >
          <RefreshCcw size={18} /> Réessayer le transfert
        </button>

        {/* Bouton Quitter */}
        <button 
          onClick={() => router.push("/wallet")} 
          className="w-full bg-slate-900 border border-white/5 py-6 rounded-[28px] font-black uppercase tracking-widest flex items-center justify-center gap-3 text-slate-400 active:scale-95 transition-all"
        >
          <Home size={18} /> Annuler et quitter
        </button>
      </div>

      <p className="mt-12 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">
        Sécurité Pi Network Active
      </p>
    </div>
  );
}

export default function FailedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <FailedContent />
    </Suspense>
  );
}
