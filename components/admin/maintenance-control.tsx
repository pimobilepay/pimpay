"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Settings2, Clock, Power, Loader2, Send, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { AudienceSelector, type AudienceValue } from "@/components/admin/audience-selector";

const SEVERITIES = [
  { value: "INFO", label: "Info", color: "border-sky-500/50 bg-sky-500/15 text-sky-300" },
  { value: "SUCCESS", label: "Résolu", color: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300" },
  { value: "WARNING", label: "Avertissement", color: "border-amber-500/50 bg-amber-500/15 text-amber-300" },
  { value: "URGENT", label: "Urgent", color: "border-orange-500/50 bg-orange-500/15 text-orange-300" },
  { value: "CRITICAL", label: "Critique", color: "border-rose-500/50 bg-rose-500/15 text-rose-300" },
];

const SERVICES = ["PLATEFORME", "RETRAIT", "DEPOT", "TRANSFERT", "MPAY", "ECHANGE", "CARTES"];

/** Formate une durée en minutes ("2 h 30 min"). */
function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = Math.round(minutes % 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} j`);
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  return parts.join(" ") || null;
}

export const MaintenanceControl = ({ currentConfig }: { currentConfig?: any }) => {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<boolean>(Boolean(currentConfig?.maintenanceMode));

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("URGENT");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [services, setServices] = useState<string[]>(["PLATEFORME"]);
  const [notify, setNotify] = useState(true);
  const [audience, setAudience] = useState<AudienceValue>({
    scope: "ALL",
    roles: [],
    userIds: [],
  });

  // Préremplit le formulaire avec l'état réel de la maintenance
  useEffect(() => {
    fetch("/api/admin/maintenance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setActive(Boolean(d.maintenanceMode));
        if (d.title) setTitle(d.title);
        if (d.message) setMessage(d.message);
        if (d.severity) setSeverity(d.severity);
        if (d.scopes?.length) setServices(d.scopes);
        if (d.startsAt) setStartsAt(new Date(d.startsAt).toISOString().slice(0, 16));
        if (d.endsAt) setEndsAt(new Date(d.endsAt).toISOString().slice(0, 16));
      })
      .catch(() => {});
  }, []);

  // Durée calculée automatiquement à partir de la fenêtre
  const durationLabel = useMemo(() => {
    const start = startsAt ? new Date(startsAt) : new Date();
    const end = endsAt ? new Date(endsAt) : null;
    if (!end) return null;
    return formatDuration(Math.round((end.getTime() - start.getTime()) / 60000));
  }, [startsAt, endsAt]);

  const toggleService = (s: string) =>
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submit = async (maintenanceMode: boolean) => {
    if (maintenanceMode && notify && audience.scope === "ROLES" && !audience.roles.length) {
      toast.error("Sélectionnez au moins un rôle destinataire");
      return;
    }
    if (maintenanceMode && notify && audience.scope === "USERS" && !audience.userIds.length) {
      toast.error("Sélectionnez au moins un utilisateur destinataire");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenanceMode,
          title: title || undefined,
          message: message || undefined,
          severity: maintenanceMode ? severity : "SUCCESS",
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          scopes: services,
          allowedRoles: ["ADMIN"],
          notify,
          notifyScope: audience.scope,
          notifyRoles: audience.roles,
          notifyUserIds: audience.userIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la mise à jour");
        return;
      }

      setActive(maintenanceMode);
      toast.success(
        maintenanceMode ? "Maintenance activée" : "Plateforme de nouveau en ligne",
        {
          description: notify
            ? `${data.notified ?? 0} utilisateur(s) notifié(s)${
                data.durationLabel ? ` · durée annoncée : ${data.durationLabel}` : ""
              }`
            : "Aucune notification envoyée",
        }
      );
      if (data.broadcastError) {
        toast.warning("Notifications non distribuées", { description: data.broadcastError });
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/50";
  const labelClass = "ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400";

  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/50 p-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
          <Settings2 size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white">Contrôle Maintenance</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Annonce &amp; notification globale
          </p>
        </div>
        <span
          className={`rounded-lg px-2 py-1 text-[9px] font-black uppercase ${
            active ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
          }`}
        >
          {active ? "Maintenance" : "En ligne"}
        </span>
      </header>

      <div className="flex flex-col gap-4">
        {/* Titre */}
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="mt-title">
            Titre de l&apos;annonce
          </label>
          <input
            id="mt-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Maintenance planifiée de la plateforme"
            className={inputClass}
          />
        </div>

        {/* Message détaillé */}
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="mt-message">
            Message détaillé
          </label>
          <textarea
            id="mt-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Raison de la maintenance, services impactés, consignes aux utilisateurs..."
            className={`${inputClass} resize-none leading-relaxed`}
          />
          <p className="ml-1 text-[9px] text-slate-500">
            Laissez vide pour générer automatiquement un message avec la durée.
          </p>
        </div>

        {/* Niveau d'urgence */}
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Niveau d&apos;alerte</span>
          <div className="flex flex-wrap gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={severity === s.value}
                onClick={() => setSeverity(s.value)}
                className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase transition-all ${
                  severity === s.value
                    ? s.color
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {(severity === "URGENT" || severity === "CRITICAL") && (
            <p className="ml-1 flex items-center gap-1.5 text-[9px] text-orange-400">
              <AlertTriangle size={11} />
              La bannière ne pourra pas être masquée par les utilisateurs.
            </p>
          )}
        </div>

        {/* Fenêtre de maintenance */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className={labelClass} htmlFor="mt-start">
              Début
            </label>
            <input
              id="mt-start"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass} htmlFor="mt-end">
              Fin prévue
            </label>
            <input
              id="mt-end"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {durationLabel && (
          <p className="flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-bold text-blue-300">
            <Clock size={12} />
            Durée annoncée aux utilisateurs : {durationLabel}
          </p>
        )}

        {/* Services impactés */}
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Services impactés</span>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={services.includes(s)}
                onClick={() => toggleService(s)}
                className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  services.includes(s)
                    ? "border-orange-500/50 bg-orange-500/15 text-orange-300"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Notification */}
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="h-4 w-4 accent-blue-500"
          />
          <span className="flex-1 text-[11px] font-bold text-white">
            Notifier les utilisateurs
          </span>
          <Send size={13} className="text-slate-500" />
        </label>

        {notify && (
          <AudienceSelector value={audience} onChange={setAudience} />
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-[11px] font-bold text-white transition-all hover:bg-orange-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Clock size={14} />}
            {endsAt ? "PLANIFIER & NOTIFIER" : "ACTIVER & NOTIFIER"}
          </button>

          <button
            type="button"
            onClick={() => submit(false)}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-[11px] font-bold text-white transition-all hover:bg-white/10 disabled:opacity-30"
          >
            <Power size={14} className="text-emerald-500" />
            TERMINER
          </button>
        </div>

        <p className="flex items-start gap-1.5 text-[9px] leading-relaxed text-slate-500">
          <Info size={11} className="mt-0.5 shrink-0" />
          Terminer la maintenance envoie automatiquement une notification de rétablissement
          et retire la bannière globale.
        </p>
      </div>
    </div>
  );
};
