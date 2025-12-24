"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Share2, Home } from "lucide-react";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = searchParams.get("amount");
  const name = searchParams.get("name");

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
        <CheckCircle2 size={50} className="text-emerald-500" />
      </div>
      <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Transfert Réussi</h1>
      <p className="text-slate-400 text-sm font-bold mb-12 max-w-[240px]">
        Vos <span className="text-white">{amount} π</span> ont été envoyés avec succès à <span className="text-white uppercase">{name}</span>.
      </p>

      <div className="w-full space-y-4">
        <button onClick={() => router.push("/wallet")} className="w-full bg-white text-black py-5 rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
          <Home size={18} /> Retour au Dashboard
        </button>
        <button className="w-full bg-slate-900 border border-white/5 py-5 rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-slate-400">
          <Share2 size={18} /> Partager le reçu
        </button>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>;
}
