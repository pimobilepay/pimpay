"use client";

import { useEffect, useState, useRef } from "react";
import { AlertOctagon, Hammer, Timer, Snowflake, ShieldAlert } from "lucide-react";

export default function GlobalAlert() {
  const [config, setConfig] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<{ h: string; m: string; s: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- LOGIQUE DE DÉCONNEXION FORCÉE ---
  const forceLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  };

  // --- CALCUL DU COMPTE À REBOURS ---
  useEffect(() => {
    if (!config?.maintenanceUntil || !config?.maintenanceMode) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(config.maintenanceUntil).getTime() - now;

      if (distance < 0) {
        setTimeLeft(null);
        clearInterval(timer);
        return;
      }

      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({
        h: h.toString().padStart(2, "0"),
        m: m.toString().padStart(2, "0"),
        s: s.toString().padStart(2, "0"),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [config]);

  // --- SURVEILLANCE CONFIGURATION ---
  useEffect(() => {
    setIsMounted(true);

    const checkConfig = async () => {
      // Annuler la requête précédente si elle est encore en cours
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch("/api/admin/config", { 
          signal: abortControllerRef.current.signal 
        });
        if (!res.ok) return;
        const data = await res.json();
        
        if (data) {
          setConfig(data);
          if (data.userStatus?.isBanned) forceLogout();
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Silently fail - config API may not be available
        }
      }
    };

    checkConfig();
    const interval = setInterval(checkConfig, 20000);
    
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Empêche les erreurs de "removeChild" en ne rendant rien côté serveur
  if (!isMounted || !config) return <div className="hidden" aria-hidden="true" />;

  // 1. ÉCRAN DE BANNISSEMENT (CRITICAL)
  if (config.userStatus?.isBanned) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#02040a] flex items-center justify-center p-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)]" />
        <div className="relative max-w-md space-y-6 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-red-600/10 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <AlertOctagon size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Accès Révoqué</h1>
            <div className="h-px w-12 bg-red-500/50 mx-auto" />
          </div>
          <p className="text-slate-400 font-medium leading-relaxed">
            Votre compte a été définitivement suspendu pour violation des protocoles de sécurité PimPay.
          </p>
        </div>
      </div>
    );
  }

  // 2. ÉCRAN DE COMPTE GELÉ (FREEZE)
  if (config.userStatus?.isFrozen) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] w-[calc(100%-3rem)] max-w-sm">
        <div className="bg-blue-950/40 backdrop-blur-2xl border border-blue-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-2xl animate-in slide-in-from-bottom duration-700">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
            <Snowflake size={24} className="animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Statut: Compte Gelé</h4>
            <p className="text-[11px] text-slate-300 leading-tight">Vos actifs sont sécurisés mais les transferts sont temporairement restreints.</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. ÉCRAN DE MAINTENANCE AVEC COMPTE À REBOURS
  if (config.maintenanceMode) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#02040a] flex items-center justify-center p-8 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)]" />
        <div className="relative max-w-md w-full space-y-12">
          <div className="space-y-4">
            <div className="relative inline-block">
              <Hammer size={48} className="text-blue-500 animate-bounce" />
              <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Maintenance</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] max-w-xs mx-auto">
              Optimisation GCV Core Ledger v1.0.4
            </p>
          </div>

          {/* Widget Compte à rebours High-Tech */}
          {timeLeft ? (
            <div className="flex justify-center items-center gap-4">
              {[
                { label: "HRS", val: timeLeft.h },
                { label: "MIN", val: timeLeft.m },
                { label: "SEC", val: timeLeft.s },
              ].map((t, i) => (
                <div key={i} className="flex flex-col items-center bg-[#0b1120] border border-white/5 rounded-2xl p-4 min-w-[80px] shadow-xl">
                  <div className="text-3xl font-black text-white font-mono tracking-tighter">{t.val}</div>
                  <div className="text-[8px] uppercase font-black text-blue-500 tracking-[0.3em] mt-1">{t.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 text-blue-500 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Synchronisation Finale...
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
