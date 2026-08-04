"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Megaphone,
  Loader2,
  Send,
  Users,
  EyeOff,
  Clock,
  Wrench,
  History,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { AdminTopNav } from "@/components/admin/AdminTopNav";
import { MaintenanceControl } from "@/components/admin/maintenance-control";
import {
  AudienceSelector,
  type AudienceValue,
  ROLE_LABELS,
} from "@/components/admin/audience-selector";

interface SeverityOption {
  value: string;
  label?: string;
  [key: string]: unknown;
}

interface BroadcastRow {
  id: string;
  title: string;
  message: string;
  severity: string;
  category: string;
  scope: string;
  roles: string[];
  userIds: string[];
  recipientCount: number | null;
  active: boolean;
  link: string | null;
  startsAt: string | null;
  endsAt: string | null;
  durationLabel: string | null;
  createdAt: string;
  createdByName: string | null;
}

const SEVERITY_STYLES: Record<string, string> = {
  INFO: "border-sky-500/50 bg-sky-500/15 text-sky-300",
  SUCCESS: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
  WARNING: "border-amber-500/50 bg-amber-500/15 text-amber-300",
  URGENT: "border-orange-500/50 bg-orange-500/15 text-orange-300",
  CRITICAL: "border-rose-500/50 bg-rose-500/15 text-rose-300",
};

const SEVERITY_LABELS: Record<string, string> = {
  INFO: "Info",
  SUCCESS: "Résolu",
  WARNING: "Avertissement",
  URGENT: "Urgent",
  CRITICAL: "Critique",
};

const CATEGORY_LABELS: Record<string, string> = {
  ANNOUNCEMENT: "Annonce",
  MAINTENANCE: "Maintenance",
  SECURITY: "Sécurité",
  PROMOTION: "Promotion",
  INCIDENT: "Incident",
  UPDATE: "Mise à jour",
};

const emptyForm = {
  title: "",
  message: "",
  severity: "INFO",
  category: "ANNOUNCEMENT",
  link: "",
  startsAt: "",
  endsAt: "",
  showBanner: true,
};

