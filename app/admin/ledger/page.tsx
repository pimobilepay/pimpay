"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  BookOpen, Loader2, AlertTriangle, Scale, Plus, CheckCircle2, XCircle, X,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

type Entry = {
  id: string; entryDate: string; account: string; description: string | null;
  debit: number; credit: number; currency: string; type: string; reference: string | null;
};
type TrialRow = { account: string; currency: string; debit: number; credit: number; balance: number };
type BalanceCheck = { currency: string; totalDebit: number; totalCredit: number; difference: number; balanced: boolean };
type Data = { entries: Entry[]; trialBalance: TrialRow[]; balanceChecks: BalanceCheck[] };

const num = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ACCOUNTS = ["HOT_WALLET", "COLD_WALLET", "USER_LIABILITY", "FEES_INCOME", "FX_GAINS", "MANUAL_ADJUSTMENT"];

export default function LedgerPage() {
  const [tab, setTab] = useState<"balance" | "entries">("balance");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ debitAccount: "HOT_WALLET", creditAccount: "USER_LIABILITY", amount: "", currency: "USD", description: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ledger", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Erreur de chargement du grand livre");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function submit() {
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Montant invalide");
    if (form.debitAccount === form.creditAccount) return toast.error("Comptes débit/crédit identiques");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ledger", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Écriture enregistrée");
      setShowForm(false);
      setForm({ debitAccount: "HOT_WALLET", creditAccount: "USER_LIABILITY", amount: "", currency: "USD", description: "" });
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <AdminTopNav title="Grand livre" subtitle="Comptabilité" backPath="/admin" onRefresh={fetchData} />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Équilibre global */}
        {data && (
          <div className="space-y-2 mb-5">
            {data.balanceChecks.map((b) => (
              <div key={b.currency} className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${
                b.balanced ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
              }`}>
                <div className="flex items-center gap-2">
                  {b.balanced ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-rose-400" />}
                  <span className="text-[11px] font-black uppercase text-white">{b.currency}</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{b.balanced ? "Équilibré" : "Écart détecté"}</span>
                </div>
                <div className="text-right">
                  <p className={`text-[11px] font-black tabular-nums ${b.balanced ? "text-emerald-400" : "text-rose-400"}`}>
                    {b.difference === 0 ? "0.00" : num(b.difference)}
                  </p>
                  <p className="text-[8px] text-slate-600 font-mono">D {num(b.totalDebit)} · C {num(b.totalCredit)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowForm(true)}
          className="w-full mb-6 py-3.5 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-white/5 flex items-center justify-center gap-2">
          <Plus size={14} /> Écriture d'ajustement (partie double)
        </button>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-900/60 rounded-2xl border border-white/5">
          {[
            { id: "balance", label: "Balance de vérification", icon: <Scale size={14} /> },
            { id: "entries", label: "Écritures", icon: <BookOpen size={14} /> },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tab === t.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-blue-500"><Loader2 className="animate-spin" size={28} /></div>
        ) : !data ? (
          <Empty label="Aucune donnée" />
        ) : tab === "balance" ? (
          data.trialBalance.length === 0 ? <Empty label="Aucun compte mouvementé" /> : (
            <div className="space-y-2">
              {data.trialBalance.map((r, i) => (
                <div key={i} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-white uppercase tracking-tight">{r.account.replace(/_/g, " ")}</span>
                    <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">{r.currency}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Cell label="Débit" value={r.debit} tone="emerald" />
                    <Cell label="Crédit" value={r.credit} tone="rose" />
                    <Cell label="Solde" value={r.balance} tone={r.balance >= 0 ? "white" : "amber"} />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          data.entries.length === 0 ? <Empty label="Aucune écriture" /> : (
            <div className="space-y-2">
              {data.entries.map((e) => (
                <div key={e.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-white uppercase tracking-tight">{e.account.replace(/_/g, " ")}</span>
                        {e.type === "MANUAL_ADJUSTMENT" && <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">Manuel</span>}
                      </div>
                      {e.description && <p className="text-[10px] text-slate-400 mt-1">{e.description}</p>}
                      <p className="text-[8px] text-slate-600 font-mono mt-1">
                        {e.reference || "—"} · {new Date(e.entryDate).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {e.debit > 0 && <p className="text-[11px] font-black text-emerald-400 tabular-nums">D {num(e.debit)}</p>}
                      {e.credit > 0 && <p className="text-[11px] font-black text-rose-400 tabular-nums">C {num(e.credit)}</p>}
                      <p className="text-[8px] text-slate-600 font-bold uppercase">{e.currency}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal ajustement */}
      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-[#0a0f1a] border border-white/10 rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Écriture d'ajustement</h3>
              <button onClick={() => setShowForm(false)} className="p-2 bg-white/5 rounded-xl"><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Compte débité">
                <select value={form.debitAccount} onChange={(e) => setForm({ ...form, debitAccount: e.target.value })} className="input-select">
                  {ACCOUNTS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
                </select>
              </Field>
              <Field label="Compte crédité">
                <select value={form.creditAccount} onChange={(e) => setForm({ ...form, creditAccount: e.target.value })} className="input-select">
                  {ACCOUNTS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Montant">
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="input-select" />
                </Field>
                <Field label="Devise">
                  <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="input-select" />
                </Field>
              </div>
              <Field label="Description">
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Motif de l'ajustement" className="input-select" />
              </Field>
              <button onClick={submit} disabled={saving}
                className="w-full py-3.5 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-select {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.75rem;
          padding: 0.7rem 0.9rem;
          font-size: 12px;
          font-weight: 600;
          color: white;
          outline: none;
        }
        .input-select::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: number; tone: string }) {
  const colors: Record<string, string> = { emerald: "text-emerald-400", rose: "text-rose-400", amber: "text-amber-400", white: "text-white" };
  return (
    <div className="bg-white/[0.02] rounded-xl py-2">
      <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-[11px] font-black tabular-nums ${colors[tone]}`}>{num(value)}</p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return <div className="flex flex-col items-center py-16 text-slate-600"><AlertTriangle size={28} className="mb-3 opacity-30" /><p className="text-[10px] font-black uppercase tracking-widest text-center">{label}</p></div>;
}
