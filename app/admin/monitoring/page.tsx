"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, Activity, Cpu, HardDrive, Database, Server, Clock,
  Users, ArrowRightLeft, ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  Gauge, Zap, Radio, Terminal, LayoutGrid, TrendingUp, TrendingDown, Layers,
  Wifi, Lock, Globe, Coins, Timer, ListFilter, Pause, Play, Signal, Boxes,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  PolarAngleAxis,
} from "recharts";

/* ============================================================================
 * PIMOBIPAY — CENTRE DE MONITORING
 * Supervision temps reel : sante plateforme, infrastructure, base de donnees,
 * fiabilite transactionnelle, securite et flux d'activite.
 * ==========================================================================*/

type Severity = "healthy" | "degraded" | "down";

type MonitoringPayload = {
  generatedAt: string;
  collectionMs: number;
  health: {
    score: number; status: Severity; availability: number;
    degradedCount: number; downCount: number; healthyCount: number; totalServices: number;
  };
  system: {
    hostname: string; platform: string; osType: string; osRelease: string; arch: string;
    nodeVersion: string; uptime: string; uptimeSeconds: number; processUptime: string;
    region: string; environment: string; deploymentId: string; pid: number;
  };
  cpu: {
    usage: string; usageNum: number; cores: number; model: string; speed: string;
    arch: string; load1: number; load5: number; load15: number; loadPercent: number;
  };
  ram: { total: string; used: string; free: string; percent: string; percentNum: number };
  process: { heapUsed: string; heapTotal: string; heapPercent: number; rss: string; external: string; arrayBuffers: string };
  database: {
    reachable: boolean; latency: string; latencyAvg: number; latencyMin: number; latencyMax: number;
    probes: number[]; size: string; sizeBytes: number;
    connections: { total: number; active: number; idle: number; max: number };
    connectionPercent: number; cacheHitRatio: number | null;
    tables: { table: string; rows: number }[];
  };
  platform: {
    totalUsers: number; activeUsers: number; bannedUsers: number; suspendedUsers: number;
    newUsersToday: number; newUsers24h: number; userGrowth: number; kycPending: number;
    activeSessions: number; liveSessions: number; totalTransactions: number;
    transactionsToday: number; transactions24h: number; txGrowth: number;
    transactionsPending: number; transactionsFailed24h: number; transactionsSuccess24h: number;
    volume24h: number; fees24h: number; volumeTotal: number;
    throughputHour: number; throughputMinute: number; txSuccessRate: number; txFailureRate: number;
    txByType: { type: string; count: number; volume: number }[];
    txByStatus: { status: string; count: number }[];
  };
  reliability: {
    apiLatency: number; errorRate: number; errorLogs24h: number; totalLogs24h: number;
    logLevels: Record<string, number>;
    appLatency: { avg: number | null; max: number | null; samples: number };
    topSources: { source: string; count: number }[];
  };
  security: {
    blockedIps: number; proxyDetections24h: number; failedLogins24h: number;
    lockedAccounts: number; openAlerts: number; criticalAlerts: number;
  };
  timeseries: {
    hourly: { label: string; ts: string; tx: number; volume: number; fees: number; failed: number }[];
    daily: { label: string; date: string; tx: number; volume: number; failed: number; users: number }[];
  };
  services: { name: string; category: string; status: Severity; metric: string; detail: string }[];
  activityFeed: {
    id: string; kind: "system" | "admin"; level: string; source: string; action: string;
    message: string; actor: string | null; ip: string | null; duration: number | null; createdAt: string;
  }[];
};

