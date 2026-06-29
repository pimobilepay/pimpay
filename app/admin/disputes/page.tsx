"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Gavel, Loader2, AlertTriangle, Plus, X, UserCheck, CheckCircle2, XCircle, RotateCcw, ArrowUpCircle,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

type UserLite = { id: string; username: string | null; name: string | null; email: string | null; avatar: string | null } | null;
type Dispute = {
  id: string; reference: string; userId: string | null; transactionId: string | null;
  type: string; status: string; amount: number; currency: string; reason: string | null;
  description: string | null; resolution: string | null; openedAt: string; resolvedAt: string | null; user: UserLite;
};
type Stats = { open: number; openAmount: number; byStatus: Record<string, number>; total: number };

const statusColor: Record<string, string> = {
  OPEN: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  UNDER_REVIEW: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  ESCALATED: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  RESOLVED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  REFUNDED: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  REJECTED: "text-slate-400 bg-white/5 border-white/10",
};
const typeColor: Record<string, string> = {
  CHARGEBACK: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  FRAUD: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  UNAUTHORIZED: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  DUPLICATE: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  DISPUTE: "text-slate-400 bg-white/5 border-white/10",
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "CHARGEBACK", transactionId: "", userId: "", amount: "", currency: "XAF", reason: "", description: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/disputes?status=${statusFilter}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setDisputes(d.disputes); setStats(d.stats);
    } catch {
      toast.error("Erreur de chargement des litiges");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function post(payload: any, msg: string) {
    try {
      const res = await fetch("/api/admin/disputes", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(msg);
      await fetchData();
    } catch (e: any) { toast.error(e.message || "Erreur"); }
  }

  async function createDispute() {
    if (!form.transactionId && !form.userId) return toast.error("Transaction ou utilisateur requis");
    setSaving(true);
    await post({ action: "create", ...form, amount: Number(form.amount) || 0 }, "Litige créé");
    setSaving(false);
    setShowForm(false);
    setForm({ type: "CHARGEBACK", transactionId: "", userId: "", amount: "", currency: "XAF", reason: "", description: "" });
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <AdminTopNav title="Litiges & Chargebacks" subtitle="Résolution" backPath="/admin" onRefresh={fetchData} />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4">
            <p className="text-2xl font-black text-rose-400 leading-none">{stats?.open ?? 0}</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Litiges ouverts</p>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
            <p className="text-2xl font-black text-white leading-none">{(stats?.openAmount ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Montant en jeu</p>
          </div>
        </div>

        <button onClick={() => setShowForm(true)}
          className="w-full mb-5 py-3.5 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-white/5 flex items-center justify-center gap-2">
          <Plus size={14} /> Ouvrir un litige
        </button>

        <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
          {["ALL", "OPEN", "UNDER_REVIEW", "ESCALATED", "RESOLVED", "REFUNDED", "REJECTED"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap border ${statusFilter === s ? "bg-blue-600 text-white border-blue-500" : "bg-white/5 text-slate-400 border-white/5"}`}>
              {s === "ALL" ? "Tous" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-blue-500"><Loader2 className="animate-spin" size={28} /></div>
        ) : disputes.length === 0 ? (
          <Empty label="Aucun litige" />
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => (
              <div key={d.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${typeColor[d.type] || typeColor.DISPUTE}`}>{d.type}</span>
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${statusColor[d.status]}`}>{d.status.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-[13px] font-black text-white mt-1.5 tabular-nums">{d.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} {d.currency}</p>
                    {d.reason && <p className="text-[10px] text-slate-300 mt-1">{d.reason}</p>}
                    {d.description && <p className="text-[10px] text-slate-500 mt-0.5">{d.description}</p>}
                    <p className="text-[9px] text-slate-600 font-mono mt-1">
                      {d.reference.slice(0, 10)} · {d.user?.username || d.user?.email || "—"} · {new Date(d.openedAt).toLocaleDateString("fr-FR")}
                    </p>
                    {d.resolution && <p className="text-[9px] text-emerald-400 mt-1">Résolution: {d.resolution}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                  {d.status === "OPEN" && (
                    <Btn onClick={() => post({ action: "assign", id: d.id }, "Litige pris en charge")} tone="amber" icon={<UserCheck size={12} />} label="Prendre en charge" />
                  )}
                  {!["RESOLVED", "REFUNDED", "REJECTED"].includes(d.status) && (
                    <>
                      <Btn onClick={() => post({ action: "updateStatus", id: d.id, status: "ESCALATED" }, "Litige escaladé")} tone="orange" icon={<ArrowUpCircle size={12} />} label="Escalader" />
                      <Btn onClick={() => { const r = prompt("Note de résolution :"); post({ action: "updateStatus", id: d.id, status: "RESOLVED", resolution: r || "Résolu" }, "Litige résolu"); }} tone="emerald" icon={<CheckCircle2 size={12} />} label="Résoudre" />
                      <Btn onClick={() => confirm(`Rembourser ${d.amount} ${d.currency} à l'utilisateur ?`) && post({ action: "updateStatus", id: d.id, status: "REFUNDED", resolution: "Remboursement émis" }, "Remboursé")} tone="blue" icon={<RotateCcw size={12} />} label="Rembourser" />
                      <Btn onClick={() => post({ action: "updateStatus", id: d.id, status: "REJECTED", resolution: "Rejeté" }, "Litige rejeté")} tone="slate" icon={<XCircle size={12} />} label="Rejeter" />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-[#0a0f1a] border border-white/10 rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Nouveau litige</h3>
              <button onClick={() => setShowForm(false)} className="p-2 bg-white/5 rounded-xl"><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Type">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="d-input">
                  {["CHARGEBACK", "FRAUD", "UNAUTHORIZED", "DUPLICATE", "DISPUTE"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="ID Transaction (auto-remplit montant/utilisateur)">
                <input value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} placeholder="cuid de la transaction" className="d-input" />
              </Field>
              <Field label="ou ID Utilisateur">
                <input value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="cuid de l'utilisateur" className="d-input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Montant"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="d-input" /></Field>
                <Field label="Devise"><input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="d-input" /></Field>
              </div>
              <Field label="Motif"><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Raison du litige" className="d-input" /></Field>
              <button onClick={createDispute} disabled={saving}
                className="w-full py-3.5 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />} Ouvrir le litige
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .d-input {
          width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.75rem; padding: 0.7rem 0.9rem; font-size: 12px; font-weight: 600; color: white; outline: none;
        }
        .d-input::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}

function Btn({ onClick, tone, icon, label }: { onClick: () => void; tone: string; icon: React.ReactNode; label: string }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    slate: "bg-white/5 text-slate-400 border-white/10",
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border ${map[tone]}`}>
      {icon}{label}
    </button>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">{label}</label>{children}</div>;
}
function Empty({ label }: { label: string }) {
  return <div className="flex flex-col items-center py-16 text-slate-600"><AlertTriangle size={28} className="mb-3 opacity-30" /><p className="text-[10px] font-black uppercase tracking-widest text-center">{label}</p></div>;
}
