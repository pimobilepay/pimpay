"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShieldCheck, Smartphone,
  ArrowRight, Info, Loader2, CheckCircle2,
  Zap, Activity, Globe, Fingerprint
} from "lucide-react";
import { toast } from "sonner";

function SummaryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const data = {
    phone: searchParams.get("phone") || "N/A",
    operator: searchParams.get("operator") || "N/A",
    usd: searchParams.get("usd") || "0",
    pi: searchParams.get("pi") || "0",
    local: searchParams.get("local") || "0",
    currency: searchParams.get("currency") || "XAF",
    country: searchParams.get("country") || "---",
  };

  const handleFinalConfirm = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success("Transaction validee !");
      router.push("/airtime/success");
    } catch {
      toast.error("Echec de la transaction");
      router.push("/airtime/failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col overflow-x-hidden">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">Resume</h1>
          <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase">Verification finale</p>
        </div>
        <div className="p-3 opacity-0"><ArrowLeft size={20} /></div>
      </header>

      <main className="flex-1 px-6 pt-8 pb-32 space-y-6">
        {/* Amount Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-slate-900/60 border border-white/10 rounded-[2rem] p-8 overflow-hidden backdrop-blur-md"
        >
          <div className="absolute top-4 right-4 opacity-5">
            <ShieldCheck size={100} />
          </div>

          <div className="text-center space-y-3 mb-6 relative z-10">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Montant a payer</p>
            <h2 className="text-4xl font-black text-white">Pi {data.pi}</h2>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full">
              <span className="text-[10px] font-black text-blue-400">{data.usd} USD</span>
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            {[
              { icon: Smartphone, label: "Destinataire", value: data.phone },
              { icon: Zap, label: "Operateur", value: data.operator, accent: true },
              { icon: Globe, label: "Pays", value: data.country },
              { icon: ArrowRight, label: "Credit recu", value: `${data.local} ${data.currency}`, success: true },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                    <row.icon size={14} className="text-slate-400" />
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{row.label}</span>
                </div>
                <span className={`text-xs font-black ${row.success ? "text-emerald-400" : row.accent ? "text-blue-400" : "text-white"}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Biometric Prompt */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center py-4 gap-3"
        >
          <div className="p-4 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 animate-bounce">
            <Fingerprint size={28} />
          </div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Confirmez pour continuer</p>
        </motion.div>

        {/* Info */}
        <div className="bg-blue-600/5 border border-blue-500/10 rounded-[2rem] p-5 flex items-start gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
            <Info size={14} className="text-blue-500" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
            La transaction sera traitee instantanement via le protocole securise PimPay. Aucun frais supplementaire.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleFinalConfirm}
          disabled={loading}
          className="w-full p-5 bg-blue-600 disabled:bg-slate-800 rounded-[2rem] flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span className="text-[11px] font-black uppercase tracking-[0.15em]">Validation en cours...</span>
            </>
          ) : (
            <span className="text-[11px] font-black uppercase tracking-[0.15em]">Confirmer le paiement</span>
          )}
        </button>
      </main>

      {/* FOOTER STATUS */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-40">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 py-3 px-5 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Activity size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest">PimPay Secure</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[8px] font-black text-emerald-500 uppercase">Active</span>
          </div>
        </div>
      </div>
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
