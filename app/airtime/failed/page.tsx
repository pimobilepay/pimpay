"use client";

import { motion } from "framer-motion";
import { XCircle, RefreshCcw, MessageSquare, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FailedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col p-6 font-sans">
      <main className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
        {/* ANIMATION DE L'ERREUR */}
        <motion.div 
          initial={{ rotate: -10, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          className="w-32 h-32 bg-red-500/10 border border-red-500/20 rounded-[3rem] flex items-center justify-center relative"
        >
          <XCircle size={60} className="text-red-500" />
          <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full -z-10" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-red-500">Transaction Échouée</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Erreur de communication</p>
        </div>

        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 flex gap-4 items-start text-left">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed tracking-wider">
            Le solde de votre wallet Pi est peut-être insuffisant ou la session de paiement a expiré. Veuillez vérifier votre application Pi Browser.
          </p>
        </div>

        <div className="w-full space-y-3">
          <button 
            onClick={() => router.back()}
            className="w-full h-16 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center gap-3 font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all"
          >
            <RefreshCcw size={18} className="text-blue-500" /> Réessayer
          </button>
          
          <button className="w-full h-14 bg-transparent border border-white/5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[9px] text-slate-500 tracking-widest">
            <MessageSquare size={16} /> Contacter le support
          </button>
        </div>
      </main>

      <footer className="pb-10 pt-4 text-center">
        <button 
          onClick={() => router.push("/dashboard")}
          className="text-[10px] font-black text-slate-500 uppercase tracking-widest underline decoration-blue-500 underline-offset-4"
        >
          Annuler et quitter
        </button>
      </footer>
    </div>
  );
}
