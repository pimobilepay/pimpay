"use client";

import React, { useState, useEffect } from "react";
import { CircleDot, Zap, Lock, Timer, Shield, Cpu, Database, RefreshCw, Wifi } from "lucide-react";
import Cookies from "js-cookie";

export default function MaintenancePage() {
  const [timeLeft, setTimeLeft] = useState<{ h: string; m: string; s: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState(0);

  const tasks = [
    { label: "Migration Ledger", icon: Database },
    { label: "Sync Nodes Pi", icon: Wifi },
    { label: "Optimisation Core", icon: Cpu },
    { label: "Verification Securite", icon: Shield },
  ];

  useEffect(() => {
    const taskInterval = setInterval(() => {
      setCurrentTask(prev => (prev + 1) % tasks.length);
    }, 3000);
    return () => clearInterval(taskInterval);
  }, [tasks.length]);

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
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({
        h: hours.toString().padStart(2, '0'),
        m: minutes.toString().padStart(2, '0'),
        s: seconds.toString().padStart(2, '0')
      });

      const totalEstimated = 2 * 60 * 60 * 1000; 
      const currentProgress = Math.min(95, 100 - (distance / totalEstimated) * 100);
      setProgress(currentProgress > 0 ? currentProgress : 10);
    };

    const timer = setInterval(updateTimer, 1000);
    updateTimer();

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center px-6 text-center overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3Cpattern%20id%3D%22grid%22%20width%3D%2240%22%20height%3D%2240%22%20patternUnits%3D%22userSpaceOnUse%22%3E%3Cpath%20d%3D%22M%200%2010%20L%2040%2010%20M%2010%200%20L%2010%2040%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.02)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fpattern%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23grid)%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />
      </div>

      <div className="relative z-10 space-y-8 max-w-md w-full">
        {/* Header Logo */}
        <div className="flex flex-col items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
            <CircleDot size={12} className="text-orange-500 animate-pulse" />
            <span className="text-[9px] font-black text-orange-400 uppercase tracking-[3px]">Maintenance Protocol</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            PIM<span className="text-orange-500">PAY</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Core System v3.5</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden backdrop-blur-xl">
          {/* Glow Effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full" />
          
          {/* Icon */}
          <div className="flex justify-center mb-8 relative">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500/30 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-[2rem] border-2 border-orange-500/30 flex items-center justify-center">
                <Lock size={40} className="text-orange-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-900 rounded-xl border border-orange-500/30 flex items-center justify-center">
                <RefreshCw size={14} className="text-orange-400 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
          </div>

          <h2 className="text-xl font-black mb-3 tracking-tight uppercase text-white">
            Maintenance <span className="text-orange-400">Active</span>
          </h2>
          <p className="text-[11px] text-slate-400 leading-relaxed font-medium mb-8 max-w-xs mx-auto">
            Optimisation du Ledger Core et synchronisation des Nodes Pi Network en cours. Le service sera retabli automatiquement.
          </p>

          {/* Current Task Animation */}
          <div className="mb-6 h-12 flex items-center justify-center">
            {tasks.map((task, index) => {
              const Icon = task.icon;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-500 absolute ${
                    currentTask === index 
                      ? 'opacity-100 translate-y-0 bg-orange-500/10 border border-orange-500/20' 
                      : 'opacity-0 translate-y-4'
                  }`}
                >
                  <Icon size={14} className="text-orange-400" />
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">{task.label}</span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="space-y-3 mb-8">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest px-1">
              <span className="text-slate-500">Progression</span>
              <span className="text-orange-400">{Math.floor(progress)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
          </div>

          {/* Countdown */}
          {timeLeft && (
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/5">
              {[
                { label: 'Heures', val: timeLeft.h },
                { label: 'Minutes', val: timeLeft.m },
                { label: 'Secondes', val: timeLeft.s }
              ].map((unit, i) => (
                <div key={i} className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <span className="text-2xl font-black font-mono text-white tracking-tighter block">{unit.val}</span>
                  <span className="text-[7px] font-black uppercase text-slate-500 tracking-[2px]">{unit.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Info */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <div className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900/50 rounded-2xl border border-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <Timer size={12} className="text-orange-500" />
            Reactivation automatique : <span className="text-white ml-1">v3.5.0-STABLE</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/5 rounded-full border border-emerald-500/10">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <p className="text-[8px] text-emerald-400 font-mono uppercase tracking-wide">
                Secure Handshake: OK
              </p>
            </div>
            <p className="text-[8px] text-slate-600 font-mono uppercase tracking-tighter">
              Node_01: SYNCING // Node_02: READY
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-orange-600/5 to-transparent pointer-events-none" />
    </div>
  );
}
