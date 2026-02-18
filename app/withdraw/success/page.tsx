"use client";

import { CheckCircle2, ArrowRight, ShieldCheck, Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function SuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
          <div className="relative w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 size={48} className="text-emerald-500" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Demande Recue</h2>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[3px]">Traitement en cours</p>
        </div>

        {/* Description */}
        <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto font-bold">
          Votre retrait est en attente de validation par l&apos;administration PimPay. Vous recevrez une notification des que le traitement sera finalise.
        </p>

        {/* Processing time */}
        <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
          <ShieldCheck size={18} className="text-blue-400 flex-shrink-0" />
          <p className="text-[10px] font-bold text-slate-400 text-left">
            Delai estime : <span className="text-white">15 min (Mobile)</span> a <span className="text-white">48h (Banque)</span>
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Tableau de Bord
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => router.push("/withdraw")}
            className="w-full h-14 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all"
          >
            Nouveau retrait
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Activity size={12} />
          <span className="text-[8px] font-black uppercase tracking-widest">PimPay Secure Protocol</span>
        </div>
      </motion.div>
    </div>
  );
}
