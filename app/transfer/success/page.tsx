"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Share2,
  Home,
  ShieldCheck,
  Download,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // RÉCUPÉRATION DYNAMIQUE (Désormais avec Currency)
  const amount = searchParams.get("amount") || "0";
  const name = searchParams.get("name") || "Utilisateur";
  const currency = searchParams.get("currency") || "π"; // Récupère la devise, défaut sur π
  const reference = searchParams.get("ref") || `TX-${Math.random().toString(36).toUpperCase().slice(2, 10)}`;

  const handleShare = async () => {
    const shareText = `PimPay : J'ai envoyé ${amount} ${currency} à ${name}. Réf: ${reference}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Reçu PimPay',
          text: shareText,
        });
      } catch (err) {
        console.log("Erreur de partage");
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Détails copiés dans le presse-papier");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-8 text-center">
      {/* Animation de succès améliorée */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse"></div>
        <div className="relative w-28 h-28 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center animate-in zoom-in duration-700">
          <CheckCircle2 size={56} className="text-emerald-500" />
        </div>
      </div>

      <h2 className="text-1xl font-black uppercase tracking-tighter mb-2 italic">
        Transfert Réussi
      </h2>
      <div className="flex items-center justify-center gap-2 mb-8 opacity-60">
        <ShieldCheck size={14} className="text-emerald-500" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Authentifié par PimPay Protocol</p>
      </div>

      {/* REÇU DÉTAILLÉ */}
      <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[40px] mb-10 w-full max-w-sm relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <CheckCircle2 size={80} />
        </div>

        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Montant de la transaction</p>

        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-5xl font-black tracking-tighter">{amount}</span>
          <span className="text-2xl font-black italic text-blue-500">{currency}</span>
        </div>

        <div className="space-y-4 pt-6 border-t border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-500 uppercase">Bénéficiaire</span>
            <span className="text-xs font-bold text-white uppercase">{name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-500 uppercase">Référence</span>
            <span className="text-[9px] font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">{reference}</span>
          </div>
        </div>
      </div>

      {/* BOUTONS D'ACTION */}
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[28px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
        >
          <Home size={18} /> Retour au Portefeuille
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleShare}
            className="bg-slate-900 border border-white/5 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 text-slate-400 active:scale-95 transition-all"
          >
            <Share2 size={16} /> Partager
          </button>
          <button
            className="bg-slate-900 border border-white/5 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 text-slate-400 active:scale-95 transition-all"
          >
            <Download size={16} /> Reçu
          </button>
        </div>
      </div>

      {/* Explorateur de blocs */}
      <div className="mt-12 flex items-center gap-2 text-slate-600 cursor-pointer hover:text-blue-400 transition-colors">
         <ExternalLink size={12} />
         <p className="text-[9px] font-black uppercase tracking-[0.2em]">Voir sur le Block Explorer</p>
      </div>
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
