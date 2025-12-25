"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XCircle, RefreshCcw, AlertTriangle } from "lucide-react";

function FailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Une erreur inconnue est survenue";

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-8">
        <XCircle size={44} className="text-red-500" />
      </div>
      <h1 className="text-2xl font-black uppercase tracking-tighter mb-4 text-red-500">Transaction Échouée</h1>
      <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl mb-12">
        <p className="text-red-400 text-[10px] font-black uppercase flex items-center gap-2 justify-center mb-2">
          <AlertTriangle size={12} /> Erreur Signalée
        </p>
        <p className="text-slate-300 text-sm font-bold italic">"{error}"</p>
      </div>

      <div className="w-full space-y-4">
        <button onClick={() => router.back()} className="w-full bg-red-600 py-5 rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
          <RefreshCcw size={18} /> Réessayer
        </button>
        <button onClick={() => router.push("/wallet")} className="w-full py-4 font-black uppercase text-[10px] text-slate-500 tracking-[0.3em]">
          Annuler et quitter
        </button>
      </div>
    </div>
  );
}

export default function FailedPage() {
  return <Suspense><FailedContent /></Suspense>;
}
