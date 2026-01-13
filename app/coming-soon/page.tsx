"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Rocket, Bell, ArrowLeft, Globe, Lock } from "lucide-react";
import Link from "next/link";

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [mounted, setMounted] = useState(false);

  // Compte à rebours fictif (ex: 14 jours)
  const [timeLeft, setTimeLeft] = useState({
    days: 14,
    hours: 8,
    minutes: 45,
    seconds: 0,
  });

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        return { ...prev, seconds: 59, minutes: prev.minutes - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center p-4 overflow-hidden font-sans">
      
      {/* EFFETS DE FOND ANIMÉS */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-2xl text-center">
        
        {/* LOGO & BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8 animate-bounce">
          <Rocket className="w-4 h-4 text-blue-500" />
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Lancement Phase 2</span>
        </div>

        <h1 className="text-2xl md:text-8xl font-black text-white italic tracking-tighter mb-4">
          PIMPAY<span className="text-blue-500 not-italic">.</span>
        </h1>
        
        <p className="text-slate-400 text-sm md:text-lg max-w-lg mx-auto mb-12 font-medium leading-relaxed">
          Le protocole <span className="text-white font-bold">Elara</span> prépare l'intégration des actifs mondiaux. Une nouvelle ère de finance décentralisée arrive.
        </p>

        {/* COMPTE À REBOURS STYLE PIMPAY */}
        <div className="grid grid-cols-4 gap-2 md:gap-4 mb-16">
          {[
            { label: "Jours", value: timeLeft.days },
            { label: "Heures", value: timeLeft.hours },
            { label: "Min", value: timeLeft.minutes },
            { label: "Sec", value: timeLeft.seconds },
          ].map((item, i) => (
            <div key={i} className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-4 md:p-6 rounded-[24px] md:rounded-[32px]">
              <div className="text-2xl md:text-4xl font-black text-white italic">{item.value.toString().padStart(2, '0')}</div>
              <div className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.label}</div>
            </div>
          ))}
        </div>

        {/* SECTION NEWSLETTER / ACCÈS ANTICIPÉ */}
        <Card className="p-2 bg-white/5 border-white/10 backdrop-blur-2xl rounded-[30px] max-w-md mx-auto mb-10">
          <div className="flex items-center p-1">
            <input 
              type="email" 
              placeholder="votre@email.com"
              className="flex-1 bg-transparent border-none outline-none px-4 text-white text-sm font-medium placeholder:text-slate-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-6 font-bold h-12 transition-all">
              M'AVERTIR
            </Button>
          </div>
        </Card>

        {/* FOOTER DES MISSIONS */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-12 opacity-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sécurité Militaire</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Network</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Encryption End-to-End</span>
          </div>
        </div>

        <div className="mt-16">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[11px] font-black uppercase tracking-[0.2em]">
            <ArrowLeft className="w-3 h-3" /> Retour au Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

