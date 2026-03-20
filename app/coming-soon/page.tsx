"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Rocket, ArrowLeft, Globe, Lock, Loader2, Sparkles, Zap, CircleDot } from "lucide-react";
import Link from "next/link";

// Date cible du lancement
const LAUNCH_DATE = new Date("2026-04-15T00:00:00Z");

function getTimeLeft(target: Date) {
  const now = new Date().getTime();
  const distance = target.getTime() - now;
  if (distance <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((distance % (1000 * 60)) / 1000),
  };
}

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(LAUNCH_DATE));

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(LAUNCH_DATE));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNotify = useCallback(async () => {
    if (!email || !email.includes("@")) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
    setEmail("");
  }, [email]);

  if (!mounted) return null;

  const isLaunched = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center p-4 overflow-hidden font-sans">
      
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[180px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-violet-600/5 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3Cpattern%20id%3D%22grid%22%20width%3D%2260%22%20height%3D%2260%22%20patternUnits%3D%22userSpaceOnUse%22%3E%3Cpath%20d%3D%22M%2060%200%20L%200%200%200%2060%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.02)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fpattern%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23grid)%22%2F%3E%3C%2Fsvg%3E')] opacity-60" />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center">
        
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 mb-8 backdrop-blur-xl">
          <div className="relative">
            <Rocket className="w-4 h-4 text-blue-400" />
            <div className="absolute inset-0 bg-blue-400 blur-md opacity-40" />
          </div>
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Lancement Phase 2</span>
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
        </div>

        {/* Logo */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <CircleDot size={14} className="text-blue-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[4px]">Protocol Elara v3.5</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-4">
            PIM<span className="text-blue-500">PAY</span>
          </h1>
        </div>
        
        <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto mb-12 font-medium leading-relaxed">
          {"Le protocole "}
          <span className="text-white font-bold">Elara</span>
          {" prepare l'integration des actifs mondiaux. Une nouvelle ere de finance decentralisee arrive."}
        </p>

        {/* Countdown */}
        {!isLaunched ? (
          <div className="grid grid-cols-4 gap-2 md:gap-4 mb-12 max-w-lg mx-auto">
            {[
              { label: "Jours", value: timeLeft.days },
              { label: "Heures", value: timeLeft.hours },
              { label: "Min", value: timeLeft.minutes },
              { label: "Sec", value: timeLeft.seconds },
            ].map((item, i) => (
              <div key={i} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-2xl md:text-4xl font-black text-white tabular-nums relative">{item.value.toString().padStart(2, '0')}</div>
                <div className="text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-widest mt-2 relative">{item.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-12 py-8 px-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-3">
              <Zap size={24} className="text-emerald-400" />
              <p className="text-xl font-black text-emerald-400 uppercase tracking-widest">Lancement en cours</p>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-10">
          {[
            { icon: ShieldCheck, label: "Securise" },
            { icon: Globe, label: "Global" },
            { icon: Zap, label: "Rapide" },
          ].map((feature, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2">
              <feature.icon size={18} className="text-blue-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* Email notification */}
        {!submitted ? (
          <div className="p-2 bg-slate-900/60 border border-white/10 backdrop-blur-xl rounded-[1.5rem] max-w-md mx-auto mb-10">
            <div className="flex items-center p-1 gap-2">
              <input 
                type="email" 
                placeholder="votre@email.com"
                className="flex-1 bg-transparent border-none outline-none px-4 text-white text-sm font-medium placeholder:text-slate-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNotify()}
              />
              <Button 
                onClick={handleNotify}
                disabled={submitting || !email}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-6 font-black text-[10px] uppercase tracking-wider h-12 transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : "M'AVERTIR"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem] max-w-md mx-auto mb-10 flex items-center justify-center gap-3">
            <Sparkles size={16} className="text-emerald-400" />
            <p className="text-sm font-bold text-emerald-400">Vous serez notifie au lancement !</p>
          </div>
        )}

        {/* Footer badges */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12">
          {[
            { icon: ShieldCheck, label: "Securite Militaire" },
            { icon: Globe, label: "Global Network" },
            { icon: Lock, label: "Encryption E2E" },
          ].map((badge, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/[0.02] rounded-full border border-white/5">
              <badge.icon className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{badge.label}</span>
            </div>
          ))}
        </div>

        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em] px-6 py-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10">
          <ArrowLeft className="w-3 h-3" /> Retour au Dashboard
        </Link>
      </div>

      {/* Bottom Gradient */}
      <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-blue-600/5 to-transparent pointer-events-none" />
    </div>
  );
}
