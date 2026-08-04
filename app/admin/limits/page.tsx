"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Loader2,
  ShieldCheck,
  Users,
  UserCog,
  Power,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { AudienceSelector, type AudienceValue, ROLE_LABELS } from "@/components/admin/audience-selector";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

const CHANNELS = [
  { value: "WITHDRAW", label: "Retrait" },
  { value: "WALLET", label: "Wallet" },
  { value: "TRANSFER", label: "Transfert" },
  { value: "MPAY", label: "MPay" },
];

const KYC_TIERS = [
  { value: "ALL", label: "Tous les comptes" },
  { value: "NON_KYC", label: "Non vérifiés" },
  { value: "KYC", label: "Vérifiés KYC" },
];

interface Policy {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  roles: string[];
  userIds: string[];
  kycTier: string;
  channels: string[];
  kycFreeLimitPi: number | null;
  kycMaxPerTxPi: number | null;
  adminApprovalThresholdPi: number | null;
  maxPerDay: number | null;
  dailyTotalPi: number | null;
  minPerTxPi: number | null;
  bypassKyc: boolean | null;
  priority: number;
  active: boolean;
}

const emptyForm = {
  name: "",
  description: "",
  kycTier: "ALL",
  channels: [] as string[],
  kycFreeLimitPi: "",
  kycMaxPerTxPi: "",
  adminApprovalThresholdPi: "",
  maxPerDay: "",
  dailyTotalPi: "",
  minPerTxPi: "",
  bypassKyc: false,
  priority: "0",
};

