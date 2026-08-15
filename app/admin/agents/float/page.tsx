"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PiggyBank,
  Loader2,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowDownRight,
  ArrowUpRight,
  Users,
  Landmark,
  Lock,
  History,
  ShieldAlert,
  X,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AgentRow = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  agentId: string | null;
  agentRole: string | null;
  agentType: string | null;
  status: string;
  kycStatus: string | null;
  country: string | null;
  city: string | null;
  wallets: { currency: string; balance: number }[];
};

type Movement = {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  note: string | null;
  description: string | null;
  createdAt: string;
  source: string;
  decidedByName: string | null;
  decidedAt: string | null;
  rejectReason: string | null;
  agent: {
    id: string;
    name: string | null;
    username: string | null;
    phone: string | null;
    email: string | null;
    agentId: string | null;
    agentRole: string | null;
  } | null;
};

type Payload = {
  canManage: boolean;
  agents: AgentRow[];
  pending: Movement[];
  history: Movement[];
  stats: {
    agentsCount: number;
    totalFloat: number;
    pendingCount: number;
    pendingAmount: number;
    liquidityXAF: number | null;
    liquidityLocked: boolean;
  };
};

const FLOAT_CURRENCIES = ["XAF", "XOF", "PI"] as const;
const QUICK_AMOUNTS = [50_000, 100_000, 250_000, 500_000, 1_000_000];

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

const agentLabel = (a: { name?: string | null; username?: string | null; phone?: string | null }) =>
  a.name || a.username || a.phone || "Agent";

