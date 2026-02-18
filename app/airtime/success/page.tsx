"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Share2, Download, Activity } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();
  const [refId] = useState(() => `PIM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 30, 100]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans overflow-x-hidden">
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 space-y-8">

        {/* Animated Checkmark */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-28 h-28 bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] flex items-center justify-center relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <CheckCircle2 size={52} className="text-emerald-500" />
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.5 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-emerald-500/20 blur-[50px] rounded-full -z-0"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h1 className="text-2xl font-black uppercase tracking-tighter">Paiement Valide</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">Transaction PimPay Protocol</p>
        </motion.div>

        {/* Receipt Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md"
        >
          <div className="p-5 flex justify-between items-center border-b border-white/5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Reference</span>
            <span className="text-[10px] font-mono text-blue-400">#{refId}</span>
          </div>
          <div className="p-5 flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Statut</span>
            <span className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">Finalise</span>
          </div>
        </motion.div>

        <div className="flex gap-3 w-full">
          <button className="flex-1 p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">
            <Share2 size={14} className="text-blue-500" /> Partager
          </button>
          <button className="flex-1 p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">
            <Download size={14} className="text-blue-500" /> Recu
          </button>
        </div>
      </main>

      <footer className="px-6 pb-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full p-5 bg-blue-600 rounded-[2rem] flex items-center justify-center gap-3 font-black uppercase text-[11px] tracking-[0.15em] shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
        >
          Terminer <ArrowRight size={18} />
        </button>
      </footer>

      {/* FOOTER STATUS */}
      <div className="fixed bottom-24 left-0 right-0 px-6 z-40">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 py-3 px-5 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Activity size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest">Transaction Complete</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[8px] font-black text-emerald-500 uppercase">OK</span>
          </div>
        </div>
      </div>
    </div>
  );
}
