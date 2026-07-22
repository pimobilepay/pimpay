"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pickaxe, Loader2, Clock, Check, Sparkles, Flame } from "lucide-react";
import { toast } from "sonner";

interface MineStatus {
  balance: number;
  reward: number;
  cooldownMs: number;
  canMine: boolean;
  lastMinedAt: string | null;
  nextMineAt: string | null;
  remainingMs: number;
}

interface PimMinerProps {
  onBalanceChange?: (balance: number) => void;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function PimMiner({ onBalanceChange }: PimMinerProps) {
  const [status, setStatus] = useState<MineStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMining, setIsMining] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [justMined, setJustMined] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/pim/mine", { cache: "no-store" });
      if (res.ok) {
        const data: MineStatus = await res.json();
        setStatus(data);
        setRemaining(data.remainingMs);
        onBalanceChange?.(data.balance);
      }
    } catch (error) {
      console.error("Error fetching mine status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [onBalanceChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Compte a rebours local
  useEffect(() => {
    if (remaining <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1000;
        if (next <= 0 && timerRef.current) {
          clearInterval(timerRef.current);
          // Rafraichit le statut quand le cooldown se termine
          fetchStatus();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remaining, fetchStatus]);

  const handleMine = async () => {
    if (isMining) return;
    setIsMining(true);
    try {
      const res = await fetch("/api/pim/mine", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus(data);
        setRemaining(data.remainingMs);
        onBalanceChange?.(data.balance);
        setJustMined(true);
        setTimeout(() => setJustMined(false), 2500);
        toast.success(`+${data.reward} PIM minés !`, {
          description: "Revenez dans 24h pour la prochaine session.",
        });
      } else if (res.status === 429) {
        setStatus(data);
        setRemaining(data.remainingMs);
        toast.error("Minage indisponible", {
          description: "Le cooldown de 24h n'est pas encore écoulé.",
        });
      } else {
        toast.error(data.error || "Erreur lors du minage");
      }
    } catch (error) {
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setIsMining(false);
    }
  };

  const canMine = status?.canMine ?? false;
  const reward = status?.reward ?? 5;
  const cooldownMs = status?.cooldownMs ?? 24 * 60 * 60 * 1000;
  const progress = canMine ? 100 : Math.min(100, ((cooldownMs - remaining) / cooldownMs) * 100);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-amber-400">
        <Loader2 className="animate-spin mb-3" size={32} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Chargement du minage...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Disque de minage */}
      <div className="relative mb-8 mt-2">
        {/* Anneau de progression */}
        <svg className="w-64 h-64 -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="url(#mineGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 90}
            strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
            className="transition-all duration-1000 ease-linear"
          />
          <defs>
            <linearGradient id="mineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
        </svg>

        {/* Coeur du disque */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`w-40 h-40 rounded-full flex flex-col items-center justify-center border transition-all duration-500 ${
              canMine
                ? "bg-gradient-to-br from-amber-500/25 to-orange-500/15 border-amber-500/40 shadow-[0_0_40px_-8px_rgba(251,191,36,0.5)]"
                : "bg-white/5 border-white/10"
            } ${justMined ? "scale-105" : "scale-100"}`}
          >
            {canMine ? (
              <>
                <Pickaxe
                  className={`text-amber-400 mb-2 ${isMining ? "animate-bounce" : ""}`}
                  size={40}
                />
                <p className="text-3xl font-black text-white leading-none">+{reward}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/80 mt-1">
                  PIM à miner
                </p>
              </>
            ) : (
              <>
                <Clock className="text-slate-400 mb-2" size={32} />
                <p className="text-2xl font-black text-white leading-none tabular-nums">
                  {formatCountdown(remaining)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-1">
                  Prochaine session
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bouton de minage professionnel */}
      <button
        onClick={handleMine}
        disabled={!canMine || isMining}
        className={`group relative w-full max-w-sm overflow-hidden rounded-2xl px-6 py-4 font-bold transition-all duration-300 ${
          canMine && !isMining
            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98]"
            : "cursor-not-allowed bg-white/5 text-slate-500 border border-white/10"
        }`}
      >
        {canMine && !isMining && (
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
        )}
        <span className="relative flex items-center justify-center gap-2.5">
          {isMining ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Minage en cours...
            </>
          ) : justMined ? (
            <>
              <Check size={20} />
              Miné avec succès
            </>
          ) : canMine ? (
            <>
              <Pickaxe size={20} />
              Miner {reward} PIM
            </>
          ) : (
            <>
              <Clock size={20} />
              Disponible dans {formatCountdown(remaining)}
            </>
          )}
        </span>
      </button>

      {/* Infos */}
      <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-800/40 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-lg font-black leading-none text-white">{reward}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">PIM / session</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-800/40 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15">
            <Flame className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="text-lg font-black leading-none text-white">24h</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Intervalle</p>
          </div>
        </div>
      </div>

      <p className="mt-6 max-w-sm text-center text-xs leading-relaxed text-slate-500">
        Minez gratuitement {reward} PIM Coins toutes les 24 heures. Le compteur redémarre à chaque
        session réclamée.
      </p>
    </div>
  );
}
