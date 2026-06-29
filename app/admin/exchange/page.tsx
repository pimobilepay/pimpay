"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeft, Loader2, AlertTriangle, Plus, X, Power, Trash2, Droplets, Percent, CheckCircle2,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

type Pair = {
  id: string; base: string; quote: string; rate: number; marginBps: number; spreadBps: number;
  minAmount: number; maxAmount: number; liquidity: number; source: string; enabled: boolean;
  bid: number; ask: number; liquidityUSD: number;
};
type Stats = { total: number; enabled: number; totalLiquidityUSD: number; avgMarginBps: number };

const usd = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const empty = { base: "", quote: "", rate: "", marginBps: "50", spreadBps: "0", minAmount: "", maxAmount: "", liquidity: "" };

export default function ExchangePage() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/exchange", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPairs(d.pairs); setStats(d.stats);
    } catch {
      toast.error("Erreur de chargement des paires");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function post(payload: any, msg: string) {
    try {
      const res = await fetch("/api/admin/exchange", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(msg);
      await fetchData();
    } catch (e: any) { toast.error(e.message || "Erreur"); }
  }

  async function submit() {
    if (!form.base || !form.quote || form.base === form.quote) return toast.error("Paire invalide");
    setSaving(true);
    await post({
      action: "upsertPair", base: form.base, quote: form.quote,
      rate: Number(form.rate), marginBps: Number(form.marginBps), spreadBps: Number(form.spreadBps),
      minAmount: Number(form.minAmount), maxAmount: Number(form.maxAmount), liquidity: Number(form.liquidity),
    }, "Paire enregistrée");
    setSaving(false);
    setShowForm(false);
    setForm(empty);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <AdminTopNav title="Change & Liquidité" subtitle="Trading" backPath="/admin" onRefresh={fetchData} />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <MiniStat label="Paires actives" value={`${stats?.enabled ?? 0}/${stats?.total ?? 0}`} icon={<ArrowRightLeft size={16} />} tone="blue" />
          <MiniStat label="Liquidité totale" value={usd(stats?.totalLiquidityUSD ?? 0)} icon={<Droplets size={16} />} tone="cyan" />
          <MiniStat label="Marge moy." value={`${((stats?.avgMarginBps ?? 0) / 100).toFixed(2)}%`} icon={<Percent size={16} />} tone="emerald" />
        </div>

        <button onClick={() => { setForm(empty); setShowForm(true); }}
          className="w-full mb-6 py-3.5 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-white/5 flex items-center justify-center gap-2">
          <Plus size={14} /> Ajouter / modifier une paire
        </button>

        {loading ? (
          <div className="flex justify-center py-16 text-blue-500"><Loader2 className="animate-spin" size={28} /></div>
        ) : pairs.length === 0 ? (
          <Empty label="Aucune paire configurée" />
        ) : (
          <div className="space-y-3">
            {pairs.map((p) => (
              <div key={p.id} className={`bg-slate-900/40 border rounded-2xl p-4 ${p.enabled ? "border-white/5" : "border-white/5 opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-black text-white uppercase tracking-tight">{p.base}/{p.quote}</span>
                      <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">{p.source}</span>
                      <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 uppercase">{(p.marginBps / 100).toFixed(2)}% marge</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-mono">
                      Taux mid <span className="text-white font-black">{p.rate.toLocaleString("en-US", { maximumFractionDigits: 6 })}</span>
                    </p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-[9px] text-emerald-400 font-mono">Bid {p.bid.toLocaleString("en-US", { maximumFractionDigits: 6 })}</span>
                      <span className="text-[9px] text-rose-400 font-mono">Ask {p.ask.toLocaleString("en-US", { maximumFractionDigits: 6 })}</span>
                    </div>
                    {(p.minAmount > 0 || p.maxAmount > 0) && (
                      <p className="text-[9px] text-slate-600 font-mono mt-1">Limites: {p.minAmount} – {p.maxAmount || "∞"} {p.base}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 justify-end text-cyan-400">
                      <Droplets size={11} />
                      <p className="text-[11px] font-black tabular-nums">{p.liquidity.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                    </div>
                    <p className="text-[8px] text-slate-600 font-bold uppercase">{p.base} · {usd(p.liquidityUSD)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                  <Btn onClick={() => { const l = prompt(`Liquidité ${p.base} :`, String(p.liquidity)); if (l !== null) post({ action: "setLiquidity", id: p.id, liquidity: Number(l) }, "Liquidité mise à jour"); }} tone="cyan" icon={<Droplets size={12} />} label="Liquidité" />
                  <Btn onClick={() => { setForm({ base: p.base, quote: p.quote, rate: String(p.rate), marginBps: String(p.marginBps), spreadBps: String(p.spreadBps), minAmount: String(p.minAmount), maxAmount: String(p.maxAmount), liquidity: String(p.liquidity) }); setShowForm(true); }} tone="blue" icon={<Percent size={12} />} label="Éditer" />
                  <Btn onClick={() => post({ action: "togglePair", id: p.id, enabled: !p.enabled }, "Statut mis à jour")} tone={p.enabled ? "emerald" : "slate"} icon={<Power size={12} />} label={p.enabled ? "Active" : "Inactive"} />
                  <Btn onClick={() => confirm("Supprimer cette paire ?") && post({ action: "deletePair", id: p.id }, "Paire supprimée")} tone="rose" icon={<Trash2 size={12} />} label="Suppr." />
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
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Paire de change</h3>
              <button onClick={() => setShowForm(false)} className="p-2 bg-white/5 rounded-xl"><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Base"><input value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value.toUpperCase() })} placeholder="PI" className="x-input" /></Field>
                <Field label="Quote"><input value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value.toUpperCase() })} placeholder="XAF" className="x-input" /></Field>
              </div>
              <Field label="Taux mid (1 base = ? quote)"><input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="0.00" className="x-input" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Marge (bps)"><input type="number" value={form.marginBps} onChange={(e) => setForm({ ...form, marginBps: e.target.value })} placeholder="50" className="x-input" /></Field>
                <Field label="Spread (bps)"><input type="number" value={form.spreadBps} onChange={(e) => setForm({ ...form, spreadBps: e.target.value })} placeholder="0" className="x-input" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min"><input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} placeholder="0" className="x-input" /></Field>
                <Field label="Max"><input type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} placeholder="0" className="x-input" /></Field>
              </div>
              <Field label="Liquidité disponible (base)"><input type="number" value={form.liquidity} onChange={(e) => setForm({ ...form, liquidity: e.target.value })} placeholder="0" className="x-input" /></Field>
              <p className="text-[9px] text-slate-500">Marge en points de base : 50 bps = 0.5%. Le bid/ask est dérivé automatiquement du taux mid.</p>
              <button onClick={submit} disabled={saving}
                className="w-full py-3.5 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Enregistrer la paire
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .x-input {
          width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.75rem; padding: 0.7rem 0.9rem; font-size: 12px; font-weight: 600; color: white; outline: none;
        }
        .x-input::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}

function MiniStat({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  const map: Record<string, string> = { blue: "text-blue-400 bg-blue-500/10", cyan: "text-cyan-400 bg-cyan-500/10", emerald: "text-emerald-400 bg-emerald-500/10" };
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
      <div className={`inline-flex p-2 rounded-xl mb-2 ${map[tone]}`}>{icon}</div>
      <p className="text-base font-black text-white leading-none truncate">{value}</p>
      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">{label}</p>
    </div>
  );
}
function Btn({ onClick, tone, icon, label }: { onClick: () => void; tone: string; icon: React.ReactNode; label: string }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
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
