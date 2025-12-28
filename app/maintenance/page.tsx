"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CircleDot, ShieldAlert, Zap, Lock, Timer } from "lucide-react";
import Cookies from "js-cookie"; // Assure-toi d'avoir js-cookie installé

export default function MaintenancePage() {
  const [timeLeft, setTimeLeft] = useState<{ h: string; m: string; s: string } | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const maintenanceUntil = Cookies.get("maintenance_until");
    
    if (!maintenanceUntil) return;

    const targetDate = new Date(maintenanceUntil).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance <= 0) {
        setTimeLeft({ h: "00", m: "00", s: "00" });
        setProgress(100);
        // Optionnel : window.location.reload() si tu veux forcer le retour
        return;
      }

      // Calcul du temps
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({
        h: hours.toString().padStart(2, '0'),
        m: minutes.toString().padStart(2, '0'),
        s: seconds.toString().padStart(2, '0')
      });

      // Calcul de la barre de progression (simulation de complétion basée sur le temps restant)
      // On part du principe qu'une maintenance dure en moyenne 2h pour le calcul visuel
      const totalEstimated = 2 * 60 * 60 * 1000; 
      const currentProgress = Math.min(95, 100 - (distance / totalEstimated) * 100);
      setProgress(currentProgress > 0 ? currentProgress : 10);
    };

    const timer = setInterval(updateTimer, 1000);
    updateTimer();

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Glow Effect en arrière-plan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 space-y-8 max-w-sm w-full">
        {/* Header Logo Style */}
        <div className="flex flex-col items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-2">
            <CircleDot size={14} className="text-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[3px]">System Protocol</span>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter">PIMPAY<span className="text-blue-500">CORE</span></h1>
        </div>

        {/* Illustration Card */}
        <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap size={80} />
          </div>

          <div className="flex justify-center mb-6">
            <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
                <div className="relative p-6 bg-orange-500/10 rounded-full border border-orange-500/20 text-orange-500">
                  <Lock size={32} className="animate-pulse" />
                </div>
            </div>
          </div>

          <h2 className="text-xl font-black mb-3 tracking-tight uppercase">Maintenance Active</h2>
          <p className="text-[11px] text-slate-400 leading-relaxed font-medium mb-8">
            Optimisation du Ledger Core et synchronisation des Nodes Pi Network en cours.
          </p>

          {/* BARRE DE PROGRESSION FINTECH */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">
                <span>Migration Ledger</span>
                <span className="text-blue-400">{Math.floor(progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden p-[1px] border border-white/5">
                <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
          </div>

          {/* COMPTE À REBOURS */}
          {timeLeft && (
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
                {[
                    { label: 'Heures', val: timeLeft.h },
                    { label: 'Minutes', val: timeLeft.m },
                    { label: 'Secondes', val: timeLeft.s }
                ].map((unit, i) => (
                    <div key={i} className="flex flex-col">
                        <span className="text-2xl font-black font-mono text-white tracking-tighter">{unit.val}</span>
                        <span className="text-[7px] font-black uppercase text-slate-500 tracking-[1px]">{unit.label}</span>
                    </div>
                ))}
            </div>
          )}
        </Card>

        {/* Status Info */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <Timer size={12} className="text-blue-500" />
            Réactivation automatique : <span className="text-white ml-1">v3.5.0-STABLE</span>
          </div>

          <div className="flex flex-col items-center gap-1 opacity-40">
            <div className="flex items-center gap-2">
                 <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                 <p className="text-[8px] text-slate-500 font-mono uppercase tracking-tighter">
                    Secure Handshake: OK // Node_01: SYNCING
                 </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
