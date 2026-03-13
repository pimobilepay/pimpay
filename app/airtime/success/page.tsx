"use client";

import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle2, ArrowRight, Share2, Receipt, Copy, Wallet, 
  Smartphone, Zap, Globe, Calendar, Clock, Lock, Loader2 
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showReceipt, setShowReceipt] = useState(false);

  // Recuperation des donnees depuis l'URL
  const ref = searchParams.get("ref") || `PIM-AIR-${Date.now().toString(36).toUpperCase()}`;
  const phone = searchParams.get("phone") || "N/A";
  const operator = searchParams.get("operator") || "N/A";
  const usd = searchParams.get("usd") || "0";
  const pi = searchParams.get("pi") || "0";
  const local = searchParams.get("local") || "0";
  const currency = searchParams.get("currency") || "XAF";
  const country = searchParams.get("country") || "---";

  const transactionDate = new Date();
  const formattedDate = transactionDate.toLocaleDateString('fr-FR', { 
    day: '2-digit', month: 'short', year: 'numeric' 
  });
  const formattedTime = transactionDate.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', minute: '2-digit' 
  });

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 30, 100]);
    }
  }, []);

  const copyRef = () => {
    navigator.clipboard.writeText(ref);
    toast.success("Reference copiee !");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'PimPay Airtime',
        text: `Recharge ${operator} de ${local} ${currency} pour ${phone} effectuee avec succes !`
      });
    } else {
      copyRef();
    }
  };

  // Modal Recu detaille
  if (showReceipt) {
    return (
      <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
        {/* Header */}
        <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
          <button
            onClick={() => setShowReceipt(false)}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
          >
            <ArrowRight size={20} className="rotate-180" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black uppercase tracking-tight">Recu</h1>
            <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase">Details transaction</p>
          </div>
          <button onClick={copyRef} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
            <Copy size={20} />
          </button>
        </header>

        <main className="px-6 py-8 space-y-6 pb-32">
          {/* Statut */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center border border-emerald-500/20 mx-auto">
              <CheckCircle2 className="text-emerald-500" size={32} />
            </div>
            <div>
              <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-400/10 px-4 py-2 rounded-full border border-emerald-400/20">
                Transaction Reussie
              </span>
            </div>
          </div>

          {/* Montant principal */}
          <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 text-center backdrop-blur-md">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Montant paye</p>
            <h2 className="text-4xl font-black text-white">{pi} <span className="text-xl text-blue-500">Pi</span></h2>
            <p className="text-[11px] text-emerald-500/80 mt-2 font-black uppercase tracking-widest">
              ≈ {usd} USD
            </p>
          </div>

          {/* Details de la transaction */}
          <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-md">
            <div className="p-4 border-b border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Details de la recharge</p>
            </div>
            
            {[
              { icon: Smartphone, label: "Numero", value: phone },
              { icon: Zap, label: "Operateur", value: operator, accent: true },
              { icon: Globe, label: "Pays", value: country },
              { icon: ArrowRight, label: "Credit recu", value: `${local} ${currency}`, success: true },
              { icon: Calendar, label: "Date", value: formattedDate },
              { icon: Clock, label: "Heure", value: formattedTime },
            ].map((row, i) => (
              <div key={i} className="p-4 flex items-center justify-between border-b border-white/5 last:border-0">
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

          {/* Reference */}
          <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-5 flex items-center justify-between backdrop-blur-md">
            <div className="text-left">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Reference</p>
              <p className="text-sm font-mono font-bold text-white/90">{ref}</p>
            </div>
            <button onClick={copyRef} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 active:scale-90 transition-all">
              <Copy size={18} className="text-blue-400" />
            </button>
          </div>

          {/* Statut detaille */}
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Statut: Complete</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
              La recharge a ete effectuee avec succes. Le credit a ete ajoute au numero {phone}.
            </p>
          </div>
        </main>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 px-6 py-6 bg-[#020617]/95 backdrop-blur-xl border-t border-white/5">
          <div className="grid grid-cols-5 gap-3">
            <Link href="/dashboard" className="col-span-4">
              <button className="w-full h-14 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.15em] flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20">
                <Wallet size={18} /> Retour au Wallet
              </button>
            </Link>
            <button
              onClick={handleShare}
              className="col-span-1 h-14 bg-white/5 border border-white/10 text-white rounded-[2rem] flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans overflow-x-hidden relative">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 space-y-6 relative z-10">

        {/* Animated Checkmark */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <CheckCircle2 size={48} className="text-emerald-500" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h1 className="text-2xl font-black uppercase tracking-tighter">Recharge Reussie</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">Airtime envoye avec succes</p>
        </motion.div>

        {/* Montant */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black text-white tracking-tighter">{pi}</span>
            <span className="text-xl font-bold text-blue-500">Pi</span>
          </div>
          <p className="text-[11px] text-emerald-500/80 font-black uppercase tracking-widest bg-emerald-500/5 py-1 px-3 rounded-full border border-emerald-500/10 inline-block">
            ≈ {usd} USD
          </p>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md"
        >
          <div className="p-4 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-2">
              <Smartphone size={14} className="text-slate-400" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Destinataire</span>
            </div>
            <span className="text-xs font-black text-white">{phone}</span>
          </div>
          <div className="p-4 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-slate-400" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Operateur</span>
            </div>
            <span className="text-xs font-black text-blue-400">{operator}</span>
          </div>
          <div className="p-4 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-2">
              <ArrowRight size={14} className="text-slate-400" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Credit recu</span>
            </div>
            <span className="text-xs font-black text-emerald-400">{local} {currency}</span>
          </div>
          <div className="p-4 flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Statut</span>
            <span className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">Complete</span>
          </div>
        </motion.div>

        {/* Reference */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] p-4 flex items-center justify-between backdrop-blur-md"
        >
          <div className="text-left">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Reference</p>
            <p className="text-sm font-mono font-bold text-white/90">{ref}</p>
          </div>
          <button onClick={copyRef} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 active:scale-90 transition-all">
            <Copy size={18} className="text-blue-400" />
          </button>
        </motion.div>

        {/* Bouton Recu */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          onClick={() => setShowReceipt(true)}
          className="w-full h-14 bg-white text-[#020617] rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-between px-6 hover:bg-slate-100 active:scale-[0.97] transition-all"
        >
          <div className="flex items-center gap-3"><Receipt size={18} /><span>Voir le recu detaille</span></div>
          <ArrowRight size={18} />
        </motion.button>
      </main>

      <footer className="px-6 pb-8 relative z-10">
        <div className="grid grid-cols-5 gap-3">
          <Link href="/dashboard" className="col-span-4">
            <button className="w-full h-14 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.15em] flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all">
              <Wallet size={18} /> Retour au Wallet
            </button>
          </Link>
          <button
            onClick={handleShare}
            className="col-span-1 h-14 bg-white/5 border border-white/10 text-white rounded-[2rem] flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <Share2 size={18} />
          </button>
        </div>
      </footer>

      {/* Footer encrypted */}
      <div className="flex flex-col items-center gap-2 opacity-20 pb-6">
        <div className="flex items-center gap-2">
          <Lock size={12} />
          <span className="text-[9px] font-black uppercase tracking-[0.4em]">Encrypted Ledger</span>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
