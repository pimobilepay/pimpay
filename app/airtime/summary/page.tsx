"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShieldCheck, Smartphone,
  ArrowRight, Info, Loader2, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

function SummaryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Récupération des données de l'URL
  const data = {
    phone: searchParams.get("phone") || "N/A",
    operator: searchParams.get("operator") || "N/A",
    usd: searchParams.get("usd") || "0",
    pi: searchParams.get("pi") || "0",
    local: searchParams.get("local") || "0",
    currency: searchParams.get("currency") || "XAF",
  };

  const handleFinalConfirm = async () => {
    setLoading(true);
    try {
      // 1. Simulation du délai de validation du protocole PimPay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 2. Redirection vers la page Success (qui gérera le son et la vibration)
      toast.success("Protocole validé !");
      router.push("/airtime/success");
      
    } catch (error) {
      toast.error("Échec de la transaction");
      // En cas d'erreur réelle, on redirige vers failed
      router.push("/airtime/failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans p-6 flex flex-col">
      {/* HEADER */}
      <header className="pt-10 pb-8 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">Résumé</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Vérification finale</p>
        </div>
      </header>

      <main className="flex-1 space-y-6">
        {/* CARD PRINCIPALE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck size={100} className="text-blue-500" />
          </div>

          <div className="text-center space-y-2 mb-8">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Montant à payer</p>
            <h2 className="text-4xl font-black italic text-white">π {data.pi}</h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full">
              <span className="text-[10px] font-black text-blue-400">≈ {data.usd} USD</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <Smartphone size={16} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase">Destinataire</span>
              </div>
              <span className="text-xs font-black">{data.phone}</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase">Opérateur</span>
              </div>
              <span className="text-xs font-black text-blue-500 italic">{data.operator}</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <ArrowRight size={16} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase">Crédit Reçu</span>
              </div>
              <span className="text-sm font-black text-emerald-400">{data.local} {data.currency}</span>
            </div>
          </div>
        </motion.div>

        {/* INFO BOX */}
        <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-4 flex gap-3 items-start">
          <Info size={16} className="text-blue-500 mt-0.5" />
          <p className="text-[9px] text-slate-400 font-medium leading-relaxed uppercase tracking-wider">
            La transaction sera traitée instantanément via le protocole sécurisé Elara. Aucun frais supplémentaire n'est appliqué sur le réseau Pi.
          </p>
        </div>
      </main>

      {/* BOUTON D'ACTION */}
      <footer className="pb-10 pt-4">
        <button
          onClick={handleFinalConfirm}
          disabled={loading}
          className="w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-[2rem] flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
        >
          {loading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Validation Blockchain...</span>
            </div>
          ) : (
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Confirmer le paiement</span>
          )}
        </button>
      </footer>
    </div>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    }>
      <SummaryContent />
    </Suspense>
  );
}
