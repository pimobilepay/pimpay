"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Rocket, ArrowLeft, Globe, Lock, Loader2 } from "lucide-react";
import Link from "next/link";

// Date cible du lancement (modifiable par l'admin plus tard)
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
    // Simule l'envoi (a connecter a une vraie API plus tard)
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
    setEmail("");
  }, [email]);

  if (!mounted) return null;

  const isLaunched = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center p-4 overflow-hidden font-sans">
      
      {/* Background effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-2xl text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
          <Rocket className="w-4 h-4 text-blue-500" />
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Lancement Phase 2</span>
        </div>

        <h1 className="text-4xl md:text-8xl font-black text-white italic tracking-tighter mb-4">
          PIMPAY<span className="text-blue-500 not-italic">.</span>
        </h1>
        
        <p className="text-slate-400 text-sm md:text-lg max-w-lg mx-auto mb-12 font-medium leading-relaxed">
          {"Le protocole "}
          <span className="text-white font-bold">Elara</span>
          {" prepare l'integration des actifs mondiaux. Une nouvelle ere de finance decentralisee arrive."}
        </p>

        {/* Countdown */}
        {!isLaunched ? (
          <div className="grid grid-cols-4 gap-2 md:gap-4 mb-16">
            {[
              { label: "Jours", value: timeLeft.days },
              { label: "Heures", value: timeLeft.hours },
              { label: "Min", value: timeLeft.minutes },
              { label: "Sec", value: timeLeft.seconds },
            ].map((item, i) => (
              <div key={i} className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-4 md:p-6 rounded-[24px] md:rounded-[32px]">
                <div className="text-2xl md:text-4xl font-black text-white italic tabular-nums">{item.value.toString().padStart(2, '0')}</div>
                <div className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-16 py-8 px-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px]">
            <p className="text-2xl font-black text-emerald-400 uppercase tracking-widest">Lancement en cours</p>
          </div>
        )}

        {/* Email notification */}
        {!submitted ? (
          <div className="p-2 bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[30px] max-w-md mx-auto mb-10">
            <div className="flex items-center p-1">
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
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-6 font-bold h-12 transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : "M'AVERTIR"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[30px] max-w-md mx-auto mb-10">
            <p className="text-sm font-bold text-emerald-400">Vous serez notifie au lancement !</p>
          </div>
        )}

        {/* Footer badges */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-12 opacity-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Securite Militaire</span>
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