const initials = (label: string) =>
  label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminAgentFloatPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"pending" | "agents" | "history">("pending");
  const [busy, setBusy] = useState<string | null>(null);

  // Modale de provision / reprise
  const [target, setTarget] = useState<{ agent: AgentRow; mode: "provision" | "debit" } | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>("XAF");
  const [note, setNote] = useState("");

  // Modale d'approbation / refus
  const [decision, setDecision] = useState<{ req: Movement; mode: "approve" | "reject" } | null>(null);
  const [decisionAmount, setDecisionAmount] = useState("");
  const [reason, setReason] = useState("");

  const fetchData = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q ? `/api/admin/agents/float?q=${encodeURIComponent(q)}` : "/api/admin/agents/float";
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (res.status === 401 || res.status === 403) {
        setDenied(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || "Erreur de chargement");
      setData(json);
      setDenied(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur de chargement du float agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Recherche debouncee cote serveur
  useEffect(() => {
    const t = setTimeout(() => fetchData(query.trim() || undefined), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const canManage = data?.canManage ?? false;

  async function post(body: Record<string, unknown>, key: string, successMsg: (d: any) => string) {
    setBusy(key);
    try {
      const res = await fetch("/api/admin/agents/float", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Operation refusee");
      toast.success(successMsg(d));
      await fetchData(query.trim() || undefined);
      return true;
    } catch (e: any) {
      toast.error(e.message || "Erreur");
      return false;
    } finally {
      setBusy(null);
    }
  }

  /* ----------------------------- Actions ---------------------------- */

  async function submitProvision() {
    if (!target) return;
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Montant invalide");
      return;
    }
    const ok = await post(
      {
        action: target.mode,
        agentUserId: target.agent.id,
        amount: value,
        currency,
        note: note.trim() || undefined,
      },
      "modal",
      (d) =>
        target.mode === "debit"
          ? `Reprise de ${fmt(d.amount)} ${d.currency} - solde ${fmt(d.balance)}`
          : `Float credite de ${fmt(d.amount)} ${d.currency} - solde ${fmt(d.balance)}`
    );
    if (ok) closeProvision();
  }

  async function submitDecision() {
    if (!decision) return;
    if (decision.mode === "reject") {
      const ok = await post(
        { action: "reject", requestId: decision.req.id, reason: reason.trim() || undefined },
        "decision",
        () => "Demande refusee"
      );
      if (ok) closeDecision();
      return;
    }
    const raw = decisionAmount.trim();
    if (raw) {
      const value = parseFloat(raw);
      if (!Number.isFinite(value) || value <= 0) {
        toast.error("Montant accorde invalide");
        return;
      }
    }
    const ok = await post(
      { action: "approve", requestId: decision.req.id, ...(raw ? { amount: parseFloat(raw) } : {}) },
      "decision",
      (d) => `Float credite de ${fmt(d.amount)} ${d.currency} - solde ${fmt(d.balance)}`
    );
    if (ok) closeDecision();
  }

  function openProvision(agent: AgentRow, mode: "provision" | "debit") {
    setTarget({ agent, mode });
    setAmount("");
    setCurrency("XAF");
    setNote("");
  }
  function closeProvision() {
    setTarget(null);
    setAmount("");
    setNote("");
  }
  function openDecision(req: Movement, mode: "approve" | "reject") {
    setDecision({ req, mode });
    setDecisionAmount(mode === "approve" ? String(req.amount) : "");
    setReason("");
  }
  function closeDecision() {
    setDecision(null);
    setDecisionAmount("");
    setReason("");
  }

  const stats = data?.stats;
  const pending = data?.pending ?? [];
  const history = data?.history ?? [];
  const agents = data?.agents ?? [];

  const tabs = useMemo(
    () =>
      [
        { key: "pending" as const, label: "Demandes", count: pending.length },
        { key: "agents" as const, label: "Agents", count: agents.length },
        { key: "history" as const, label: "Historique", count: history.length },
      ],
    [pending.length, agents.length, history.length]
  );

  /* ------------------------------ Render ---------------------------- */

  if (denied) {
    return (
      <div className="min-h-screen bg-[#020617] text-white pb-32">
        <AdminTopNav title="Float agents" subtitle="Provisionnement" backPath="/admin" />
        <div className="max-w-2xl mx-auto px-4 pt-16 text-center">
          <ShieldAlert size={28} className="text-rose-400 mx-auto mb-3" />
          <p className="text-sm font-black uppercase tracking-widest text-white">Acces refuse</p>
          <p className="text-[11px] text-slate-500 mt-2">
            La permission {"treasury.view"} est requise pour consulter le float des agents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <AdminTopNav
        title="Float agents"
        subtitle="Provisionnement"
        backPath="/admin"
        onRefresh={() => fetchData(query.trim() || undefined)}
      />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* ---------------- Bandeau principal ---------------- */}
        <div className="rounded-[2rem] p-6 mb-4 border bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank size={16} className="text-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Float total agents
              </p>
            </div>
            {stats?.liquidityLocked && (
              <span className="flex items-center gap-1 text-[8px] font-black px-2 py-1 rounded-full border uppercase text-rose-400 bg-rose-500/10 border-rose-500/20">
                <Lock size={9} /> Liquidite verrouillee
              </span>
            )}
          </div>
          <p className="text-4xl font-black mt-3 leading-none text-emerald-400">
            {loading && !data ? "..." : fmt(stats?.totalFloat ?? 0)}
            <span className="text-base ml-1 text-emerald-400/60">XAF</span>
          </p>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <Metric label="Agents" value={String(stats?.agentsCount ?? 0)} icon={<Users size={11} />} />
            <Metric
              label="En attente"
              value={`${stats?.pendingCount ?? 0}`}
              sub={stats?.pendingAmount ? `${fmt(stats.pendingAmount)} XAF` : undefined}
              icon={<Clock size={11} />}
            />
            <Metric
              label="Liquidite"
              value={stats?.liquidityXAF !== null && stats?.liquidityXAF !== undefined ? fmt(stats.liquidityXAF) : "N/D"}
              icon={<Landmark size={11} />}
            />
          </div>
        </div>

        {!canManage && !loading && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 mb-4 flex items-center gap-2">
            <ShieldAlert size={13} className="text-amber-400 shrink-0" />
            <p className="text-[10px] font-bold text-amber-300/90 leading-relaxed">
              Lecture seule : la permission {"treasury.manage"} est requise pour provisionner un agent.
            </p>
          </div>
        )}

        {/* ---------------- Onglets ---------------- */}
        <div className="flex gap-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors border ${
                tab === t.key
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-900/40 border-white/5 text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.label}
              {t.count > 0 && <span className="ml-1.5 opacity-70">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ---------------- Recherche ---------------- */}
        {tab !== "history" && (
          <div className="relative mb-4">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, ID agent, telephone, email..."
              className="w-full bg-slate-900/40 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40"
            />
          </div>
        )}

        {loading && !data ? (
          <div className="flex justify-center py-16 text-blue-500">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : (
          <>
            {/* ================= DEMANDES ================= */}
            {tab === "pending" && (
              <div className="space-y-3">
                {pending.length === 0 ? (
                  <Empty icon={<Clock size={22} />} label="Aucune demande en attente" />
                ) : (
                  pending.map((req) => {
                    const label = agentLabel(req.agent ?? {});
                    return (
                      <div
                        key={req.id}
                        className="bg-slate-900/40 border border-amber-500/20 rounded-2xl p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0">
                            {initials(label)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-white truncate">{label}</p>
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                              {req.agent?.agentId || req.agent?.phone || "-"} · {dateFmt(req.createdAt)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-amber-400">
                              {fmt(req.amount)} <span className="text-[9px]">{req.currency}</span>
                            </p>
                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
                              {req.reference}
                            </p>
                          </div>
                        </div>

                        {req.note && (
                          <p className="text-[10px] text-slate-400 mt-3 pl-12 leading-relaxed">
                            {req.note}
                          </p>
                        )}

                        {canManage && (
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => openDecision(req, "approve")}
                              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <CheckCircle2 size={13} /> Valider
                            </button>
                            <button
                              onClick={() => openDecision(req, "reject")}
                              className="flex-1 py-3 bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <XCircle size={13} /> Refuser
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ================= AGENTS ================= */}
            {tab === "agents" && (
              <div className="space-y-3">
                {agents.length === 0 ? (
                  <Empty icon={<Users size={22} />} label="Aucun agent trouve" />
                ) : (
                  agents.map((a) => {
                    const label = agentLabel(a);
                    const xaf = a.wallets.find((w) => w.currency === "XAF")?.balance ?? 0;
                    const pi = a.wallets.find((w) => w.currency === "PI")?.balance ?? 0;
                    const inactive = a.status !== "ACTIVE";
                    return (
                      <div key={a.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400 shrink-0">
                            {initials(label)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black text-white truncate">{label}</p>
                              {inactive && (
                                <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full border uppercase text-rose-400 bg-rose-500/10 border-rose-500/20">
                                  {a.status}
                                </span>
                              )}
                              {a.agentRole === "SUPERVISOR" && (
                                <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full border uppercase text-purple-400 bg-purple-500/10 border-purple-500/20">
                                  Superviseur
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5 truncate">
                              {a.agentId || a.username || "-"}
                              {a.city ? ` · ${a.city}` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-white">
                              {fmt(xaf)} <span className="text-[9px] text-slate-500">XAF</span>
                            </p>
                            {pi > 0 && (
                              <p className="text-[9px] font-bold text-amber-400/80">{fmt(pi)} PI</p>
                            )}
                          </div>
                        </div>

                        {canManage && (
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => openProvision(a, "provision")}
                              disabled={inactive}
                              className="flex-1 py-2.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-emerald-600/10 disabled:hover:text-emerald-400"
                            >
                              <ArrowDownRight size={12} /> Provisionner
                            </button>
                            <button
                              onClick={() => openProvision(a, "debit")}
                              disabled={inactive || xaf <= 0}
                              className="flex-1 py-2.5 bg-slate-800/60 border border-white/5 text-slate-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                            >
                              <ArrowUpRight size={12} /> Reprendre
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ================= HISTORIQUE ================= */}
            {tab === "history" && (
              <div className="space-y-2.5">
                {history.length === 0 ? (
                  <Empty icon={<History size={22} />} label="Aucun mouvement de float" />
                ) : (
                  history.map((m) => {
                    const isDebit = m.source === "ADMIN_DEBIT";
                    const rejected = m.status === "REJECTED";
                    const cancelled = m.status === "CANCELLED";
                    const tone = rejected
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                      : cancelled
                        ? "text-slate-400 bg-slate-500/10 border-slate-500/20"
                        : isDebit
                          ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                          : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                    return (
                      <div
                        key={m.id}
                        className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex items-start gap-3"
                      >
                        <div
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${tone}`}
                        >
                          {rejected || cancelled ? (
                            <XCircle size={13} />
                          ) : isDebit ? (
                            <ArrowUpRight size={13} />
                          ) : (
                            <ArrowDownRight size={13} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-white truncate">
                            {agentLabel(m.agent ?? {})}
                          </p>
                          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                            {dateFmt(m.createdAt)}
                            {m.decidedByName ? ` · ${m.decidedByName}` : ""}
                          </p>
                          {m.rejectReason && (
                            <p className="text-[9px] text-rose-400/80 mt-1">{m.rejectReason}</p>
                          )}
                          {!m.rejectReason && m.note && (
                            <p className="text-[9px] text-slate-500 mt-1 truncate">{m.note}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-xs font-black ${
                              rejected || cancelled
                                ? "text-slate-500 line-through"
                                : isDebit
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }`}
                          >
                            {isDebit ? "-" : "+"}
                            {fmt(m.amount)}
                          </p>
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-wider">
                            {m.currency} · {m.status}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ============ MODALE PROVISION / REPRISE ============ */}
      {target && (
        <Sheet
          title={target.mode === "debit" ? "Reprise de float" : "Provisionner le float"}
          subtitle={agentLabel(target.agent)}
          onClose={closeProvision}
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-800/40 border border-white/5 px-4 py-3 flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Solde actuel
              </p>
              <p className="text-sm font-black text-white">
                {fmt(target.agent.wallets.find((w) => w.currency === currency)?.balance ?? 0)}{" "}
                <span className="text-[9px] text-slate-500">{currency}</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Montant</Label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-base font-black text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40"
                />
              </div>
              <div>
                <Label>Devise</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-3 py-3 text-xs font-black text-white focus:outline-none focus:border-blue-500/40"
                >
                  {FLOAT_CURRENCIES.map((c) => (
                    <option key={c} value={c} className="bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="rounded-xl border border-white/10 bg-slate-800/50 px-3 py-1.5 text-[10px] font-black text-slate-300 hover:border-blue-500/40 hover:text-white transition-colors"
                >
                  {fmt(v)}
                </button>
              ))}
            </div>

            <div>
              <Label>Motif (optionnel)</Label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reference bordereau, motif de l'operation..."
                className="w-full min-h-[76px] bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40"
              />
            </div>

            <button
              onClick={submitProvision}
              disabled={busy === "modal" || !amount || parseFloat(amount) <= 0}
              className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                target.mode === "debit"
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >
              {busy === "modal" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : target.mode === "debit" ? (
                <ArrowUpRight size={15} />
              ) : (
                <ArrowDownRight size={15} />
              )}
              {target.mode === "debit" ? "Confirmer la reprise" : "Crediter le float"}
            </button>
          </div>
        </Sheet>
      )}

      {/* ============ MODALE APPROBATION / REFUS ============ */}
      {decision && (
        <Sheet
          title={decision.mode === "approve" ? "Valider la demande" : "Refuser la demande"}
          subtitle={`${agentLabel(decision.req.agent ?? {})} · ${decision.req.reference}`}
          onClose={closeDecision}
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-800/40 border border-white/5 px-4 py-3 flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Montant demande
              </p>
              <p className="text-sm font-black text-amber-400">
                {fmt(decision.req.amount)}{" "}
                <span className="text-[9px] text-slate-500">{decision.req.currency}</span>
              </p>
            </div>

            {decision.req.note && (
              <p className="text-[10px] text-slate-400 leading-relaxed px-1">{decision.req.note}</p>
            )}

            {decision.mode === "approve" ? (
              <div>
                <Label>Montant accorde</Label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={decisionAmount}
                  onChange={(e) => setDecisionAmount(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-base font-black text-white focus:outline-none focus:border-blue-500/40"
                />
                <p className="text-[9px] text-slate-600 mt-2 px-1">
                  Ajustez librement le montant avant de crediter le float de l&apos;agent.
                </p>
              </div>
            ) : (
              <div>
                <Label>Motif du refus</Label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explication communiquee a l'agent..."
                  className="w-full min-h-[76px] bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40"
                />
              </div>
            )}

            <button
              onClick={submitDecision}
              disabled={busy === "decision"}
              className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                decision.mode === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {busy === "decision" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : decision.mode === "approve" ? (
                <CheckCircle2 size={15} />
              ) : (
                <XCircle size={15} />
              )}
              {decision.mode === "approve" ? "Valider et crediter" : "Confirmer le refus"}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sous-composants                                                    */
/* ------------------------------------------------------------------ */

function Metric({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-slate-500">
        {icon}
        <p className="text-[8px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-sm font-black text-white mt-1 leading-tight">{value}</p>
      {sub && <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{sub}</p>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">
      {children}
    </p>
  );
}

function Empty({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-700">
      <div className="mb-3 opacity-40">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
  );
}

function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[70] max-h-[90dvh] overflow-y-auto rounded-t-[2rem] border-t border-white/10 bg-[#0a0f1a] px-5 pt-5 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-[420px] sm:max-h-[90dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:border sm:pb-8">
        <div className="flex items-start justify-between mb-5">
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">{title}</h2>
            {subtitle && (
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
