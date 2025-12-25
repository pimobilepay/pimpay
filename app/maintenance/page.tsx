"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { CircleDot, ShieldAlert, Zap, Lock } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center px-6 text-center">
      {/* Glow Effect en arrière-plan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-600/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 space-y-8 max-w-sm">
        {/* Header Logo Style */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <CircleDot size={14} className="text-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[3px]">System Status</span>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter">PIMPAY</h1>
        </div>

        {/* Illustration Card */}
        <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap size={80} />
          </div>
          
          <div className="flex justify-center mb-6">
            <div className="p-5 bg-orange-500/10 rounded-full border border-orange-500/20 text-orange-500">
              <Lock size={40} className="animate-bounce" />
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2 tracking-tight">Maintenance en cours</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Nous optimisons le Ledger Core pour améliorer vos transactions Pi. 
            Le portail client sera de retour sous peu.
          </p>
        </Card>

        {/* Status Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <ShieldAlert size={12} className="text-orange-500" />
            Accès restreint aux administrateurs
          </div>
          
          <div className="pt-6">
            <p className="text-[9px] text-slate-600 font-mono">
              PIMPAY_SYS_v2.0 // STATUS: OPTIMIZING_DATABASE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
