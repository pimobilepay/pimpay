"use client";

import { CheckCircle, Home, Share2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaymentSuccess() {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
        <CheckCircle size={48} className="text-emerald-500" />
      </div>

      <h1 className="text-3xl font-black uppercase italic mb-2 tracking-tighter">Paiement Réussi</h1>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-10">Votre transaction est sur la blockchain</p>

      <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-3xl p-6 mb-10">
        <p className="text-4xl font-black mb-1">{params.get("amount")} π</p>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Envoyé à {params.get("to")}</p>
      </div>

      <div className="flex flex-col w-full max-w-xs gap-4">
        <button onClick={() => router.push("/wallet")} className="h-14 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest">Retour Accueil</button>
        <button className="h-14 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
          <Share2 size={16} /> Partager le reçu
        </button>
      </div>
    </main>
  );
}
