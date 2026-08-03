"use client";

import { ShieldCheck, ShieldX, Clock, Ticket, CalendarClock, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type KycDecisionStatus = "APPROVED" | "REJECTED" | "PENDING";

export interface KycDecisionMeta {
  status?: string;
  ticket?: string;
  reference?: string;
  decidedAt?: string;
  submittedAt?: string;
  userName?: string;
  userAvatar?: string;
  reason?: string;
  kycLevel?: string;
}

export function resolveKycStatus(type: string, meta?: KycDecisionMeta): KycDecisionStatus {
  const raw = (meta?.status || "").toUpperCase();
  if (type === "KYC_APPROVED" || raw === "APPROVED" || raw === "VERIFIED") return "APPROVED";
  if (type === "KYC_REJECTED" || raw === "REJECTED") return "REJECTED";
  return "PENDING";
}

const THEME: Record<KycDecisionStatus, {
  label: string;
  headline: string;
  text: string;
  softText: string;
  bg: string;
  border: string;
  ring: string;
  dot: string;
}> = {
  APPROVED: {
    label: "Approuvée",
    headline: "Vérification d'identité approuvée",
    text: "text-emerald-400",
    softText: "text-emerald-300/80",
    bg: "bg-emerald-500/[0.07]",
    border: "border-emerald-500/25",
    ring: "ring-emerald-500/40",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "Refusée",
    headline: "Vérification d'identité refusée",
    text: "text-rose-400",
    softText: "text-rose-300/80",
    bg: "bg-rose-500/[0.07]",
    border: "border-rose-500/25",
    ring: "ring-rose-500/40",
    dot: "bg-rose-500",
  },
  PENDING: {
    label: "En cours",
    headline: "Vérification d'identité en cours",
    text: "text-amber-400",
    softText: "text-amber-300/80",
    bg: "bg-amber-500/[0.07]",
    border: "border-amber-500/25",
    ring: "ring-amber-500/40",
    dot: "bg-amber-500",
  },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "U";
}

function formatDateTime(value?: string, locale?: string): { date: string; time: string } {
  if (!value) return { date: "—", time: "—" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  const loc = locale === "en" ? "en-US" : "fr-FR";
  return {
    date: d.toLocaleDateString(loc, { day: "2-digit", month: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }),
  };
}

interface KycDecisionCardProps {
  type: string;
  metadata?: KycDecisionMeta;
  createdAt: string;
  fallbackName?: string;
  fallbackAvatar?: string;
  locale?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export default function KycDecisionCard({
  type,
  metadata,
  createdAt,
  fallbackName,
  fallbackAvatar,
  locale,
  onAction,
  actionLabel = "Voir le statut",
}: KycDecisionCardProps) {
  const status = resolveKycStatus(type, metadata);
  const theme = THEME[status];
  const name = metadata?.userName || fallbackName || "Utilisateur";
  const avatar = metadata?.userAvatar || fallbackAvatar;
  const ticket = metadata?.ticket || metadata?.reference || "—";
  const { date, time } = formatDateTime(metadata?.decidedAt || metadata?.submittedAt || createdAt, locale);

  const StatusIcon = status === "APPROVED" ? ShieldCheck : status === "REJECTED" ? ShieldX : Clock;

  return (
    <div className={cn("rounded-3xl border p-5", theme.bg, theme.border)}>
      {/* Profil utilisateur avec avatar et badge */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className={cn("w-16 h-16 rounded-2xl overflow-hidden ring-2 bg-slate-800 flex items-center justify-center", theme.ring)}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar || "/placeholder.svg"} alt={`Photo de profil de ${name}`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-black text-slate-300">{initials(name)}</span>
            )}
          </div>
          {status === "APPROVED" && (
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center">
              <BadgeCheck size={20} className="text-emerald-400" aria-hidden="true" />
              <span className="sr-only">Identité vérifiée</span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[3px] text-slate-500">Titulaire du dossier</p>
          <p className="text-base font-black text-white truncate mt-1">{name}</p>
          <span className={cn(
            "mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
            theme.text, theme.border, theme.bg
          )}>
            <StatusIcon size={11} aria-hidden="true" />
            {theme.label}
          </span>
        </div>
      </div>

      {/* Décision */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className={cn("text-sm font-black leading-snug text-pretty", theme.text)}>{theme.headline}</h3>

        <dl className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", theme.bg)}>
              <StatusIcon size={14} className={theme.text} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-[9px] font-black uppercase tracking-widest text-slate-500">Statut</dt>
              <dd className={cn("text-xs font-bold", theme.text)}>{theme.label}</dd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <CalendarClock size={14} className="text-slate-400" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mise à jour le</dt>
              <dd className="text-xs font-bold text-white">
                {date} <span className="text-slate-500">à</span> {time}
              </dd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <Ticket size={14} className="text-slate-400" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-[9px] font-black uppercase tracking-widest text-slate-500">Numéro de ticket</dt>
              <dd className="text-xs font-mono font-bold text-white truncate">{ticket}</dd>
            </div>
          </div>
        </dl>
      </div>

      {/* Message contextuel */}
      <div className={cn("mt-4 rounded-2xl border-l-2 p-4", theme.bg, status === "APPROVED" ? "border-l-emerald-500" : status === "REJECTED" ? "border-l-rose-500" : "border-l-amber-500")}>
        {status === "APPROVED" ? (
          <p className={cn("text-xs leading-relaxed", theme.softText)}>
            <span className="font-black">Bonne nouvelle : </span>
            votre identité est confirmée. Vous pouvez poursuivre normalement votre parcours de création de carte.
          </p>
        ) : status === "REJECTED" ? (
          <p className={cn("text-xs leading-relaxed", theme.softText)}>
            <span className="font-black">Motif : </span>
            {metadata?.reason || "Votre dossier n'a pas pu être validé. Veuillez soumettre à nouveau vos documents."}
          </p>
        ) : (
          <p className={cn("text-xs leading-relaxed", theme.softText)}>
            <span className="font-black">En traitement : </span>
            votre dossier est en cours d&apos;examen. Délai estimé : 24 à 48 heures.
          </p>
        )}
      </div>

      {onAction && (
        <button
          onClick={onAction}
          className="mt-5 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
