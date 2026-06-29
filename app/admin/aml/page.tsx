"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ShieldAlert, Loader2, Activity, Gauge, FileWarning, SlidersHorizontal,
  Plus, Power, Trash2, RadarIcon, Check, AlertTriangle,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

type Rule = {
  id: string; name: string; type: string; threshold: number; windowHours: number;
  currency: string | null; action: string; severity: string; enabled: boolean; hits: number;
};
type UserLite = { id: string; username: string | null; name: string | null; email: string | null; avatar: string | null; kycStatus?: string; country?: string | null } | null;
type Sar = {
  id: string; title: string; type: string; severity: string; status: string;
  amount: number | null; currency: string | null; description: string | null;
  detectedBy: string; createdAt: string; user: UserLite;
};
type Profile = { id: string; userId: string; score: number; level: string; factors: any; flagsCount: number; user: UserLite };
type Stats = { open: number; total: number; byStatus: Record<string, number>; bySeverity: Record<string, number>; activeRules: number };

const sevColor: Record<string, string> = {
  LOW: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  MEDIUM: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  HIGH: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  CRITICAL: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export default function AmlPage() {
  const [tab, setTab] = useState<"overview" | "alerts" | "rules">("overview");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [sars, setSars] = useState<Sar[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/aml", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setStats(d.stats); setRules(d.rules); setSars(d.sars); setProfiles(d.profiles);
    } catch {
      toast.error("Erreur de chargement AML");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function post(payload: any, msg: string) {
    try {
      const res = await fetch("/api/admin/aml", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erreur");
      toast.success(msg);
      await fetchData();
      return d;
    } catch (e: any) { toast.error(e.message); }
  }

  async function runScan() {
    setScanning(true);
    const d = await post({ action: "scan" }, "Scan terminé");
    if (d) toast.success(`${d.flagged} alerte(s) · ${d.profilesUpdated} profil(s)`);
    setScanning(false);
  }

  function createRule() {
    const name = prompt("Nom de la règle :", "Gros montant > 10 000$");
    if (!name) return;
    const type = prompt("Type (AMOUNT / VELOCITY / STRUCTURING) :", "AMOUNT")?.toUpperCase() || "AMOUNT";
    const threshold = Number(prompt("Seuil (montant en USD, ou nb de tx pour VELOCITY) :", "10000")) || 0;
    const windowHours = Number(prompt("Fenêtre (heures) :", "24")) || 24;
    const severity = prompt("Sévérité (LOW/MEDIUM/HIGH/CRITICAL) :", "HIGH")?.toUpperCase() || "HIGH";
    post({ action: "createRule", name, type, threshold, windowHours, severity, ruleAction: "FLAG" }, "Règle créée");
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <AdminTopNav title="AML / Anti-fraude" subtitle="Conformité" backPath="/admin" onRefresh={fetchData} />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Scan bar */}
        <button
          onClick={runScan}
          disabled={scanning}
          className="w-full mb-5 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <RadarIcon size={16} />}
          Lancer un scan de détection
        </button>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <MiniStat label="Alertes ouvertes" value={stats?.open ?? 0} icon={<FileWarning size={16} />} tone="rose" />
          <MiniStat label="Règles actives" value={stats?.activeRules ?? 0} icon={<SlidersHorizontal size={16} />} tone="blue" />
          <MiniStat label="Profils à risque" value={profiles.filter((p) => p.level === "HIGH" || p.level === "CRITICAL").length} icon={<Gauge size={16} />} tone="amber" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-900/60 rounded-2xl border border-white/5">
          {[
            { id: "overview", label: "Risque", icon: <Gauge size={14} /> },
            { id: "alerts", label: "Alertes (SAR)", icon: <ShieldAlert size={14} /> },
            { id: "rules", label: "Règles", icon: <SlidersHorizontal size={14} /> },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tab === t.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading />
        ) : tab === "overview" ? (
          profiles.length === 0 ? <Empty label="Aucun profil de risque — lancez un scan" /> : (
            <div className="space-y-3">
              {profiles.map((p) => (
                <div key={p.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar user={p.user} />
                      <div className="min-w-0">
                        <p className="text-[12px] font-black text-white truncate uppercase tracking-tight">{p.user?.username || p.user?.name || "Inconnu"}</p>
                        <p className="text-[9px] text-slate-500 font-mono truncate">{p.user?.email || p.userId}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black text-white leading-none">{p.score}</p>
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${sevColor[p.level]}`}>{p.level}</span>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p.score >= 85 ? "bg-rose-500" : p.score >= 60 ? "bg-orange-500" : p.score >= 30 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${p.score}%` }} />
                  </div>
                  {Array.isArray(p.factors) && p.factors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.factors.slice(0, 5).map((f: string, i: number) => (
                        <span key={i} className="text-[8px] font-bold px-2 py-0.5 bg-white/5 text-slate-400 rounded-full border border-white/5">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : tab === "alerts" ? (
          sars.length === 0 ? <Empty label="Aucune alerte" /> : (
            <div className="space-y-3">
              {sars.map((s) => (
                <div key={s.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${sevColor[s.severity]}`}>{s.severity}</span>
                        <p className="text-[12px] font-black text-white uppercase tracking-tight">{s.title}</p>
                      </div>
                      {s.description && <p className="text-[10px] text-slate-400 mt-1">{s.description}</p>}
                      <p className="text-[9px] text-slate-600 font-mono mt-1">
                        {s.user?.username || s.user?.email || "—"} · {s.detectedBy} · {new Date(s.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                    {["REVIEWING", "REPORTED", "DISMISSED", "CLOSED"].map((st) => (
                      <button key={st} disabled={s.status === st}
                        onClick={() => post({ action: "updateSar", sarId: s.id, status: st }, `Statut → ${st}`)}
                        className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider bg-white/5 text-slate-400 border border-white/5 hover:text-white disabled:opacity-30">
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            <button onClick={createRule} className="w-full py-3.5 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-white/5 flex items-center justify-center gap-2">
              <Plus size={14} /> Nouvelle règle de surveillance
            </button>
            {rules.length === 0 ? <Empty label="Aucune règle configurée" /> : rules.map((r) => (
              <div key={r.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[12px] font-black text-white uppercase tracking-tight">{r.name}</p>
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${sevColor[r.severity]}`}>{r.severity}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono mt-1 uppercase">
                      {r.type} · seuil {r.threshold}{r.currency ? ` ${r.currency}` : "$"} · {r.windowHours}h · action {r.action}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => post({ action: "toggleRule", ruleId: r.id, enabled: !r.enabled }, "Règle mise à jour")}
                      className={`p-2 rounded-xl ${r.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-500"}`}>
                      <Power size={14} />
                    </button>
                    <button onClick={() => confirm("Supprimer cette règle ?") && post({ action: "deleteRule", ruleId: r.id }, "Règle supprimée")}
                      className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  const map: Record<string, string> = { rose: "text-rose-400 bg-rose-500/10", blue: "text-blue-400 bg-blue-500/10", amber: "text-amber-400 bg-amber-500/10" };
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
      <div className={`inline-flex p-2 rounded-xl mb-2 ${map[tone]}`}>{icon}</div>
      <p className="text-xl font-black text-white leading-none">{value}</p>
      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">{label}</p>
    </div>
  );
}
function Avatar({ user }: { user: UserLite }) {
  if (user?.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatar} alt={user.name || "u"} className="w-10 h-10 rounded-xl object-cover border border-white/10" crossOrigin="anonymous" />;
  }
  return <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 font-black uppercase">{(user?.username || user?.name || "?")[0]}</div>;
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "text-rose-400 bg-rose-500/10 border-rose-500/20", REVIEWING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    REPORTED: "text-blue-400 bg-blue-500/10 border-blue-500/20", DISMISSED: "text-slate-400 bg-white/5 border-white/10",
    CLOSED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };
  return <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase shrink-0 ${map[status] || map.OPEN}`}>{status}</span>;
}
function Loading() { return <div className="flex justify-center py-16 text-blue-500"><Loader2 className="animate-spin" size={28} /></div>; }
function Empty({ label }: { label: string }) {
  return <div className="flex flex-col items-center py-16 text-slate-600"><AlertTriangle size={28} className="mb-3 opacity-30" /><p className="text-[10px] font-black uppercase tracking-widest text-center">{label}</p></div>;
}
