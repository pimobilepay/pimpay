"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Share2, Home, ArrowRight } from "lucide-react";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Récupération des données de l'URL
  const amount = searchParams.get("amount") || "0";
  const name = searchParams.get("name") || "Utilisateur";

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-8 text-center">
      {/* Animation de succès */}
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse"></div>
        <div className="relative w-28 h-28 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
          <CheckCircle2 size={56} className="text-emerald-500" />
        </div>
      </div>

      <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 italic">
        Transfert Réussi
      </h1>
      
      <div className="bg-white/5 border border-white/5 p-6 rounded-[32px] mb-12 w-full max-w-sm">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
          Confirmation d'envoi
        </p>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-3xl font-black">{amount}</span>
          <span className="text-xl font-black italic text-blue-500">π</span>
        </div>
        <p className="text-slate-300 text-xs font-bold uppercase">
          Envoyés à <span className="text-blue-400">{name}</span>
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* CORRECTION : Redirection vers le dashboard Wallet */}
        <button 
          onClick={() => router.push("/wallet")} 
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[28px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
        >
          <Home size={18} /> Retour au Dashboard
        </button>

        <button 
          className="w-full bg-slate-900 border border-white/5 py-6 rounded-[28px] font-black uppercase tracking-widest flex items-center justify-center gap-3 text-slate-400 active:scale-95 transition-all"
        >
          <Share2 size={18} /> Partager le reçu
        </button>
      </div>

      {/* Petit détail de design en bas */}
      <p className="mt-12 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">
        Pi Network Digital Wallet
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