const SEVERITY_META: Record<Severity, { label: string; text: string; bg: string; dot: string; ring: string }> = {
  healthy: { label: "Operationnel", text: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-500", ring: "border-emerald-500/20" },
  degraded: { label: "Degrade", text: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-500", ring: "border-amber-500/20" },
  down: { label: "Critique", text: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-500", ring: "border-red-500/20" },
};

const LEVEL_META: Record<string, { text: string; bg: string }> = {
  DEBUG: { text: "text-slate-400", bg: "bg-slate-500/10" },
  INFO: { text: "text-blue-400", bg: "bg-blue-500/10" },
  WARN: { text: "text-amber-400", bg: "bg-amber-500/10" },
  ERROR: { text: "text-red-400", bg: "bg-red-500/10" },
  FATAL: { text: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
};

const TYPE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#ef4444", "#84cc16"];

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : `${Math.round(n)}`;

const fmtNum = (n: number) => n.toLocaleString("fr-FR");

/* --------------------------------- ATOMES --------------------------------- */

function SectionTitle({ children, accent = "bg-blue-500" }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-1.5 h-1.5 rounded-full ${accent}`} />
      <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{children}</h2>
    </div>
  );
}

function MetricCard({
  icon: Icon, label, value, sub, trend, color = "bg-blue-500/10 text-blue-400",
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  trend?: number; color?: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-4">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
        {typeof trend === "number" && (
          <span className={`flex items-center gap-0.5 text-[9px] font-black ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xl font-black text-white mt-3 tabular-nums">{value}</p>
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-[1.5px] mt-1">{label}</p>
      {sub && <p className="text-[8px] text-slate-600 font-mono mt-1 truncate">{sub}</p>}
    </div>
  );
}

function GaugeBar({
  label, percent, valueText, icon: Icon, thresholds = [70, 88],
}: {
  label: string; percent: number; valueText: string; icon: React.ElementType; thresholds?: [number, number] | number[];
}) {
  const [warn, crit] = thresholds;
  const color = percent >= crit ? "#ef4444" : percent >= warn ? "#f59e0b" : "#3b82f6";
  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color }} />
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-[1.5px]">{label}</p>
        </div>
        <p className="text-sm font-black text-white tabular-nums">{valueText}</p>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(2, percent))}%`, background: color }}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = true, color = "text-slate-200" }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider shrink-0">{label}</span>
      <span className={`text-[10px] font-bold ${mono ? "font-mono" : ""} ${color} text-right truncate`}>{value}</span>
    </div>
  );
}

const CHART_TOOLTIP = {
  contentStyle: {
    background: "#0b1120",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    fontSize: 10,
    padding: "8px 10px",
  },
  labelStyle: { color: "#94a3b8", fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const },
  itemStyle: { fontSize: 10, fontWeight: 700 },
};

/* --------------------------------- PAGE ---------------------------------- */

export default function AdminMonitoringPage() {
  const router = useRouter();
  const [data, setData] = useState<MonitoringPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "infra" | "activity" | "security">("overview");
  const [live, setLive] = useState(true);
  const [range, setRange] = useState<"24h" | "14d">("24h");
  const [logFilter, setLogFilter] = useState<"ALL" | "WARN" | "ERROR" | "admin">("ALL");
  const [ticker, setTicker] = useState(0);
  const firstLoad = useRef(true);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/monitoring", { cache: "no-store" });
      if (res.status === 403) {
        toast.error("Acces refuse");
        router.push("/admin");
        return;
      }
      if (!res.ok) throw new Error("Collecte impossible");
      const json: MonitoringPayload = await res.json();
      setData(json);
      setError(null);
      if (!silent && !firstLoad.current) toast.success("Telemetrie actualisee");
    } catch {
      setError("Impossible de recuperer la telemetrie de la plateforme.");
      if (!silent) toast.error("Erreur de collecte");
    } finally {
      setLoading(false);
      setRefreshing(false);
      firstLoad.current = false;
    }
  }, [router]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  // Polling temps reel (10s) — suspendu quand l'onglet est en pause
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => fetchData(true), 10_000);
    return () => clearInterval(id);
  }, [live, fetchData]);

  // Horloge "derniere mise a jour"
  useEffect(() => {
    const id = setInterval(() => setTicker((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsAgo = useMemo(() => {
    if (!data) return 0;
    return Math.max(0, Math.round((Date.now() - new Date(data.generatedAt).getTime()) / 1000));
  }, [data, ticker]);

  const series = data ? (range === "24h" ? data.timeseries.hourly : data.timeseries.daily) : [];

  const filteredFeed = useMemo(() => {
    if (!data) return [];
    if (logFilter === "ALL") return data.activityFeed;
    if (logFilter === "admin") return data.activityFeed.filter((e) => e.kind === "admin");
    if (logFilter === "WARN") return data.activityFeed.filter((e) => e.level === "WARN");
    return data.activityFeed.filter((e) => e.level === "ERROR" || e.level === "FATAL");
  }, [data, logFilter]);

  /* --------------------------- ETATS DE CHARGEMENT ------------------------ */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[3px]">Collecte de la telemetrie...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-5 px-6">
        <div className="w-14 h-14 rounded-3xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <p className="text-[10px] font-bold text-slate-400 text-center max-w-xs leading-relaxed">{error}</p>
        <button onClick={() => fetchData()} className="px-6 py-3 bg-blue-600 rounded-2xl text-[9px] font-black text-white uppercase tracking-widest">
          Reessayer
        </button>
      </div>
    );
  }

  const sev = SEVERITY_META[data.health.status];
  const gaugeData = [{ name: "score", value: data.health.score, fill: data.health.score >= 85 ? "#10b981" : data.health.score >= 60 ? "#f59e0b" : "#ef4444" }];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32" translate="no">

      {/* ------------------------------ HEADER ------------------------------ */}
      <header className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.push("/admin")}
            aria-label="Retour au portail admin"
            className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PIMOBIPAY</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Monitoring</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLive((v) => !v)}
              aria-label={live ? "Suspendre le temps reel" : "Reprendre le temps reel"}
              className={`p-2.5 rounded-2xl active:scale-95 transition-all ${live ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-slate-400"}`}
            >
              {live ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => fetchData()}
              aria-label="Actualiser la telemetrie"
              className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Bandeau de statut global */}
        <div className={`border-t border-white/[0.04] ${sev.bg}`}>
          <div className="max-w-2xl mx-auto px-5 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex w-2 h-2">
                <span className={`absolute inset-0 rounded-full ${sev.dot} ${live ? "animate-ping" : ""}`} />
                <span className={`relative w-2 h-2 rounded-full ${sev.dot}`} />
              </span>
              <span className={`text-[9px] font-black uppercase tracking-[2px] ${sev.text}`}>
                Plateforme {sev.label}
              </span>
            </div>
            <span className="text-[8px] font-mono text-slate-500">
              {live ? `MAJ il y a ${secondsAgo}s` : "Temps reel en pause"} · {data.collectionMs}ms
            </span>
          </div>
        </div>
      </header>

      <div className="px-4 max-w-2xl mx-auto mt-5 space-y-7">

        {/* ------------------------------- TABS ----------------------------- */}
        <nav className="sticky top-[93px] z-40 -mx-4 px-4 py-3 bg-[#020617]/90 backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-1.5 bg-slate-900/60 border border-white/[0.06] rounded-2xl p-1.5">
            {([
              { id: "overview", label: "Sante", icon: Gauge },
              { id: "infra", label: "Infra & DB", icon: Server },
              { id: "activity", label: "Activite", icon: Terminal },
              { id: "security", label: "Securite", icon: ShieldAlert },
            ] as const).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                    active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ============================ ONGLET SANTE ======================== */}
        {tab === "overview" && (
          <>
            {/* Score de sante — element signature */}
            <section>
              <SectionTitle accent="bg-emerald-500">Indice de sante globale</SectionTitle>
              <div className="bg-slate-900/60 border border-white/[0.06] rounded-[2rem] p-5">
                <div className="flex items-center gap-4">
                  <div className="relative w-[132px] h-[132px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        data={gaugeData}
                        innerRadius="72%"
                        outerRadius="100%"
                        startAngle={225}
                        endAngle={-45}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar
                          background={{ fill: "rgba(255,255,255,0.05)" }}
                          dataKey="value"
                          cornerRadius={12}
                          angleAxisId={0}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-3xl font-black text-white tabular-nums leading-none">{data.health.score}</p>
                      <p className="text-[7px] font-black text-slate-500 uppercase tracking-[2px] mt-1">/ 100</p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-lg ${sev.bg} ${sev.text} text-[8px] font-black uppercase tracking-widest`}>
                        {sev.label}
                      </div>
                      <span className="text-[8px] font-mono text-slate-500">{data.health.availability}% dispo</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-emerald-500/[0.07] border border-emerald-500/15 rounded-xl p-2 text-center">
                        <p className="text-base font-black text-emerald-400 tabular-nums">{data.health.healthyCount}</p>
                        <p className="text-[6.5px] font-black text-slate-500 uppercase tracking-wider">Sains</p>
                      </div>
                      <div className="bg-amber-500/[0.07] border border-amber-500/15 rounded-xl p-2 text-center">
                        <p className="text-base font-black text-amber-400 tabular-nums">{data.health.degradedCount}</p>
                        <p className="text-[6.5px] font-black text-slate-500 uppercase tracking-wider">Degrades</p>
                      </div>
                      <div className="bg-red-500/[0.07] border border-red-500/15 rounded-xl p-2 text-center">
                        <p className="text-base font-black text-red-400 tabular-nums">{data.health.downCount}</p>
                        <p className="text-[6.5px] font-black text-slate-500 uppercase tracking-wider">Critiques</p>
                      </div>
                    </div>
                    <p className="text-[8px] text-slate-600 font-mono leading-relaxed">
                      {data.health.totalServices} services supervises · {data.system.environment} · {data.system.region}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* KPIs plateforme */}
            <section>
              <SectionTitle>Indicateurs plateforme</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  icon={Users} label="Utilisateurs" value={fmtNum(data.platform.totalUsers)}
                  sub={`${data.platform.activeUsers} actifs · +${data.platform.newUsersToday} auj.`}
                  trend={data.platform.userGrowth}
                  color="bg-blue-500/10 text-blue-400"
                />
                <MetricCard
                  icon={ArrowRightLeft} label="Transactions" value={fmtNum(data.platform.totalTransactions)}
                  sub={`${data.platform.transactions24h} sur 24h`}
                  trend={data.platform.txGrowth}
                  color="bg-violet-500/10 text-violet-400"
                />
                <MetricCard
                  icon={Coins} label="Volume 24h" value={compact(data.platform.volume24h)}
                  sub={`Frais ${compact(data.platform.fees24h)} · total ${compact(data.platform.volumeTotal)}`}
                  color="bg-emerald-500/10 text-emerald-400"
                />
                <MetricCard
                  icon={Signal} label="Sessions live" value={fmtNum(data.platform.liveSessions)}
                  sub={`${data.platform.activeSessions} sessions ouvertes`}
                  color="bg-cyan-500/10 text-cyan-400"
                />
              </div>

              {/* Ligne de fiabilite */}
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
                  <p className={`text-lg font-black tabular-nums ${data.platform.txSuccessRate >= 97 ? "text-emerald-400" : data.platform.txSuccessRate >= 90 ? "text-amber-400" : "text-red-400"}`}>
                    {data.platform.txSuccessRate}%
                  </p>
                  <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-[1.5px] mt-1">Taux succes</p>
                </div>
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
                  <p className="text-lg font-black text-amber-400 tabular-nums">{fmtNum(data.platform.transactionsPending)}</p>
                  <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-[1.5px] mt-1">En attente</p>
                </div>
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
                  <p className="text-lg font-black text-blue-400 tabular-nums">{data.platform.throughputMinute}</p>
                  <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-[1.5px] mt-1">TX / min</p>
                </div>
              </div>
            </section>

            {/* Graphique volume / transactions */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle accent="bg-violet-500">Flux transactionnel</SectionTitle>
                <div className="flex gap-1 -mt-3">
                  {(["24h", "14d"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${
                        range === r ? "bg-blue-600 text-white" : "bg-slate-900/60 text-slate-500 border border-white/[0.06]"
                      }`}
                    >
                      {r === "24h" ? "24 heures" : "14 jours"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-4">
                <div className="h-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 5, right: 4, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#475569" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 8, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v) => compact(Number(v))} />
                      <Tooltip {...CHART_TOOLTIP} formatter={(v: number, n) => [compact(Number(v)), n === "volume" ? "Volume" : "TX"]} />
                      <Area type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2} fill="url(#volGrad)" name="volume" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-[110px] mt-2 border-t border-white/[0.04] pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} margin={{ top: 2, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#475569" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 8, fill: "#475569" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip {...CHART_TOOLTIP} formatter={(v: number, n) => [fmtNum(Number(v)), n === "failed" ? "Echecs" : "Transactions"]} />
                      <Bar dataKey="tx" stackId="a" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="tx" />
                      <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} name="failed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-3">
                  {[
                    { c: "#3b82f6", l: "Volume" },
                    { c: "#8b5cf6", l: "Transactions" },
                    { c: "#ef4444", l: "Echecs" },
                  ].map((i) => (
                    <div key={i.l} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: i.c }} />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">{i.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Etat des services */}
            <section>
              <SectionTitle accent="bg-cyan-500">Etat des services</SectionTitle>
              <div className="space-y-2">
                {data.services.map((s) => {
                  const m = SEVERITY_META[s.status];
                  return (
                    <div key={s.name} className={`bg-slate-900/60 border ${m.ring} rounded-2xl p-4 flex items-center gap-3`}>
                      <span className="relative flex w-2 h-2 shrink-0">
                        {s.status !== "healthy" && <span className={`absolute inset-0 rounded-full ${m.dot} animate-ping`} />}
                        <span className={`relative w-2 h-2 rounded-full ${m.dot}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black text-white uppercase tracking-wide truncate">{s.name}</p>
                          <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest shrink-0">{s.category}</span>
                        </div>
                        <p className="text-[8px] text-slate-500 font-mono mt-0.5 truncate">{s.detail}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[11px] font-black tabular-nums ${m.text}`}>{s.metric}</p>
                        <p className={`text-[7px] font-black uppercase tracking-widest ${m.text} opacity-70`}>{m.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Repartition par type */}
            {data.platform.txByType.length > 0 && (
              <section>
                <SectionTitle accent="bg-amber-500">Repartition par type (24h)</SectionTitle>
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-[120px] h-[120px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.platform.txByType.slice(0, 6)}
                            dataKey="count"
                            nameKey="type"
                            innerRadius={32}
                            outerRadius={56}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {data.platform.txByType.slice(0, 6).map((_, i) => (
                              <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip {...CHART_TOOLTIP} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {data.platform.txByType.slice(0, 6).map((t, i) => (
                        <div key={t.type} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider flex-1 truncate">{t.type}</span>
                          <span className="text-[9px] font-black text-white tabular-nums">{fmtNum(t.count)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ========================= ONGLET INFRA & DB ====================== */}
        {tab === "infra" && (
          <>
            <section>
              <SectionTitle>Charge du serveur</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <GaugeBar label="Processeur" percent={data.cpu.usageNum} valueText={data.cpu.usage} icon={Cpu} />
                <GaugeBar label="Memoire" percent={data.ram.percentNum} valueText={data.ram.percent} icon={Activity} thresholds={[60, 85]} />
                <GaugeBar label="Heap Node" percent={data.process.heapPercent} valueText={`${data.process.heapPercent}%`} icon={Layers} thresholds={[75, 90]} />
                <GaugeBar label="Load average" percent={data.cpu.loadPercent} valueText={String(data.cpu.load1)} icon={Gauge} />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <MetricCard icon={Clock} label="Uptime machine" value={data.system.uptime} sub={data.system.hostname} color="bg-cyan-500/10 text-cyan-400" />
                <MetricCard icon={Timer} label="Uptime process" value={data.system.processUptime} sub={`PID ${data.system.pid}`} color="bg-indigo-500/10 text-indigo-400" />
              </div>
            </section>

            <section>
              <SectionTitle accent="bg-blue-500">Environnement d&apos;execution</SectionTitle>
              <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] px-5 py-2">
                <InfoRow label="Systeme" value={`${data.system.osType} ${data.system.osRelease}`} />
                <InfoRow label="Plateforme" value={`${data.system.platform} (${data.system.arch})`} />
                <InfoRow label="Processeur" value={data.cpu.model} color="text-blue-400" />
                <InfoRow label="Coeurs / Freq" value={`${data.cpu.cores} × ${data.cpu.speed}`} />
                <InfoRow label="Node.js" value={data.system.nodeVersion} color="text-emerald-400" />
                <InfoRow label="Environnement" value={`${data.system.environment} · ${data.system.region}`} color="text-amber-400" />
                <InfoRow label="Deploiement" value={data.system.deploymentId} />
                <InfoRow label="RSS / Heap" value={`${data.process.rss} · ${data.process.heapUsed}/${data.process.heapTotal}`} color="text-cyan-400" />
                <InfoRow label="RAM systeme" value={`${data.ram.used} / ${data.ram.total}`} />
              </div>
            </section>

            <section>
              <SectionTitle accent="bg-emerald-500">Base de donnees</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  icon={Database} label="Latence moyenne"
                  value={data.database.reachable ? `${data.database.latencyAvg} ms` : "N/A"}
                  sub={`min ${data.database.latencyMin}ms · max ${data.database.latencyMax}ms`}
                  color={data.database.latencyAvg < 120 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}
                />
                <MetricCard icon={HardDrive} label="Taille base" value={data.database.size} sub={`${fmtNum(data.database.tables.reduce((a, t) => a + t.rows, 0))} lignes suivies`} color="bg-violet-500/10 text-violet-400" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <GaugeBar
                  label="Pool connexions"
                  percent={data.database.connectionPercent}
                  valueText={`${data.database.connections.total}/${data.database.connections.max || "?"}`}
                  icon={Wifi}
                  thresholds={[70, 90]}
                />
                <MetricCard
                  icon={Zap} label="Cache hit ratio"
                  value={data.database.cacheHitRatio != null ? `${data.database.cacheHitRatio}%` : "N/A"}
                  sub={`${data.database.connections.active} req. actives`}
                  color="bg-blue-500/10 text-blue-400"
                />
              </div>

              {/* Sondes de latence */}
              {data.database.probes.length > 0 && (
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-4 mt-3">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-[1.5px] mb-3">Sondes SELECT 1</p>
                  <div className="flex items-end gap-2 h-14">
                    {data.database.probes.map((p, i) => {
                        // Echelle absolue (reference 150ms) : une sonde rapide doit paraitre courte,
                        // au lieu d'etre etiree a 100% par une echelle relative au max local.
                        const max = Math.max(...data.database.probes, 150);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                          <div className="w-full bg-slate-800 rounded-md overflow-hidden flex items-end h-10">
                            <div
                              className="w-full rounded-md transition-all duration-700"
                              style={{ height: `${Math.max(8, (p / max) * 100)}%`, background: p < 120 ? "#10b981" : p < 400 ? "#f59e0b" : "#ef4444" }}
                            />
                          </div>
                          <span className="text-[7px] font-mono text-slate-500">{p}ms</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <section>
              <SectionTitle accent="bg-indigo-500">Volumetrie des tables</SectionTitle>
              <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-4">
                <div className="space-y-2.5">
                  {data.database.tables.map((t, i) => {
                    const max = Math.max(...data.database.tables.map((x) => x.rows), 1);
                    return (
                      <div key={t.table} className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider w-[88px] shrink-0 truncate">{t.table}</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(2, (t.rows / max) * 100)}%`, background: TYPE_COLORS[i % TYPE_COLORS.length] }}
                          />
                        </div>
                        <span className="text-[9px] font-black text-white tabular-nums w-12 text-right shrink-0">{compact(t.rows)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section>
              <SectionTitle accent="bg-amber-500">Fiabilite applicative</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  icon={AlertTriangle} label="Taux d'erreur 24h" value={`${data.reliability.errorRate}%`}
                  sub={`${fmtNum(data.reliability.errorLogs24h)} / ${fmtNum(data.reliability.totalLogs24h)} evenements`}
                  color={data.reliability.errorRate < 2 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}
                />
                <MetricCard
                  icon={Timer} label="Latence applicative"
                  value={data.reliability.appLatency.avg != null ? `${data.reliability.appLatency.avg} ms` : "N/A"}
                  sub={`pic ${data.reliability.appLatency.max ?? "—"}ms · ${data.reliability.appLatency.samples} mesures`}
                  color="bg-cyan-500/10 text-cyan-400"
                />
              </div>

              {/* Niveaux de log */}
              <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-4 mt-3">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[1.5px] mb-3">Niveaux de journalisation (24h)</p>
                <div className="grid grid-cols-5 gap-2">
                  {(["DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const).map((lvl) => {
                    const m = LEVEL_META[lvl];
                    return (
                      <div key={lvl} className={`${m.bg} rounded-xl p-2.5 text-center`}>
                        <p className={`text-sm font-black tabular-nums ${m.text}`}>{compact(data.reliability.logLevels[lvl] || 0)}</p>
                        <p className="text-[6.5px] font-black text-slate-500 uppercase tracking-wider mt-0.5">{lvl}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {data.reliability.topSources.length > 0 && (
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-4 mt-3">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-[1.5px] mb-3">Modules les plus actifs</p>
                  <div className="h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.reliability.topSources} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="source" tick={{ fontSize: 8, fill: "#64748b" }} axisLine={false} tickLine={false} width={74} />
                        <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => [fmtNum(Number(v)), "Evenements"]} />
                        <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* ========================== ONGLET ACTIVITE ======================= */}
        {tab === "activity" && (
          <>
            <section>
              <SectionTitle accent="bg-violet-500">Debit temps reel</SectionTitle>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
                  <p className="text-lg font-black text-violet-400 tabular-nums">{data.platform.throughputMinute}</p>
                  <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-[1.5px] mt-1">TX / min</p>
                </div>
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
                  <p className="text-lg font-black text-blue-400 tabular-nums">{fmtNum(data.platform.throughputHour)}</p>
                  <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-[1.5px] mt-1">TX / heure</p>
                </div>
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
                  <p className="text-lg font-black text-emerald-400 tabular-nums">{fmtNum(data.platform.liveSessions)}</p>
                  <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-[1.5px] mt-1">En ligne</p>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-4 mt-3">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[1.5px] mb-3">Activite horaire (24h)</p>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.timeseries.hourly} margin={{ top: 5, right: 4, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#475569" }} axisLine={false} tickLine={false} interval={3} />
                      <YAxis tick={{ fontSize: 8, fill: "#475569" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip {...CHART_TOOLTIP} formatter={(v: number, n) => [fmtNum(Number(v)), n === "failed" ? "Echecs" : "Transactions"]} />
                      <Line type="monotone" dataKey="tx" stroke="#8b5cf6" strokeWidth={2} dot={false} name="tx" />
                      <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={1.5} dot={false} name="failed" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle accent="bg-cyan-500">Journal d&apos;activite</SectionTitle>
                <div className="flex items-center gap-1 -mt-3">
                  <ListFilter size={11} className="text-slate-600" />
                  {(["ALL", "WARN", "ERROR", "admin"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`px-2 py-1 rounded-lg text-[7.5px] font-black uppercase tracking-wider transition-all ${
                        logFilter === f ? "bg-blue-600 text-white" : "bg-slate-900/60 text-slate-500 border border-white/[0.06]"
                      }`}
                    >
                      {f === "ALL" ? "Tout" : f === "admin" ? "Admin" : f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                {filteredFeed.length === 0 ? (
                  <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-10 text-center">
                    <CheckCircle2 size={22} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aucun evenement</p>
                  </div>
                ) : (
                  filteredFeed.map((e) => {
                    const m = LEVEL_META[e.level] || LEVEL_META.INFO;
                    return (
                      <div key={e.id} className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-3.5 flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                          {e.kind === "admin" ? <Lock size={13} className={m.text} /> : e.level === "ERROR" || e.level === "FATAL" ? <XCircle size={13} className={m.text} /> : e.level === "WARN" ? <AlertTriangle size={13} className={m.text} /> : <Radio size={13} className={m.text} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${m.bg} ${m.text}`}>{e.level}</span>
                            <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">{e.source}</span>
                            {e.duration != null && (
                              <span className="text-[7px] font-mono text-slate-600">{e.duration}ms</span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-200 mt-1 leading-snug break-words">{e.message}</p>
                          <p className="text-[7.5px] font-mono text-slate-600 mt-1">
                            {new Date(e.createdAt).toLocaleString("fr-FR")}
                            {e.actor ? ` · ${e.actor}` : ""}
                            {e.ip ? ` · ${e.ip}` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}

        {/* ========================== ONGLET SECURITE ======================= */}
        {tab === "security" && (
          <>
            <section>
              <SectionTitle accent="bg-red-500">Posture de securite</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  icon={ShieldAlert} label="Alertes ouvertes" value={fmtNum(data.security.openAlerts)}
                  sub={`${data.security.criticalAlerts} critique(s)`}
                  color={data.security.criticalAlerts > 0 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}
                />
                <MetricCard
                  icon={Globe} label="IP bloquees" value={fmtNum(data.security.blockedIps)}
                  sub={`${data.security.proxyDetections24h} proxy/VPN 24h`}
                  color="bg-amber-500/10 text-amber-400"
                />
                <MetricCard
                  icon={Lock} label="Logins echoues" value={fmtNum(data.security.failedLogins24h)}
                  sub={`${data.security.lockedAccounts} compte(s) verrouille(s)`}
                  color="bg-violet-500/10 text-violet-400"
                />
                <MetricCard
                  icon={Users} label="KYC en attente" value={fmtNum(data.platform.kycPending)}
                  sub={`${data.platform.bannedUsers} bannis · ${data.platform.suspendedUsers} suspendus`}
                  color="bg-cyan-500/10 text-cyan-400"
                />
              </div>
            </section>

            <section>
              <SectionTitle accent="bg-amber-500">Integrite transactionnelle</SectionTitle>
              <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5 space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[1.5px]">Taux de succes 24h</p>
                    <p className={`text-3xl font-black tabular-nums mt-1 ${data.platform.txSuccessRate >= 97 ? "text-emerald-400" : data.platform.txSuccessRate >= 90 ? "text-amber-400" : "text-red-400"}`}>
                      {data.platform.txSuccessRate}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[1.5px]">Echecs</p>
                    <p className="text-xl font-black text-red-400 tabular-nums mt-1">{data.platform.txFailureRate}%</p>
                  </div>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                  <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${data.platform.txSuccessRate}%` }} />
                  <div className="bg-red-500 transition-all duration-700" style={{ width: `${data.platform.txFailureRate}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {data.platform.txByStatus.map((s) => (
                    <div key={s.status} className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between">
                      <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider truncate">{s.status}</span>
                      <span className="text-[10px] font-black text-white tabular-nums">{fmtNum(s.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <SectionTitle accent="bg-cyan-500">Acces rapide securite</SectionTitle>
              <div className="space-y-2">
                {[
                  { label: "Detection intrusion", desc: "Journal IDS & riposte", path: "/admin/intrusion", icon: Boxes },
                  { label: "Tentatives de connexion", desc: "Echecs & verrouillages", path: "/admin/login-attempts", icon: Lock },
                  { label: "Conformite AML", desc: "Activites suspectes & SAR", path: "/admin/aml", icon: ShieldAlert },
                  { label: "Journaux systeme", desc: "Traces applicatives", path: "/admin/logs", icon: Terminal },
                ].map((l) => {
                  const Icon = l.icon;
                  return (
                    <button
                      key={l.path}
                      onClick={() => router.push(l.path)}
                      className="w-full bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3 hover:bg-white/[0.04] transition-all active:scale-[0.98] text-left"
                    >
                      <div className="w-9 h-9 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-white uppercase tracking-wide">{l.label}</p>
                        <p className="text-[8px] text-slate-500 font-mono mt-0.5">{l.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* Pied de page technique */}
        <footer className="pt-2 pb-4 text-center">
          <p className="text-[7.5px] font-mono text-slate-700">
            Telemetrie generee le {new Date(data.generatedAt).toLocaleString("fr-FR")} · collecte {data.collectionMs}ms · API {data.reliability.apiLatency}ms
          </p>
        </footer>
      </div>
    </div>
  );
}
