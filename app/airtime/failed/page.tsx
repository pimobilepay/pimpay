"use client";

import { motion } from "framer-motion";
import { XCircle, RefreshCcw, MessageSquare, AlertTriangle, Activity } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FailedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans overflow-x-hidden">
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 space-y-8">
        {/* Error Icon */}
        <motion.div
          initial={{ rotate: -10, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          className="relative"
        >
          <div className="w-28 h-28 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] flex items-center justify-center relative z-10">
            <XCircle size={52} className="text-red-500" />
          </div>
          <div className="absolute inset-0 bg-red-500/15 blur-[40px] rounded-full -z-0" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-red-500">Transaction Echouee</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">Erreur de communication</p>
        </div>

        <div className="bg-red-500/5 border border-red-500/10 rounded-[2rem] p-5 flex gap-4 items-start text-left w-full">
          <div className="p-2 bg-red-500/10 rounded-xl flex-shrink-0">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
            Le solde de votre wallet Pi est peut-etre insuffisant ou la session de paiement a expire. Veuillez verifier votre application.
          </p>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={() => router.push("/airtime")}
            className="w-full p-5 bg-white/[0.03] border border-white/10 rounded-[2rem] flex items-center justify-center gap-3 font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all"
          >
            <RefreshCcw size={18} className="text-blue-500" /> Reessayer
          </button>

          <button className="w-full p-4 bg-transparent border border-white/5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[9px] text-slate-500 tracking-widest">
            <MessageSquare size={14} /> Contacter le support
          </button>
        </div>
      </main>

      <footer className="px-6 pb-10 pt-4 text-center">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-[10px] font-black text-slate-500 uppercase tracking-widest"
        >
          Retourner au dashboard
        </button>
      </footer>

      {/* FOOTER STATUS */}
      <div className="fixed bottom-20 left-0 right-0 px-6 z-40">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 py-3 px-5 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Activity size={14} className="text-red-500" />
            <span className="text-[8px] font-black uppercase tracking-widest">Transaction Failed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-[8px] font-black text-red-500 uppercase">Error</span>
          </div>
        </div>
      </div>
    </div>
  );
}
