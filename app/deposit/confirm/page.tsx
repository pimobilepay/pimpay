"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, Smartphone, Lock, Wifi, AlertCircle } from "lucide-react";

export default function DepositConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "TRX-" + Math.random().toString(36).substring(7).toUpperCase();
  
  const [dots, setDots] = useState("");
  const [timerCount, setTimerCount] = useState(60); // Compte à rebours de 60s pour le PIN

  // Animation des points de suspension
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Compte à rebours visuel
  useEffect(() => {
    if (timerCount <= 0) return;
    const timer = setInterval(() => {
      setTimerCount(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timerCount]);

  useEffect(() => {
    // Simulation du délai de réponse de l'opérateur (Orange/MTN/Airtel)
    // On laisse 10 secondes pour que l'utilisateur ait le temps de voir le message
    const processTimeout = setTimeout(() => {
      const isSuccess = Math.random() > 0.1; // 90% de succès

      if (isSuccess) {
        router.push(`/deposit/success?ref=${ref}`);
      } else {
        router.push(`/deposit/fail?ref=${ref}`);
      }
    }, 10000); 

    return () => clearTimeout(processTimeout);
  }, [router, ref]);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-between py-12 px-8 text-center font-sans">
      
      {/* Header - État de la connexion */}
      <div className="w-full flex justify-between items-center max-w-md">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Opérateur Connecté</span>
        </div>
        <div className="text-slate-500 text-[10px] font-mono">
          REF: {ref}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center w-full max-w-sm">
        <div className="relative mb-10">
          {/* Cercles d'ondes animés */}
          <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping scale-[1.8] opacity-10" />
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse scale-125 opacity-20" />

          <div className="relative w-40 h-40 bg-gradient-to-br from-blue-600/10 to-transparent rounded-full flex items-center justify-center border border-white/5 shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] backdrop-blur-sm">
            <div className="relative">
               <Smartphone className="text-white opacity-90" size={64} strokeWidth={1.5} />
               {/* Overlay Lock Icon */}
               <div className="absolute -top-4 -right-6 w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl border-2 border-[#020617] rotate-12 animate-bounce">
                 <Lock className="text-white" size={24} />
               </div>
            </div>
          </div>

          {/* Orbiting Loader */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#020617] px-5 py-2 border border-blue-500/30 rounded-2xl shadow-2xl flex items-center gap-3">
            <Loader2 className="text-blue-500 animate-spin" size={20} />
            <span className="text-blue-500 font-black text-xs">{timerCount}s</span>
          </div>
        </div>

        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">
          Validation<br/><span className="text-blue-500">En cours</span>
        </h1>

        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4 backdrop-blur-sm">
          <p className="text-slate-200 text-sm font-bold uppercase tracking-wide">
            Tapez votre code secret
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed font-medium uppercase tracking-wider">
            Un message de votre opérateur est apparu sur votre écran. Entrez votre <span className="text-white font-black">CODE PIN</span> pour confirmer le dépôt de fonds{dots}
          </p>
        </div>

        {/* Aide rapide */}
        <div className="mt-6 flex items-center gap-2 text-amber-500/80 bg-amber-500/5 px-4 py-2 rounded-lg border border-amber-500/10">
          <AlertCircle size={14} />
          <span className="text-[9px] font-bold uppercase">Ne quittez pas cette page</span>
        </div>
      </div>

      {/* Footer Security */}
      <div className="flex flex-col items-center gap-6 w-full max-w-xs">
        <div className="flex items-center gap-4 px-6 py-4 bg-white/[0.02] rounded-3xl border border-white/5 w-full">
          <div className="p-3 bg-blue-500/10 rounded-2xl">
            <ShieldCheck size={24} className="text-blue-500" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">PimPay Gateway</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Sécurisé par protocole bancaire</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.5em]">
            Traitement sécurisé
          </p>
          <div className="h-1 w-32 bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 animate-[loading_10s_ease-in-out]" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
