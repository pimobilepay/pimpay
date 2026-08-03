"use client";

import { useState } from "react";
import Link from "next/link";
import { Gauge, ChevronDown, ShieldAlert, BadgeCheck, ArrowRight } from "lucide-react";
import { useLimits, formatPi, type LimitChannel } from "@/hooks/use-limits";

export interface LimitsBannerProps {
  /** Canal concerne : adapte les plafonds affiches. */
  channel?: LimitChannel;
  className?: string;
}

/**
 * Bandeau compact affichant les plafonds REELLEMENT applicables au compte.
 * Alimente par /api/user/limits (politiques admin incluses) : aucune valeur
 * n'est codee en dur ici. Purement informatif, le serveur reste seul juge.
 */
export function LimitsBanner({ channel, className = "" }: LimitsBannerProps) {
  const { limits, isLoading } = useLimits(channel);
  const [open, setOpen] = useState(false);

  // Pendant le chargement on n'affiche aucun chiffre : mieux vaut un squelette
  // qu'un faux plafond que l'utilisateur pourrait croire exact.
  if (isLoading) {
    return (
      <div
        className={`rounded-2xl bg-slate-900/40 border border-white/5 p-3.5 ${className}`}
        aria-busy="true"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-4 rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-40 rounded bg-white/10 animate-pulse" />
        </div>
        <span className="sr-only">Chargement de vos plafonds</span>
      </div>
    );
  }

  const rows: { label: string; value: string; hint?: string }[] = [
    {
      label: "Sans verification",
      value: formatPi(limits.kycFreeLimitPi),
      hint: "Franchise autorisee avant KYC",
    },
    {
      label: "Avec KYC valide",
      value: formatPi(limits.kycMaxPerTxPi),
      hint: "Plafond par operation",
    },
    {
      label: "Validation admin des",
      value: formatPi(limits.adminApprovalThresholdPi),
      hint: "Au-dela, revue manuelle",
    },
    {
      label: "Volume quotidien",
      value: formatPi(limits.dailyTotalPi),
      hint: "Cumul sur 24 h",
    },
  ];

  if (limits.minPerTxPi !== null && limits.minPerTxPi !== undefined) {
    rows.push({
      label: "Montant minimum",
      value: formatPi(limits.minPerTxPi),
      hint: "Par operation",
    });
  }

  return (
    <div className={`rounded-2xl bg-slate-900/40 border border-white/5 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 p-3.5 text-left active:scale-[0.99] transition-transform"
      >
        <Gauge size={16} className="text-blue-400 shrink-0" />
        <span className="flex-1 text-[10px] font-black uppercase tracking-wider text-slate-300 leading-relaxed">
          Plafond <span className="text-white">{formatPi(limits.maxPerTx)}</span> / operation
          <span className="text-slate-600"> · </span>
          <span className="text-white">{limits.maxPerDay}</span> op/jour
        </span>
        {limits.bypassKyc && (
          <span className="shrink-0 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider text-emerald-400">
            Exception
          </span>
        )}
        <ChevronDown
          size={14}
          className={`text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 flex flex-col gap-2 border-t border-white/5 pt-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-relaxed">
                  {row.label}
                </p>
                {row.hint && <p className="text-[9px] text-slate-600 leading-relaxed">{row.hint}</p>}
              </div>
              <p className="text-xs font-black text-white shrink-0">{row.value}</p>
            </div>
          ))}

          {limits.bypassKyc && (
            <div className="mt-1 flex items-start gap-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-2.5">
              <BadgeCheck size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Une exception administrative est active sur votre compte : le KYC n&apos;est pas requis.
              </p>
            </div>
          )}

          {limits.kycRequired && (
            <Link
              href="/settings/kyc"
              className="mt-1 flex items-center gap-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 p-2.5 active:scale-[0.98] transition-transform"
            >
              <ShieldAlert size={14} className="text-amber-400 shrink-0" />
              <p className="flex-1 text-[10px] text-slate-300 leading-relaxed">
                Verifiez votre identite pour passer a{" "}
                <span className="font-bold text-white">{formatPi(limits.kycMaxPerTxPi)}</span> par
                operation.
              </p>
              <ArrowRight size={13} className="text-amber-400 shrink-0" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
