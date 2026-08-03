"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  ShieldAlert,
  Wrench,
  X,
  Clock,
} from "lucide-react";

type Severity = "INFO" | "SUCCESS" | "WARNING" | "URGENT" | "CRITICAL";

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  category: string;
  link: string | null;
  startsAt: string | null;
  endsAt: string | null;
  durationLabel: string | null;
  details: Record<string, unknown> | null;
  dismissible: boolean;
}

const STYLES: Record<
  Severity,
  { wrapper: string; icon: typeof Info; iconColor: string; badge: string; label: string }
> = {
  INFO: {
    wrapper: "border-sky-500/30 bg-sky-950/80",
    icon: Info,
    iconColor: "text-sky-400",
    badge: "bg-sky-500/20 text-sky-300",
    label: "Information",
  },
  SUCCESS: {
    wrapper: "border-emerald-500/30 bg-emerald-950/80",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-300",
    label: "Résolu",
  },
  WARNING: {
    wrapper: "border-amber-500/30 bg-amber-950/80",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
    label: "Avertissement",
  },
  URGENT: {
    wrapper: "border-orange-500/40 bg-orange-950/85",
    icon: ShieldAlert,
    iconColor: "text-orange-400",
    badge: "bg-orange-500/20 text-orange-300",
    label: "Urgent",
  },
  CRITICAL: {
    wrapper: "border-rose-500/40 bg-rose-950/85",
    icon: ShieldAlert,
    iconColor: "text-rose-400",
    badge: "bg-rose-500/25 text-rose-300",
    label: "Critique",
  },
};

const STORAGE_KEY = "pimpay-dismissed-alerts";

function readDismissed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Compte à rebours jusqu'à la fin annoncée. */
function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setRemaining(null);
      return;
    }
    const end = new Date(target).getTime();
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setRemaining(null);
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setRemaining(
        h > 0
          ? `${h}h ${String(m).padStart(2, "0")}m`
          : `${m}m ${String(s).padStart(2, "0")}s`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return remaining;
}

function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const style = STYLES[alert.severity] ?? STYLES.INFO;
  const Icon = alert.category === "MAINTENANCE" ? Wrench : style.icon;
  const countdown = useCountdown(alert.endsAt);

  const services = useMemo(() => {
    const raw = (alert.details as any)?.services;
    return Array.isArray(raw) ? (raw as string[]) : [];
  }, [alert.details]);

  const endLabel = alert.endsAt
    ? new Date(alert.endsAt).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  return (
    <div
      role={alert.severity === "CRITICAL" || alert.severity === "URGENT" ? "alert" : "status"}
      className={`flex gap-3 rounded-2xl border p-3 shadow-lg backdrop-blur-xl ${style.wrapper}`}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${style.iconColor}`} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${style.badge}`}
          >
            {style.label}
          </span>
          <h2 className="text-[11px] font-bold text-white text-pretty">{alert.title}</h2>
        </div>

        <p className="mt-1 text-[10px] leading-relaxed text-slate-300 text-pretty">
          {alert.message}
        </p>

        {/* Durée / fin / compte à rebours */}
        {(alert.durationLabel || endLabel) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {alert.durationLabel && (
              <span className="flex items-center gap-1 rounded-lg bg-black/30 px-2 py-1 text-[9px] font-bold text-slate-300">
                <Clock size={10} />
                Durée : {alert.durationLabel}
              </span>
            )}
            {endLabel && (
              <span className="rounded-lg bg-black/30 px-2 py-1 text-[9px] font-bold text-slate-300">
                Retour prévu : {endLabel}
              </span>
            )}
            {countdown && (
              <span className="rounded-lg bg-white/10 px-2 py-1 text-[9px] font-black text-white">
                {countdown} restant
              </span>
            )}
          </div>
        )}

        {/* Services impactés */}
        {services.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {services.map((s) => (
              <span
                key={s}
                className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-400"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {alert.link && (
          <a
            href={alert.link}
            className="mt-2 inline-block text-[10px] font-bold text-white underline underline-offset-2"
          >
            En savoir plus
          </a>
        )}
      </div>

      {alert.dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Masquer cette alerte"
          className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Bannière globale des alertes système (maintenance, annonces, sécurité).
 * Alimentée par /api/system/alerts et filtrée par rôle / sélection côté serveur.
 */
export default function SystemAlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/system/alerts", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d?.alerts) setAlerts(d.alerts);
        })
        .catch(() => {});
    };
    load();
    // Rafraîchit périodiquement pour capter une maintenance lancée en direct.
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const visible = alerts.filter((a) => !a.dismissible || !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[70] flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      {visible.slice(0, 2).map((a) => (
        <AlertCard key={a.id} alert={a} onDismiss={() => dismiss(a.id)} />
      ))}
    </div>
  );
}