export default function AdminLimitsPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string | null }[]>([]);
  const [defaults, setDefaults] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [audience, setAudience] = useState<AudienceValue>({
    scope: "ALL",
    roles: [],
    userIds: [],
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/limits");
      const data = await res.json();
      setPolicies(data.policies ?? []);
      setUsers(data.users ?? []);
      setDefaults(data.defaults ?? {});
    } catch {
      toast.error("Impossible de charger les plafonds");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reset = () => {
    setForm(emptyForm);
    setAudience({ scope: "ALL", roles: [], userIds: [] });
    setShowForm(false);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Donnez un nom à la règle");
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

    setSaving(true);
    try {
      const res = await fetch("/api/admin/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scope: audience.scope,
          roles: audience.roles,
          userIds: audience.userIds,
          bypassKyc: form.bypassKyc ? true : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur d'enregistrement");
        return;
      }
      toast.success("Règle de plafond créée");
      reset();
      load();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Policy) => {
    setPolicies((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x))
    );
    try {
      await fetch("/api/admin/limits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, active: !p.active }),
      });
      toast.success(p.active ? "Règle désactivée" : "Règle activée");
    } catch {
      toast.error("Erreur réseau");
      load();
    }
  };

  const remove = async (p: Policy) => {
    if (!confirm(`Supprimer la règle « ${p.name} » ?`)) return;
    try {
      const res = await fetch(`/api/admin/limits?id=${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPolicies((prev) => prev.filter((x) => x.id !== p.id));
      toast.success("Règle supprimée");
    } catch {
      toast.error("Suppression impossible");
    }
  };

  const toggleChannel = (c: string) =>
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(c)
        ? f.channels.filter((x) => x !== c)
        : [...f.channels, c],
    }));

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/50";
  const labelClass = "ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400";

  const scopeBadge = (p: Policy) => {
    if (p.scope === "USERS") {
      const names = p.userIds
        .map((id) => users.find((u) => u.id === id)?.username ?? id.slice(0, 6))
        .slice(0, 3)
        .join(", ");
      return `${p.userIds.length} utilisateur(s) : ${names}${p.userIds.length > 3 ? "…" : ""}`;
    }
    if (p.scope === "ROLES")
      return p.roles.map((r) => ROLE_LABELS[r] ?? r).join(", ");
    return "Tous les utilisateurs";
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <AdminTopNav
        title="Plafonds & Exceptions"
        subtitle="Conformite"
        backPath="/admin"
        onRefresh={load}
      />
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 pb-24">
      <header className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
          <SlidersHorizontal size={20} />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">Plafonds &amp; Exceptions</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Retrait · Wallet · Transfert · MPay
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-[11px] font-bold text-white transition-all hover:bg-blue-500"
        >
          <Plus size={14} />
          Nouvelle règle
        </button>
      </header>

      {/* Valeurs par défaut */}
      <section className="rounded-2xl border border-white/5 bg-slate-900/50 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold text-white">
          <Info size={13} className="text-slate-500" />
          Valeurs par défaut (si aucune règle ne s&apos;applique)
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            ["Franchise sans KYC", defaults.kycFreeLimitPi],
            ["Max / transaction (KYC)", defaults.kycMaxPerTxPi],
            ["Seuil validation admin", defaults.adminApprovalThresholdPi],
            ["Opérations / jour", defaults.maxPerDay],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-black/30 px-3 py-2">
              <p className="text-[9px] uppercase text-slate-500">{label}</p>
              <p className="text-xs font-bold text-white">{value ?? "—"}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Formulaire */}
      {showForm && (
        <section className="flex flex-col gap-4 rounded-2xl border border-blue-500/20 bg-slate-900/50 p-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
            Nouvelle règle de plafond
          </h2>

          <div className="flex flex-col gap-2">
            <label className={labelClass} htmlFor="lp-name">
              Nom de la règle
            </label>
            <input
              id="lp-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex. Plafond élargi pour les agents"
              className={inputClass}
            />
          </div>

          <AudienceSelector
            value={audience}
            onChange={setAudience}
            label="Cette limite s'applique à"
          />

          {/* Palier KYC */}
          <div className="flex flex-col gap-2">
            <span className={labelClass}>Comptes concernés</span>
            <div className="flex flex-wrap gap-2">
              {KYC_TIERS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={form.kycTier === t.value}
                  onClick={() => setForm({ ...form, kycTier: t.value })}
                  className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase transition-all ${
                    form.kycTier === t.value
                      ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                      : "border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Canaux */}
          <div className="flex flex-col gap-2">
            <span className={labelClass}>Pages concernées (vide = toutes)</span>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={form.channels.includes(c.value)}
                  onClick={() => toggleChannel(c.value)}
                  className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase transition-all ${
                    form.channels.includes(c.value)
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      : "border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Montants */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["kycFreeLimitPi", "Franchise sans KYC (Pi)"],
              ["kycMaxPerTxPi", "Max / transaction (Pi)"],
              ["adminApprovalThresholdPi", "Seuil validation admin (Pi)"],
              ["minPerTxPi", "Minimum / transaction (Pi)"],
              ["maxPerDay", "Opérations / jour"],
              ["dailyTotalPi", "Volume / jour (Pi)"],
            ].map(([key, label]) => (
              <div key={key} className="flex flex-col gap-2">
                <label className={labelClass} htmlFor={`lp-${key}`}>
                  {label}
                </label>
                <input
                  id={`lp-${key}`}
                  type="number"
                  step="any"
                  min="0"
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder="hérite"
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.bypassKyc}
              onChange={(e) => setForm({ ...form, bypassKyc: e.target.checked })}
              className="h-4 w-4 accent-amber-500"
            />
            <span className="flex-1 text-[11px] font-bold text-amber-200">
              Exception : dispenser ces comptes de l&apos;obligation de KYC
            </span>
            <ShieldCheck size={14} className="text-amber-400" />
          </label>

          <div className="flex flex-col gap-2">
            <label className={labelClass} htmlFor="lp-priority">
              Priorité (plus élevé = appliqué en dernier)
            </label>
            <input
              id="lp-priority"
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-[11px] font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              ENREGISTRER
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-white/10 bg-white/5 py-3 text-[11px] font-bold text-slate-300 transition-all hover:bg-white/10"
            >
              ANNULER
            </button>
          </div>
        </section>
      )}

      {/* Liste des règles */}
      <section className="flex flex-col gap-3">
        <h2 className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
          Règles actives ({policies.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-slate-600" size={22} />
          </div>
        ) : policies.length === 0 ? (
          <p className="rounded-2xl border border-white/5 bg-slate-900/50 p-6 text-center text-xs text-slate-500">
            Aucune règle. Les valeurs par défaut ci-dessus s&apos;appliquent à tous.
          </p>
        ) : (
          policies.map((p) => (
            <article
              key={p.id}
              className={`rounded-2xl border p-4 transition-all ${
                p.active
                  ? "border-white/5 bg-slate-900/50"
                  : "border-white/5 bg-slate-900/20 opacity-60"
              }`}
            >
              <div className="mb-2 flex items-start gap-3">
                <div className="rounded-lg bg-white/5 p-2 text-slate-400">
                  {p.scope === "USERS" ? (
                    <UserCog size={15} />
                  ) : p.scope === "ROLES" ? (
                    <Users size={15} />
                  ) : (
                    <ShieldCheck size={15} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xs font-bold text-white">{p.name}</h3>
                  <p className="truncate text-[10px] text-slate-500">{scopeBadge(p)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleActive(p)}
                  aria-label={p.active ? "Désactiver" : "Activer"}
                  className={`rounded-lg p-2 transition-colors ${
                    p.active
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/5 text-slate-500"
                  }`}
                >
                  <Power size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(p)}
                  aria-label="Supprimer"
                  className="rounded-lg bg-rose-500/10 p-2 text-rose-400 transition-colors hover:bg-rose-500/20"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-400">
                  {KYC_TIERS.find((t) => t.value === p.kycTier)?.label ?? p.kycTier}
                </span>
                {(p.channels.length ? p.channels : ["TOUTES PAGES"]).map((c) => (
                  <span
                    key={c}
                    className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-400"
                  >
                    {CHANNELS.find((x) => x.value === c)?.label ?? c}
                  </span>
                ))}
                {p.kycFreeLimitPi !== null && (
                  <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-300">
                    Sans KYC : {p.kycFreeLimitPi} Pi
                  </span>
                )}
                {p.kycMaxPerTxPi !== null && (
                  <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-300">
                    Max/tx : {p.kycMaxPerTxPi} Pi
                  </span>
                )}
                {p.maxPerDay !== null && (
                  <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-300">
                    {p.maxPerDay}/jour
                  </span>
                )}
                {p.bypassKyc && (
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                    KYC non requis
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
    </div>
  );
}
