"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Activity, TrendingUp, TrendingDown,
  Globe, ShieldCheck, BarChart3, RefreshCw, Loader2,
  UserPlus, ArrowUpRight, ArrowDownRight, X, LayoutGrid,
  Wallet, Headphones, Settings, Shield, Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

// --- TYPES ---
type KPIs = {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  activeUsers: number;
  bannedUsers: number;
  suspendedUsers: number;
  totalTransactions: number;
  transactionsToday: number;
  transactionsWeek: number;
  userGrowth: number;
  txGrowth: number;
};

type ChartPoint = {
  date: string;
  label: string;
  newUsers: number;
  transactions: number;
  volume: number;
};

type RecentUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  country: string | null;
  role: string;
  status: string;
  createdAt: string;
};

type AnalyticsData = {
  kpis: KPIs;
  roles: Record<string, number>;
  kyc: Record<string, number>;
  chartData: ChartPoint[];
  topCountries: { country: string; count: number }[];
  recentSignups: RecentUser[];
};

// --- COMPONENTS ---

function KpiCard({ label, value, sub, trend, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; trend?: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${trend > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-white tracking-tight">{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</p>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] mt-1">{label}</p>
        {sub && <p className="text-[9px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[3px] mb-4">{children}</h2>
  );
}

const ROLE_COLORS: Record<string, string> = { USER: "#3b82f6", AGENT: "#10b981", MERCHANT: "#f59e0b", ADMIN: "#ef4444" };
const KYC_COLORS: Record<string, string> = { NONE: "#475569", PENDING: "#f59e0b", VERIFIED: "#10b981", APPROVED: "#3b82f6", REJECTED: "#ef4444" };

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl p-3 shadow-2xl">
      <p className="text-[10px] font-bold text-slate-400 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px]">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-bold">{entry.value.toLocaleString("fr-FR")}</span>
        </div>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl p-3 shadow-2xl">
      <div className="flex items-center gap-2 text-[10px]">
        <div className="w-2 h-2 rounded-full" style={{ background: d.payload.fill }} />
        <span className="text-slate-400">{d.name}:</span>
        <span className="text-white font-bold">{d.value.toLocaleString("fr-FR")}</span>
      </div>
    </div>
  );
}

