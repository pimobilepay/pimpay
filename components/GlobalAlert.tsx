"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AlertOctagon, Snowflake, Wrench } from "lucide-react";

// -------------------------------------------------------------------------
// TYPES
// -------------------------------------------------------------------------
interface ConfigData {
  maintenanceMode?: boolean;
  maintenanceUntil?: string | null;
  userStatus?: {
    isBanned?: boolean;
    isFrozen?: boolean;
  };
}

interface CountdownData {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  progress: number; // 0 -> 100
  totalMs: number;
  elapsedMs: number;
}

// -------------------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------------------
function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function computeCountdown(startIso: string | null, endIso: string): CountdownData | null {
  const now = Date.now();
  const end = new Date(endIso).getTime();
  const remaining = end - now;

  if (remaining <= 0) return null;

  // Si on a un debut connu on calcule la progression, sinon on met 0%
  const start = startIso ? new Date(startIso).getTime() : now;
  const total = end - start;
  const elapsed = now - start;
  const progress = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;

  const d = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const h = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((remaining % (1000 * 60)) / 1000);

  return { days: d, hours: h, minutes: m, seconds: s, progress, totalMs: total, elapsedMs: elapsed };
}

// -------------------------------------------------------------------------
// COUNTDOWN TIMER DIGIT
// -------------------------------------------------------------------------
function Digit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[68px] h-[72px] bg-[#0a1628] border border-blue-500/10 rounded-2xl flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
        <span className="relative text-3xl font-black text-white font-mono tracking-tighter">{value}</span>
      </div>
      <span className="text-[8px] font-black text-blue-400/60 uppercase tracking-[0.25em] mt-2">{label}</span>
    </div>
  );
}

// -------------------------------------------------------------------------
// PROGRESS BAR
// -------------------------------------------------------------------------
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Progression</span>
        <span className="text-[9px] font-black text-blue-400 font-mono">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-[#0a1628] rounded-full overflow-hidden border border-white/5">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear relative"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// PARTICLES
// -------------------------------------------------------------------------
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-blue-500/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationName: "floatParticle",
            animationDuration: `${4 + Math.random() * 6}s`,
            animationDelay: `${Math.random() * 3}s`,
            animationIterationCount: "infinite",
            animationTimingFunction: "ease-in-out",
          }}
        />
      ))}
    </div>
  );
}

// -------------------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------------------
export default function GlobalAlert() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [countdown, setCountdown] = useState<CountdownData | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [startTime] = useState<string>(new Date().toISOString());
  const abortRef = useRef<AbortController | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const forceLogout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  }, []);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/admin/config", { signal: abortRef.current.signal });
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        setConfig(data);
        if (data.userStatus?.isBanned) forceLogout();
      }
    } catch (err: any) {
      if (err.name !== "AbortError") { /* silently fail */ }
    }
  }, [forceLogout]);

  // Auto-restore: check if maintenance expired
  const checkMaintenanceExpiry = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/maintenance/check");
      if (!res.ok) return;
      const data = await res.json();

      if (data.autoDisabled || !data.maintenanceMode) {
        // Maintenance a ete auto-desactivee ou est off
        setConfig((prev) => prev ? { ...prev, maintenanceMode: false, maintenanceUntil: null } : prev);
        setCountdown(null);
        // Reload pour retirer le cookie et restaurer le systeme
        window.location.reload();
      }
    } catch (_) { /* silently fail */ }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchConfig();
    const interval = setInterval(fetchConfig, 20000);
    return () => {
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchConfig]);

  // Countdown tick
  useEffect(() => {
    if (!config?.maintenanceMode || !config?.maintenanceUntil) {
      setCountdown(null);
      return;
    }

    const tick = () => {
      const cd = computeCountdown(startTime, config.maintenanceUntil!);
      if (!cd) {
        // Maintenance a expire -> auto-restore
        setCountdown(null);
        checkMaintenanceExpiry();
        return;
      }
      setCountdown(cd);
    };

    tick();
    const timer = setInterval(tick, 1000);

    // Auto check expiry toutes les 15s
    checkIntervalRef.current = setInterval(checkMaintenanceExpiry, 15000);

    return () => {
      clearInterval(timer);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [config?.maintenanceMode, config?.maintenanceUntil, startTime, checkMaintenanceExpiry]);

  if (!isMounted || !config) return <div className="hidden" aria-hidden="true" />;

  // ------ ECRAN BANNISSEMENT ------
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

  // ------ ECRAN COMPTE GELE ------
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

  // ------ ECRAN DE MAINTENANCE ------
  if (config.maintenanceMode) {
    const endDate = config.maintenanceUntil ? new Date(config.maintenanceUntil) : null;

    return (
      <div className="fixed inset-0 z-[9999] bg-[#020617] flex items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(30,64,175,0.06)_0%,transparent_50%)]" />
        <Particles />

        <div className="relative w-full max-w-md px-8 flex flex-col items-center gap-10">
          {/* Icon */}
          <div className="relative">
            <div className="w-24 h-24 bg-blue-500/10 border border-blue-500/20 rounded-[2rem] flex items-center justify-center">
              <Wrench size={40} className="text-blue-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 bg-blue-500/20 rounded-[2rem] blur-2xl" />
          </div>

          {/* Title */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white text-balance">
              {"Maintenance en cours"}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto text-pretty">
              {"Nous optimisons nos systemes pour vous offrir une meilleure experience. Merci de votre patience."}
            </p>
          </div>

          {/* Countdown */}
          {countdown ? (
            <div className="flex items-center gap-3">
              {countdown.days > 0 && (
                <>
                  <Digit value={pad(countdown.days)} label="Jours" />
                  <span className="text-xl font-black text-blue-500/30 mt-[-16px]">:</span>
                </>
              )}
              <Digit value={pad(countdown.hours)} label="Heures" />
              <span className="text-xl font-black text-blue-500/30 mt-[-16px]">:</span>
              <Digit value={pad(countdown.minutes)} label="Minutes" />
              <span className="text-xl font-black text-blue-500/30 mt-[-16px]">:</span>
              <Digit value={pad(countdown.seconds)} label="Secondes" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs font-black text-blue-400 uppercase tracking-[0.3em]">
                {"Synchronisation en cours..."}
              </span>
            </div>
          )}

          {/* Progress bar */}
          {countdown && <ProgressBar progress={countdown.progress} />}

          {/* End date info */}
          {endDate && (
            <div className="bg-[#0a1628] border border-white/5 rounded-2xl px-6 py-4 text-center w-full max-w-sm">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                {"Fin prevue"}
              </p>
              <p className="text-sm font-bold text-white font-mono">
                {endDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {" "}
                {endDate.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          {/* Status badge */}
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
              {"Le systeme reprendra automatiquement"}
            </span>
          </div>
        </div>

        <style jsx>{`
          @keyframes floatParticle {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
            50% { transform: translateY(-30px) scale(1.5); opacity: 0.6; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
        `}</style>
      </div>
    );
  }

  return null;
}
