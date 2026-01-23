"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Share2, Download } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // 1. Déclencher une vibration double (style succès iOS/Android)
    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 30, 100]);
    }

    // 2. Jouer le son de succès premium
    const playSuccessSound = () => {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
      audio.volume = 0.4;
      audio.play().catch(err => console.log("Audio play blocked by browser"));
    };

    playSuccessSound();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col p-6 font-sans">
      <main className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
        
        {/* ANIMATION DU CHECKMARK AVEC ÉCLAT */}
        <div className="relative">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-32 h-32 bg-emerald-500/10 border border-emerald-500/20 rounded-[3rem] flex items-center justify-center relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <CheckCircle2 size={60} className="text-emerald-500" />
            </motion.div>
          </motion.div>
          
          {/* Particules d'éclat en arrière-plan */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.5 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-emerald-500/20 blur-[50px] rounded-full -z-0" 
          />
        </div>

        <div className="space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-black uppercase italic tracking-tighter"
          >
            Paiement Validé
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]"
          >
            Transaction Elara Protocole v1.0
          </motion.p>
        </div>

        {/* RÉSUMÉ CARTE */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-2xl backdrop-blur-md"
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase">Référence</span>
            <span className="text-[10px] font-mono text-blue-400">#PIM-{Math.random().toString(36).substring(7).toUpperCase()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase">Statut</span>
            <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">Finalisé</span>
          </div>
        </motion.div>

        <div className="flex gap-4 w-full">
          <button className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
            <Share2 size={16} className="text-blue-500" /> Partager
          </button>
          <button className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
            <Download size={16} className="text-blue-500" /> Reçu
          </button>
        </div>
      </main>

      <footer className="pb-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full h-16 bg-blue-600 hover:bg-blue-500 rounded-[2rem] flex items-center justify-center gap-3 font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
        >
          Terminer <ArrowRight size={18} />
        </button>
      </footer>
    </div>
  );
}