// --- PAGE ---
export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chartTab, setChartTab] = useState<"users" | "transactions" | "volume">("users");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("Erreur API");
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
      toast.error("Impossible de charger les analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  // Pie chart data
  const rolePieData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.roles).filter(([, v]) => v > 0).map(([name, value]) => ({
      name, value, fill: ROLE_COLORS[name] || "#64748b",
    }));
  }, [data]);

  const kycPieData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.kyc).filter(([, v]) => v > 0).map(([name, value]) => ({
      name, value, fill: KYC_COLORS[name] || "#64748b",
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[5px]">Chargement Analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6">
        <div className="bg-slate-900/60 border border-red-500/20 rounded-[1.5rem] p-8 text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={24} className="text-red-400" />
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-wider mb-2">Erreur de chargement</h2>
          <p className="text-[10px] text-slate-500 mb-6">Impossible de charger les analytics. Veuillez reessayer.</p>
          <button
            onClick={fetchAnalytics}
            className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            <RefreshCw size={14} />
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  const { kpis, chartData, topCountries, recentSignups } = data;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32" translate="no">

      {/* SIDEMENU */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute right-0 top-0 h-full w-4/5 max-w-xs bg-slate-900 border-l border-white/10 p-8 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl font-black text-white">ADMIN<span className="text-blue-500">MENU</span></h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white/5 rounded-full text-white"><X size={20}/></button>
            </div>
            <div className="space-y-3">
              <Button onClick={() => { setIsMenuOpen(false); router.push("/admin/dashboard"); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><LayoutGrid size={18}/> Dashboard</Button>
              <Button onClick={() => { setIsMenuOpen(false); router.push("/admin/messages"); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><Activity size={18}/> Messages</Button>
              <Button onClick={() => { setIsMenuOpen(false); router.push("/admin/analytics"); }} className="w-full justify-start gap-4 h-14 bg-blue-600/20 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase text-blue-400"><BarChart3 size={18}/> Analytics</Button>
              <Button onClick={() => { setIsMenuOpen(false); router.push("/admin/settings"); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><Settings size={18}/> Parametres</Button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button onClick={() => router.push("/admin/dashboard")} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Analytics</h1>
          </div>
          <button onClick={fetchAnalytics} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-8">

        {/* KPIs */}
        <div>
          <SectionTitle>Indicateurs Cles</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon={Users} label="Total Utilisateurs" value={kpis.totalUsers}
              sub={`+${kpis.newUsersToday} aujourd'hui`}
              color="bg-blue-500/10 text-blue-400"
            />
            <KpiCard
              icon={UserPlus} label="Nouveaux (7j)" value={kpis.newUsersWeek}
              trend={kpis.userGrowth}
              color="bg-emerald-500/10 text-emerald-400"
            />
            <KpiCard
              icon={Activity} label="Total Transactions" value={kpis.totalTransactions}
              sub={`+${kpis.transactionsToday} aujourd'hui`}
              color="bg-violet-500/10 text-violet-400"
            />
            <KpiCard
              icon={TrendingUp} label="Transactions (7j)" value={kpis.transactionsWeek}
              trend={kpis.txGrowth}
              color="bg-amber-500/10 text-amber-400"
            />
          </div>
          {/* Status row */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className="text-lg font-black text-emerald-400">{kpis.activeUsers.toLocaleString("fr-FR")}</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[2px] mt-1">Actifs</p>
            </div>
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className="text-lg font-black text-red-400">{kpis.bannedUsers.toLocaleString("fr-FR")}</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[2px] mt-1">Bannis</p>
            </div>
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className="text-lg font-black text-orange-400">{kpis.suspendedUsers.toLocaleString("fr-FR")}</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[2px] mt-1">Suspendus</p>
            </div>
          </div>
        </div>

        {/* CHART - 30 Days */}
        <div>
          <SectionTitle>Tendance 30 Jours</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
            {/* Chart tabs */}
            <div className="flex gap-2 mb-5">
              {([
                { key: "users", label: "Utilisateurs" },
                { key: "transactions", label: "Transactions" },
                { key: "volume", label: "Volume" },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setChartTab(t.key)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                    chartTab === t.key
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white/5 text-slate-500 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip content={<CustomTooltip />} />
                  {chartTab === "users" && (
                    <Area type="monotone" dataKey="newUsers" name="Nouveaux" stroke="#3b82f6" strokeWidth={2} fill="url(#gradBlue)" />
                  )}
                  {chartTab === "transactions" && (
                    <Area type="monotone" dataKey="transactions" name="Transactions" stroke="#10b981" strokeWidth={2} fill="url(#gradGreen)" />
                  )}
                  {chartTab === "volume" && (
                    <Area type="monotone" dataKey="volume" name="Volume" stroke="#f59e0b" strokeWidth={2} fill="url(#gradAmber)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* DISTRIBUTION: Roles + KYC */}
        <div className="grid grid-cols-2 gap-4">
          {/* Roles Pie */}
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] mb-3">Roles</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rolePieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
                    {rolePieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {rolePieData.map((r) => (
                <div key={r.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: r.fill }} />
                  <span className="text-[8px] font-bold text-slate-500 uppercase">{r.name}</span>
                  <span className="text-[8px] font-bold text-white">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* KYC Pie */}
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] mb-3">KYC</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kycPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
                    {kycPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {kycPieData.map((k) => (
                <div key={k.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: k.fill }} />
                  <span className="text-[8px] font-bold text-slate-500 uppercase">{k.name}</span>
                  <span className="text-[8px] font-bold text-white">{k.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TOP COUNTRIES */}
        {topCountries.length > 0 && (
          <div>
            <SectionTitle>Top Pays</SectionTitle>
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCountries.slice(0, 8)} layout="vertical" barCategoryGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="country" tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Utilisateurs" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* GOOGLE ANALYTICS EMBED */}
        <div>
          <SectionTitle>Google Analytics</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <BarChart3 size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase">G-W8HP6W3DM4</p>
                <p className="text-[9px] text-slate-500">Property ID active</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Google Analytics est actif sur toutes les pages de PimPay. Pour voir les rapports complets en temps reel (audience, acquisition, comportement, conversions), accedez directement au tableau de bord Google Analytics.
            </p>
            <a
              href="https://analytics.google.com/analytics/web/#/p/G-W8HP6W3DM4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <Globe size={16} />
              Ouvrir Google Analytics
            </a>
          </div>
        </div>

        {/* RECENT SIGNUPS */}
        <div>
          <SectionTitle>Derniers Inscrits</SectionTitle>
          <div className="space-y-2">
            {recentSignups.map((u) => (
              <div key={u.id} className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate">{u.name || u.username || "Sans nom"}</p>
                  <p className="text-[9px] text-slate-500 truncate">{u.email || "Pas d'email"}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${
                    u.role === "ADMIN" ? "bg-red-500/10 text-red-400" :
                    u.role === "MERCHANT" ? "bg-amber-500/10 text-amber-400" :
                    u.role === "AGENT" ? "bg-emerald-500/10 text-emerald-400" :
                    "bg-blue-500/10 text-blue-400"
                  }`}>
                    {u.role}
                  </span>
                  <p className="text-[8px] text-slate-600 mt-1">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
