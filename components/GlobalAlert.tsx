"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { AlertOctagon, Snowflake, Shield, Cpu, Activity, Lock, Zap, Radio, CircleDot } from "lucide-react";

export default function GlobalAlert() {
  const [config, setConfig] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<{ d: string; h: string; m: string; s: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [maintenanceExpired, setMaintenanceExpired] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // --- LOGIQUE DE DECONNEXION FORCEE ---
  const forceLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  };

  // --- AUTO-RESUME: Desactiver la maintenance quand le temps expire ---
  const autoResumeMaintenance = useCallback(async () => {
    if (isResuming) return;
    setIsResuming(true);
    try {
      // Use the AUTO_RESUME action which checks server-side if the time has passed
      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "AUTO_RESUME" }),
      });
      // Reload the page after a short delay to show the resume animation
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch {
      // If the auto-resume API call fails, just reload to get fresh config
      setTimeout(() => {
        setIsResuming(false);
        window.location.reload();
      }, 5000);
    }
  }, [isResuming]);

  // --- CALCUL DU COMPTE A REBOURS ET PROGRESSION ---
  useEffect(() => {
    if (!config?.maintenanceMode) return;

    const hasEndTime = !!config?.maintenanceUntil;

    if (!hasEndTime) {
      // Maintenance sans heure de fin - afficher un etat indefini
      setTimeLeft(null);
      setProgress(0);
      return;
    }

    const targetDate = new Date(config.maintenanceUntil).getTime();

    // Calculer le temps total de maintenance pour la barre de progression
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const distance = targetDate - now;

      if (distance <= 0) {
        setTimeLeft({ d: "00", h: "00", m: "00", s: "00" });
        setProgress(100);
        setMaintenanceExpired(true);
        clearInterval(timer);
        // AUTO-RESUME: Desactiver automatiquement la maintenance
        autoResumeMaintenance();
        return;
      }

      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({
        d: d.toString().padStart(2, "0"),
        h: h.toString().padStart(2, "0"),
        m: m.toString().padStart(2, "0"),
        s: s.toString().padStart(2, "0"),
      });

      // Calcul de la barre de progression basee sur le temps total
      const totalDuration = targetDate - (startTimeRef.current || now);
      const elapsed = now - (startTimeRef.current || now);
      const currentProgress = Math.min(99, Math.max(1, (elapsed / totalDuration) * 100));
      setProgress(currentProgress);
    }, 1000);

    return () => clearInterval(timer);
  }, [config, autoResumeMaintenance]);

  // --- SURVEILLANCE CONFIGURATION ---
  useEffect(() => {
    setIsMounted(true);

    const checkConfig = async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch("/api/admin/config", {
          signal: abortControllerRef.current.signal,
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data) {
          setConfig(data);
          if (data.userStatus?.isBanned) forceLogout();
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          // Silently fail
        }
      }
    };

    checkConfig();
    const interval = setInterval(checkConfig, 15000);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Format date d'expiration pour affichage
  const formattedEndDate = useMemo(() => {
    if (!config?.maintenanceUntil) return null;
    const d = new Date(config.maintenanceUntil);
    return d.toLocaleString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [config?.maintenanceUntil]);

  if (!isMounted || !config) return <div className="hidden" aria-hidden="true" />;

  // 1. ECRAN DE BANNISSEMENT
  if (config.userStatus?.isBanned) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[#02040a] flex items-center justify-center p-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)]" />
        <div className="relative max-w-md space-y-6 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-red-600/10 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <AlertOctagon size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">{"Acces Revoque"}</h1>
            <div className="h-px w-12 bg-red-500/50 mx-auto" />
          </div>
          <p className="text-slate-400 font-medium leading-relaxed">
            {"Votre compte a ete definitivement suspendu pour violation des protocoles de securite PimPay."}
          </p>
        </div>
      </div>
    );
  }

  // 2. ECRAN DE COMPTE GELE
  if (config.userStatus?.isFrozen) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] w-[calc(100%-3rem)] max-w-sm">
        <div className="bg-blue-950/40 backdrop-blur-2xl border border-blue-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-2xl animate-in slide-in-from-bottom duration-700">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
            <Snowflake size={24} className="animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">{"Statut: Compte Gele"}</h4>
            <p className="text-[11px] text-slate-300 leading-tight">{"Vos actifs sont securises mais les transferts sont temporairement restreints."}</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. ECRAN DE MAINTENANCE FINTECH WEB3
  // Les admins peuvent naviguer librement pendant la maintenance
  if (config.maintenanceMode && !config.isAdmin) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#020617] flex items-center justify-center overflow-hidden">
        {/* Animated background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/[0.04] rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/[0.03] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/[0.02] rounded-full blur-[120px]" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          {/* Scan line */}
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-pulse" style={{ top: "30%" }} />
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-pulse" style={{ top: "70%", animationDelay: "2s" }} />
        </div>

        <div className="relative z-10 w-full max-w-lg mx-auto px-6 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-6 duration-700">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CircleDot size={10} className="text-blue-500 animate-pulse" />
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-[4px]">System Protocol</span>
              <CircleDot size={10} className="text-blue-500 animate-pulse" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-white">
              PIMPAY<span className="text-blue-500">CORE</span>
            </h1>
          </div>

          {/* Main Card */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-700 delay-150 shadow-2xl shadow-blue-900/10">
            {/* Status badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <div className="absolute inset-0 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                </div>
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-[2px]">Maintenance Active</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] rounded-full border border-white/[0.06]">
                <Shield size={10} className="text-blue-500" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Secured</span>
              </div>
            </div>

            {/* Lock Icon */}
            <div className="flex justify-center py-2">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full scale-150" />
                <div className="relative p-5 bg-gradient-to-b from-blue-500/10 to-blue-600/5 rounded-[1.5rem] border border-blue-500/20">
                  <Lock size={32} className="text-blue-400" />
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-lg font-black uppercase tracking-tight text-white">{"Mise a jour du systeme"}</h2>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium max-w-xs mx-auto">
                {"Optimisation du Ledger Core, synchronisation des nodes Pi Network et renforcement de la securite blockchain."}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-0.5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[2px]">Progression</span>
                <span className="text-[10px] font-black text-blue-400 font-mono">{Math.floor(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/[0.04]">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #1d4ed8, #3b82f6, #06b6d4)",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" style={{ animationName: "shimmer" }} />
                </div>
              </div>
              {/* Sub-processes */}
              <div className="flex gap-4 pt-1">
                {[
                  { label: "Ledger Sync", done: progress > 30 },
                  { label: "Node Update", done: progress > 60 },
                  { label: "Security", done: progress > 90 },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${step.done ? "bg-emerald-500" : "bg-slate-700"}`} />
                    <span className={`text-[7px] font-black uppercase tracking-wider transition-colors duration-500 ${step.done ? "text-emerald-400" : "text-slate-600"}`}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Countdown Timer */}
            {timeLeft ? (
              <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[2px] text-center">
                  {"Temps restant avant reactivation"}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Jours", val: timeLeft.d },
                    { label: "Heures", val: timeLeft.h },
                    { label: "Minutes", val: timeLeft.m },
                    { label: "Secondes", val: timeLeft.s },
                  ].map((unit, i) => (
                    <div key={i} className="flex flex-col items-center bg-slate-950/60 border border-white/[0.04] rounded-xl py-3 px-2">
                      <span className="text-xl md:text-2xl font-black font-mono text-white tracking-tighter leading-none">
                        {unit.val}
                      </span>
                      <span className="text-[6px] font-black uppercase text-slate-500 tracking-[1.5px] mt-1.5">{unit.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : maintenanceExpired || isResuming ? (
              <div className="pt-4 border-t border-white/[0.04] text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[2px]">
                    {"Reactivation en cours..."}
                  </span>
                </div>
                <div className="h-1 w-32 mx-auto bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: "100%" }} />
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-white/[0.04] text-center">
                <div className="flex items-center justify-center gap-2 animate-pulse">
                  <Activity size={12} className="text-blue-500" />
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-[2px]">
                    {"Maintenance en cours..."}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Expiration date */}
          {formattedEndDate && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-white/[0.03] rounded-full border border-white/[0.05]">
                <Cpu size={12} className="text-blue-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  {"Fin estimee : "}
                </span>
                <span className="text-[9px] font-black text-white uppercase tracking-wider">
                  {formattedEndDate}
                </span>
              </div>
            </div>
          )}

          {/* Bottom status indicators */}
          <div className="flex flex-col items-center gap-3 animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-4">
              {[
                { label: "Nodes", icon: <Radio size={10} />, status: "SYNC" },
                { label: "Ledger", icon: <Zap size={10} />, status: "OK" },
                { label: "Network", icon: <Activity size={10} />, status: "LIVE" },
              ].map((node, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-blue-500/60">{node.icon}</span>
                  <span className="text-[7px] font-mono font-bold text-slate-600 uppercase">
                    {node.label}:{node.status}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[8px] font-mono text-slate-700 uppercase tracking-wider">
              {"PimPay Blockchain Protocol v4.0 // Reactivation automatique"}
            </p>
          </div>
        </div>

        {/* CSS animation for shimmer */}
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
