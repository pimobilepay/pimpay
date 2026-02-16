"use client";

import React, { useState } from "react";
import {
  Lock,
  Unlock,
  Settings,
  ShieldAlert,
  Zap,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CardActionsProps {
  cardId: string;
  isFrozen: boolean;
}

export default function CardActions({ cardId, isFrozen }: CardActionsProps) {
  const [loading, setLoading] = useState(false);
  const [frozen, setFrozen] = useState(isFrozen);
  const router = useRouter();

  const handleToggleFreeze = async () => {
    if (
      !confirm(
        `Voulez-vous vraiment ${frozen ? "degeler" : "geler"} cette carte ?`
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch("/api/user/card/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          action: frozen ? "unfreeze" : "freeze",
        }),
      });

      if (res.ok) {
        setFrozen(!frozen);
      }
    } catch (error) {
      console.error("Erreur action carte:", error);
    } finally {
      setLoading(false);
      router.refresh();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Bouton Geler / Degeler */}
      <button
        onClick={handleToggleFreeze}
        disabled={loading}
        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
          frozen
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15"
            : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15"
        }`}
      >
        <div
          className={`p-2 rounded-xl ${frozen ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : frozen ? (
            <Unlock size={20} />
          ) : (
            <Lock size={20} />
          )}
        </div>
        <div className="text-left">
          <p className="font-bold text-sm uppercase tracking-tight">
            {frozen ? "Activer la carte" : "Geler la carte"}
          </p>
          <p className="text-[10px] opacity-60">
            {"Securite instantanee"}
          </p>
        </div>
      </button>

      {/* Bouton Limites */}
      <button className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] transition-all">
        <div className="p-2 rounded-xl bg-white/5 text-white/50">
          <Settings size={20} />
        </div>
        <div className="text-left">
          <p className="font-bold text-sm uppercase tracking-tight">
            Plafonds
          </p>
          <p className="text-[10px] opacity-60">
            {"Gerer les limites"}
          </p>
        </div>
      </button>

      {/* Bouton Details */}
      <button className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] transition-all">
        <div className="p-2 rounded-xl bg-white/5 text-white/50">
          <Zap size={20} />
        </div>
        <div className="text-left">
          <p className="font-bold text-sm uppercase tracking-tight">
            {"Details"}
          </p>
          <p className="text-[10px] opacity-60">
            Voir les infos sensibles
          </p>
        </div>
      </button>

      {/* Bouton Signaler */}
      <button className="flex items-center gap-4 p-4 rounded-2xl border border-red-500/15 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-all">
        <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
          <ShieldAlert size={20} />
        </div>
        <div className="text-left">
          <p className="font-bold text-sm uppercase tracking-tight">
            Signaler
          </p>
          <p className="text-[10px] opacity-60">Perte ou vol</p>
        </div>
      </button>
    </div>
  );
}
