"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Vault, Loader2, ShieldCheck, AlertTriangle, Camera, History,
  ArrowUpRight, ArrowDownRight, Minus, Snowflake, Flame,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

type Row = {
  asset: string;
  onChainHot: number;
  onChainCold: number;
  reserves: number;
  userLiabilities: number;
  difference: number;
  coverageRatio: number;
  priceUSD: number;
  reservesUSD: number;
  liabilitiesUSD: number;
  status: string;
};
type Snapshot = {
  id: string; asset: string; onChainHot: number; onChainCold: number;
  userLiabilities: number; difference: number; coverageRatio: number; status: string; createdAt: string;
};
type Data = {
  reserves: { rows: Row[]; totals: { reservesUSD: number; liabilitiesUSD: number }; globalCoverage: number };
  snapshots: Snapshot[];
};

const usd = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const statusColor: Record<string, string> = {
  SURPLUS: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  BALANCED: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  DEFICIT: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export default function ReservesPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapping, setSnapping] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reserves", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Erreur de chargement des réserves");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function takeSnapshot() {
    setSnapping(true);
    try {
      const res = await fetch("/api/admin/reserves", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "snapshot" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(`Snapshot capturé · ${d.count} actif(s)`);
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSnapping(false);
    }
  }

  const cov = data?.reserves.globalCoverage ?? 1;
  const covPct = (cov * 100).toFixed(2);
  const covTone = cov >= 1 ? "emerald" : cov >= 0.95 ? "amber" : "rose";

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <AdminTopNav title="Preuve de réserves" subtitle="Solvabilité" backPath="/admin" onRefresh={fetchData} />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-16 text-blue-500"><Loader2 className="animate-spin" size={28} /></div>
        ) : !data ? (
          <Empty label="Aucune donnée" />
        ) : (
          <>
            {/* Couverture globale */}
            <div className={`rounded-[2rem] p-6 mb-5 border ${
              covTone === "emerald" ? "bg-emerald-500/5 border-emerald-500/20" :
              covTone === "amber" ? "bg-amber-500/5 border-amber-500/20" : "bg-rose-500/5 border-rose-500/20"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className={
                    covTone === "emerald" ? "text-emerald-400" : covTone === "amber" ? "text-amber-400" : "text-rose-400"
                  } />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Couverture globale</p>
                </div>
                <span className={`text-[8px] font-black px-2 py-1 rounded-full border uppercase ${
                  cov >= 1 ? statusColor.SURPLUS : statusColor.DEFICIT
                }`}>{cov >= 1 ? "Solvable" : "Déficit"}</span>
              </div>
              <p className={`text-4xl font-black mt-3 leading-none ${
                covTone === "emerald" ? "text-emerald-400" : covTone === "amber" ? "text-amber-400" : "text-rose-400"
              }`}>{covPct}%</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Réserves</p>
                  <p className="text-sm font-black text-white">{usd(data.reserves.totals.reservesUSD)}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Passif (utilisateurs)</p>
                  <p className="text-sm font-black text-white">{usd(data.reserves.totals.liabilitiesUSD)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={takeSnapshot}
              disabled={snapping}
              className="w-full mb-6 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {snapping ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              Capturer un instantané
            </button>

            {/* Réconciliation par actif */}
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Réconciliation par actif</p>
            <div className="space-y-3 mb-8">
              {data.reserves.rows.map((r) => (
                <div key={r.asset} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white uppercase">{r.asset}</span>
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${statusColor[r.status]}`}>{r.status}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.difference > 0.01 ? <ArrowUpRight size={14} className="text-emerald-400" /> :
                       r.difference < -0.01 ? <ArrowDownRight size={14} className="text-rose-400" /> :
                       <Minus size={14} className="text-slate-500" />}
                      <span className="text-[11px] font-black tabular-nums text-white">{(r.coverageRatio * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Cell icon={<Flame size={12} className="text-orange-400" />} label="Hot" value={r.onChainHot} />
                    <Cell icon={<Snowflake size={12} className="text-cyan-400" />} label="Cold" value={r.onChainCold} />
                    <Cell icon={<Vault size={12} className="text-blue-400" />} label="Passif" value={r.userLiabilities} />
                  </div>
                  <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${r.coverageRatio >= 1 ? "bg-emerald-500" : r.coverageRatio >= 0.95 ? "bg-amber-500" : "bg-rose-500"}`}
                      style={{ width: `${Math.min(100, r.coverageRatio * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Historique des snapshots */}
            <div className="flex items-center gap-2 mb-3 ml-1">
              <History size={13} className="text-slate-500" />
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Historique des instantanés</p>
            </div>
            {data.snapshots.length === 0 ? (
              <Empty label="Aucun instantané enregistré" />
            ) : (
              <div className="space-y-2">
                {data.snapshots.slice(0, 20).map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-slate-900/40 border border-white/5 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-white uppercase w-12">{s.asset}</span>
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${statusColor[s.status]}`}>{s.status}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black tabular-nums text-white">{(s.coverageRatio * 100).toFixed(1)}%</p>
                      <p className="text-[8px] text-slate-600 font-mono">
                        {new Date(s.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Cell({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white/[0.02] rounded-xl py-2">
      <div className="flex items-center justify-center gap-1 mb-1">{icon}<span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{label}</span></div>
      <p className="text-[11px] font-black tabular-nums text-white">{value.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return <div className="flex flex-col items-center py-16 text-slate-600"><AlertTriangle size={28} className="mb-3 opacity-30" /><p className="text-[10px] font-black uppercase tracking-widest text-center">{label}</p></div>;
}