export default function AdminBroadcastPage() {
  const [tab, setTab] = useState<"compose" | "history" | "maintenance">("compose");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [audience, setAudience] = useState<AudienceValue>({
    scope: "ALL",
    roles: [],
    userIds: [],
  });
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([]);
  const [severities, setSeverities] = useState<SeverityOption[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/broadcasts", { cache: "no-store" });
      const data = await res.json();
      setBroadcasts(data.broadcasts ?? []);
      if (data.meta?.severities) setSeverities(data.meta.severities);
      if (data.meta?.categories) setCategories(data.meta.categories);
    } catch {
      toast.error("Impossible de charger les diffusions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Prévisualise le nombre de destinataires pour le ciblage courant.
  useEffect(() => {
    const params = new URLSearchParams({
      preview: "1",
      scope: audience.scope,
      roles: audience.roles.join(","),
      userIds: audience.userIds.join(","),
    });
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/admin/broadcasts?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setRecipientCount(d.recipientCount ?? null);
        })
        .catch(() => {
          if (!cancelled) setRecipientCount(null);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [audience.scope, audience.roles, audience.userIds]);

  const send = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Titre et message obligatoires");
      return;
    }
    if (audience.scope === "ROLES" && !audience.roles.length) {
      toast.error("Sélectionnez au moins un rôle");
      return;
    }
    if (audience.scope === "USERS" && !audience.userIds.length) {
      toast.error("Sélectionnez au moins un utilisateur");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          message: form.message.trim(),
          severity: form.severity,
          category: form.category,
          link: form.link.trim() || null,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          showBanner: form.showBanner,
          scope: audience.scope,
          roles: audience.roles,
          userIds: audience.userIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Envoi impossible");
        return;
      }
      toast.success("Diffusion envoyée", {
        description: `${data.notified ?? data.recipientCount ?? 0} utilisateur(s) notifié(s)`,
      });
      setForm(emptyForm);
      setAudience({ scope: "ALL", roles: [], userIds: [] });
      await load();
      setTab("history");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSending(false);
    }
  };

  const toggleBanner = async (row: BroadcastRow) => {
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, active: !row.active }),
      });
      if (!res.ok) throw new Error();
      setBroadcasts((prev) =>
        prev.map((b) => (b.id === row.id ? { ...b, active: !b.active } : b))
      );
      toast.success(row.active ? "Bannière masquée" : "Bannière réaffichée");
    } catch {
      toast.error("Action impossible");
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/50";
  const labelClass = "ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400";

  const severityList = severities.length
    ? severities.map((s) => s.value)
    : ["INFO", "SUCCESS", "WARNING", "URGENT", "CRITICAL"];
  const categoryList = categories.length
    ? categories
    : ["ANNOUNCEMENT", "MAINTENANCE", "SECURITY", "PROMOTION", "INCIDENT", "UPDATE"];

  const scopeLabel = (row: BroadcastRow) => {
    if (row.scope === "ROLES") return row.roles.map((r) => ROLE_LABELS[r] ?? r).join(", ");
    if (row.scope === "USERS") return `${row.userIds.length} utilisateur(s)`;
    return "Tous les comptes";
  };

  return (
    <div className="min-h-screen bg-[#020617] pb-32 text-white">
      <AdminTopNav
        title="Diffusion & Maintenance"
        subtitle="Communication"
        backPath="/admin"
        onRefresh={load}
      />

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-4">
        <nav className="flex gap-2 rounded-2xl border border-white/5 bg-slate-900/60 p-1">
          {[
            { id: "compose" as const, label: "Composer", icon: <Megaphone size={14} /> },
            { id: "history" as const, label: "Historique", icon: <History size={14} /> },
            { id: "maintenance" as const, label: "Maintenance", icon: <Wrench size={14} /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-[10px] font-black uppercase tracking-wider transition-all ${
                tab === t.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "compose" && (
          <section className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-slate-900/50 p-5">
            <header className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                <Megaphone size={18} />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-white">Notification en groupe</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Push + bannière globale
                </p>
              </div>
              {recipientCount !== null && (
                <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-black text-emerald-300">
                  <Users size={12} />
                  {recipientCount}
                </span>
              )}
            </header>

            <div className="flex flex-col gap-2">
              <label className={labelClass} htmlFor="bc-title">
                Titre
              </label>
              <input
                id="bc-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Nouvelle fonctionnalité disponible"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass} htmlFor="bc-message">
                Message
              </label>
              <textarea
                id="bc-message"
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Détaillez l'information transmise aux utilisateurs..."
                className={`${inputClass} resize-none leading-relaxed`}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>Niveau d&apos;alerte</span>
              <div className="flex flex-wrap gap-2">
                {severityList.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={form.severity === s}
                    onClick={() => setForm((f) => ({ ...f, severity: s }))}
                    className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase transition-all ${
                      form.severity === s
                        ? SEVERITY_STYLES[s]
                        : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {SEVERITY_LABELS[s] ?? s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>Catégorie</span>
              <div className="flex flex-wrap gap-2">
                {categoryList.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={form.category === c}
                    onClick={() => setForm((f) => ({ ...f, category: c }))}
                    className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                      form.category === c
                        ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                        : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {CATEGORY_LABELS[c] ?? c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass} htmlFor="bc-link">
                Lien « En savoir plus » (optionnel)
              </label>
              <div className="relative">
                <Link2
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  id="bc-link"
                  value={form.link}
                  onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                  placeholder="/support ou https://..."
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className={labelClass} htmlFor="bc-start">
                  Affichage à partir de
                </label>
                <input
                  id="bc-start"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass} htmlFor="bc-end">
                  Fin d&apos;affichage
                </label>
                <input
                  id="bc-end"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <input
                type="checkbox"
                checked={form.showBanner}
                onChange={(e) => setForm((f) => ({ ...f, showBanner: e.target.checked }))}
                className="h-4 w-4 accent-blue-500"
              />
              <span className="flex-1 text-[11px] font-bold text-white">
                Afficher aussi la bannière globale
              </span>
              <Clock size={13} className="text-slate-500" />
            </label>

            <AudienceSelector value={audience} onChange={setAudience} />

            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-500 disabled:opacity-50"
            >
              {sending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              Envoyer la diffusion
            </button>
          </section>
        )}

        {tab === "history" && (
          <section className="flex flex-col gap-3">
            {loading ? (
              <div className="flex justify-center py-16 text-blue-500">
                <Loader2 className="animate-spin" size={28} />
              </div>
            ) : broadcasts.length === 0 ? (
              <p className="py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-600">
                Aucune diffusion enregistrée
              </p>
            ) : (
              broadcasts.map((b) => (
                <article
                  key={b.id}
                  className="rounded-2xl border border-white/5 bg-slate-900/40 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                        SEVERITY_STYLES[b.severity] ?? SEVERITY_STYLES.INFO
                      }`}
                    >
                      {SEVERITY_LABELS[b.severity] ?? b.severity}
                    </span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-400">
                      {CATEGORY_LABELS[b.category] ?? b.category}
                    </span>
                    {b.active && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-300">
                        Bannière active
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-[12px] font-bold text-white text-pretty">{b.title}</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-400 text-pretty">
                    {b.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                      <Users size={10} />
                      {scopeLabel(b)}
                      {b.recipientCount !== null && ` · ${b.recipientCount} envoi(s)`}
                    </span>
                    <span className="text-[9px] font-mono text-slate-600">
                      {new Date(b.createdAt).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    {b.durationLabel && (
                      <span className="text-[9px] font-bold text-slate-500">
                        {b.durationLabel}
                      </span>
                    )}
                    {b.active && (
                      <button
                        type="button"
                        onClick={() => toggleBanner(b)}
                        className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-300 transition-colors hover:bg-white/10"
                      >
                        <EyeOff size={11} />
                        Masquer
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {tab === "maintenance" && <MaintenanceControl />}
      </main>
    </div>
  );
}
