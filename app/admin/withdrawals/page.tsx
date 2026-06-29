"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, Loader2, AlertTriangle, Check, X, Ban, Snowflake, Plus,
  Power, Trash2, RefreshCw, Wallet, ListChecks,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

type UserLite = { id: string; username: string | null; name: string | null; email: string | null; avatar: string | null } | null;
type Address = {
  id: string; userId: string; asset: string; network: string | null; address: string;
  label: string | null; status: string; rejectReason: string | null; createdAt: string; user: UserLite;
};
type ColdWallet = {
  id: string; asset: string; network: string | null; label: string; address: string;
  custodian: string | null; balance: number; isActive: boolean; lastSyncAt: string | null;
};
type Stats = { pending: number; approved: number; coldActive: number; coldTotalUSD: number };

const usd = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const statusColor: Record<string, string> = {
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  APPROVED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  REJECTED: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  REVOKED: "text-slate-400 bg-white/5 border-white/10",
};

export default function WithdrawalsPage() {
  const [tab, setTab] = useState<"whitelist" | "cold">("whitelist");
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [coldWallets, setColdWallets] = useState<ColdWallet[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState("ALL");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals?status=${filter}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setAddresses(d.addresses); setColdWallets(d.coldWallets); setStats(d.stats);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function post(payload: any, msg: string) {
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(msg);
      await fetchData();
    } catch (e: any) { toast.error(e.message || "Erreur"); }
  }

  function createCold() {
    const label = prompt("Libellé du cold wallet :", "Cold Storage BTC");
    if (!label) return;
    const asset = prompt("Actif (BTC, ETH, USDT, PI…) :", "BTC")?.toUpperCase() || "BTC";
    const network = prompt("Réseau (optionnel) :", "") || null;
    const address = prompt("Adresse :", "") || "";
    const custodian = prompt("Custodien (interne, Fireblocks, Ledger…) :", "interne") || null;
    const balance = Number(prompt("Solde initial :", "0")) || 0;
    post({ action: "createColdWallet", label, asset, network, address, custodian, balance }, "Cold wallet créé");
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <AdminTopNav title="Retraits & Cold Wallets" subtitle="Custody" backPath="/admin" onRefresh={fetchData} />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <MiniStat label="En attente" value={String(stats?.pending ?? 0)} tone="amber" />
          <MiniStat label="Cold actifs" value={String(stats?.coldActive ?? 0)} tone="cyan" />
          <MiniStat label="Réserves cold" value={usd(stats?.coldTotalUSD ?? 0)} tone="blue" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-900/60 rounded-2xl border border-white/5">
          {[
            { id: "whitelist", label: "Whitelist retraits", icon: <ListChecks size={14} /> },
            { id: "cold", label: "Cold wallets", icon: <Snowflake size={14} /> },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tab === t.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-blue-500"><Loader2 className="animate-spin" size={28} /></div>
        ) : tab === "whitelist" ? (
          <>
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
              {["ALL", "PENDING", "APPROVED", "REJECTED", "REVOKED"].map((s) => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap border ${filter === s ? "bg-blue-600 text-white border-blue-500" : "bg-white/5 text-slate-400 border-white/5"}`}>
                  {s === "ALL" ? "Tous" : s}
                </button>
              ))}
            </div>
            {addresses.length === 0 ? <Empty label="Aucune adresse" /> : (
              <div className="space-y-3">
                {addresses.map((a) => (
                  <div key={a.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-black text-white uppercase">{a.asset}</span>
                          {a.network && <span className="text-[8px] font-bold text-slate-500 uppercase">{a.network}</span>}
                          <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${statusColor[a.status]}`}>{a.status}</span>
                        </div>
                        {a.label && <p className="text-[10px] text-slate-300 mt-1">{a.label}</p>}
                        <p className="text-[9px] text-slate-500 font-mono mt-1 break-all">{a.address}</p>
                        <p className="text-[9px] text-slate-600 font-mono mt-1">
                          {a.user?.username || a.user?.email || a.userId}
                        </p>
                        {a.rejectReason && <p className="text-[9px] text-rose-400 mt-1">Motif: {a.rejectReason}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                      {a.status !== "APPROVED" && (
                        <Btn onClick={() => post({ action: "approveAddress", id: a.id }, "Adresse approuvée")} tone="emerald" icon={<Check size={12} />} label="Approuver" />
                      )}
                      {a.status === "PENDING" && (
                        <Btn onClick={() => { const r = prompt("Motif du rejet :"); if (r) post({ action: "rejectAddress", id: a.id, reason: r }, "Adresse rejetée"); }} tone="rose" icon={<X size={12} />} label="Rejeter" />
                      )}
                      {a.status === "APPROVED" && (
                        <Btn onClick={() => confirm("Révoquer cette adresse ?") && post({ action: "revokeAddress", id: a.id }, "Adresse révoquée")} tone="slate" icon={<Ban size={12} />} label="Révoquer" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button onClick={createCold} className="w-full mb-4 py-3.5 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:bg-white/5 flex items-center justify-center gap-2">
              <Plus size={14} /> Nouveau cold wallet
            </button>
            {coldWallets.length === 0 ? <Empty label="Aucun cold wallet" /> : (
              <div className="space-y-3">
                {coldWallets.map((c) => (
                  <div key={c.id} className={`bg-slate-900/40 border rounded-2xl p-4 ${c.isActive ? "border-white/5" : "border-white/5 opacity-60"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Snowflake size={14} className="text-cyan-400" />
                          <span className="text-[12px] font-black text-white uppercase tracking-tight">{c.label}</span>
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">{c.asset}</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-mono mt-1 break-all">{c.address || "—"}</p>
                        <p className="text-[9px] text-slate-600 font-mono mt-1">
                          {c.custodian || "custody interne"}{c.network ? ` · ${c.network}` : ""}
                          {c.lastSyncAt ? ` · sync ${new Date(c.lastSyncAt).toLocaleDateString("fr-FR")}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-white tabular-nums">{c.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase">{c.asset}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                      <Btn onClick={() => { const b = prompt("Nouveau solde :", String(c.balance)); if (b !== null) post({ action: "updateColdBalance", id: c.id, balance: Number(b) }, "Solde mis à jour"); }} tone="blue" icon={<RefreshCw size={12} />} label="Solde" />
                      <Btn onClick={() => post({ action: "toggleColdWallet", id: c.id, isActive: !c.isActive }, "Statut mis à jour")} tone={c.isActive ? "emerald" : "slate"} icon={<Power size={12} />} label={c.isActive ? "Actif" : "Inactif"} />
                      <Btn onClick={() => confirm("Supprimer ce cold wallet ?") && post({ action: "deleteColdWallet", id: c.id }, "Supprimé")} tone="rose" icon={<Trash2 size={12} />} label="Suppr." />
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

function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  const map: Record<string, string> = { amber: "text-amber-400 bg-amber-500/10", cyan: "text-cyan-400 bg-cyan-500/10", blue: "text-blue-400 bg-blue-500/10" };
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
      <div className={`inline-flex p-2 rounded-xl mb-2 ${map[tone]}`}><Wallet size={16} /></div>
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
    slate: "bg-white/5 text-slate-400 border-white/10",
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border ${map[tone]}`}>
      {icon}{label}
    </button>
  );
}
function Empty({ label }: { label: string }) {
  return <div className="flex flex-col items-center py-16 text-slate-600"><AlertTriangle size={28} className="mb-3 opacity-30" /><p className="text-[10px] font-black uppercase tracking-widest text-center">{label}</p></div>;
}
