"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AgentSidebar } from "@/components/hub/AgentSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  RefreshCw,
  Menu,
  X,
  FileBarChart,
  Wallet,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Trophy,
  Target,
  Receipt,
  UserPlus,
  Percent,
} from "lucide-react";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then(async (res) => {
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Erreur de chargement");
    return json;
  });

type Affiliate = {
  id: string;
  name: string;
  username: string | null;
  phone: string | null;
  email: string | null;
  country: string | null;
  kycStatus: string;
  accountStatus: string;
  kycVerified: boolean;
  activated: boolean;
  activeInPeriod: boolean;
  transactionsTotal: number;
  transactionsPeriod: number;
  volumePeriod: number;
  commissionPeriod: number;
  joinedAt: string;
  isNew: boolean;
};

const REPORTS = [
  {
    key: "performance",
    title: "Rapport de performance",
    desc: "Indicateurs, evolution et reseau affilie",
    icon: BarChart3,
    tone: "text-amber-500 bg-amber-500/10",
  },
  {
    key: "affiliates",
    title: "Rapport des affilies",
    desc: "Liste complete de vos utilisateurs recrutes",
    icon: Users,
    tone: "text-blue-500 bg-blue-500/10",
  },
  {
    key: "transactions",
    title: "Rapport de transactions",
    desc: "Toutes les operations avec details",
    icon: FileBarChart,
    tone: "text-emerald-500 bg-emerald-500/10",
  },
  {
    key: "commissions",
    title: "Rapport de commissions",
    desc: "Detail de vos gains par periode",
    icon: PieChart,
    tone: "text-purple-500 bg-purple-500/10",
  },
] as const;

function fmt(value: number | undefined | null): string {
  return (value ?? 0).toLocaleString("fr-FR");
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function KycBadge({ status, verified }: { status: string; verified: boolean }) {
  if (verified) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold gap-1">
        <ShieldCheck className="h-3 w-3" />
        Verifie
      </Badge>
    );
  }
  const pending = status === "PENDING";
  return (
    <Badge
      className={`text-[10px] font-bold gap-1 ${
        pending
          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
      }`}
    >
      <ShieldAlert className="h-3 w-3" />
      {pending ? "KYC en cours" : status === "REJECTED" ? "KYC refuse" : "Sans KYC"}
    </Badge>
  );
}

export default function AgentReportsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [search, setSearch] = useState("");
  const [affiliateFilter, setAffiliateFilter] = useState("all");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `/api/agent/reports?period=${period}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const perf = data?.performance;
  const stats = data?.affiliateStats;
  const series: any[] = data?.series || [];
  const affiliates: Affiliate[] = data?.affiliates || [];
  const topAffiliates: Affiliate[] = data?.topAffiliates || [];

  const filteredAffiliates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return affiliates.filter((a) => {
      if (affiliateFilter === "active" && !a.activated) return false;
      if (affiliateFilter === "pending" && a.kycVerified) return false;
      if (affiliateFilter === "new" && !a.isNew) return false;
      if (affiliateFilter === "period" && !a.activeInPeriod) return false;
      if (!term) return true;
      return (
        a.name.toLowerCase().includes(term) ||
        (a.username || "").toLowerCase().includes(term) ||
        (a.phone || "").toLowerCase().includes(term) ||
        (a.email || "").toLowerCase().includes(term)
      );
    });
  }, [affiliates, affiliateFilter, search]);

  async function downloadReport(reportKey: string) {
    setDownloading(reportKey);
    setDownloadError(null);
    try {
      const res = await fetch(
        `/api/agent/reports?period=${period}&format=csv&report=${reportKey}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Telechargement impossible");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] || `${reportKey}_${period}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setDownloadError(err?.message || "Telechargement impossible");
    } finally {
      setDownloading(null);
    }
  }

  const growth = perf?.volumeGrowth ?? 0;

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      <div className="hidden lg:block">
        <AgentSidebar />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center justify-center flex-1">
                <div>
                  <h1 className="text-sm font-black text-white text-center">PIMOBIPAY</h1>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase text-center">Agent Hub</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <AgentSidebar isMobile />
          </div>
        </div>
      )}

      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl bg-white/5 text-slate-400">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-black text-white">PIMOBIPAY</h1>
          <div className="w-9" />
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Rapports</h1>
            <p className="text-sm text-slate-500 mt-1">
              {data?.period?.label
                ? `Performance et reseau affilie — ${data.period.label}`
                : "Analysez vos performances et telechargez vos rapports"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-white/10 text-white text-xs font-bold">
                <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
                <SelectItem value="90d">90 jours</SelectItem>
                <SelectItem value="1y">1 an</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="border-white/10 bg-slate-900/50"
              onClick={() => mutate()}
              disabled={isValidating}
              aria-label="Rafraichir"
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${isValidating ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error.message}
          </div>
        )}
        {downloadError && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
            {downloadError}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            {
              label: "Transactions",
              value: fmt(perf?.successCount),
              hint: `${fmt(perf?.transactions)} au total · ${perf?.successRate ?? 0}% reussite`,
              icon: BarChart3,
              tone: "text-blue-500 bg-blue-500/10",
            },
            {
              label: "Volume",
              value: fmt(perf?.volume),
              hint: `XAF · ticket moyen ${fmt(perf?.avgTicket)}`,
              icon: Wallet,
              tone: "text-emerald-500 bg-emerald-500/10",
            },
            {
              label: "Commissions",
              value: fmt(perf?.commissions),
              hint: `XAF · ${perf?.commissionGrowth ?? 0}% vs periode precedente`,
              icon: PieChart,
              tone: "text-amber-500 bg-amber-500/10",
            },
            {
              label: "Affilies",
              value: fmt(stats?.total),
              hint: `${fmt(stats?.activated)} actives · ${fmt(stats?.newInPeriod)} nouveaux`,
              icon: Users,
              tone: "text-purple-500 bg-purple-500/10",
            },
          ].map((kpi) => (
            <Card key={kpi.label} className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                    {isLoading && !data ? (
                      <Skeleton className="h-8 w-24 mt-2 bg-slate-700" />
                    ) : (
                      <p className="text-2xl font-black text-white mt-2 truncate">{kpi.value}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1 text-pretty">{kpi.hint}</p>
                  </div>
                  <div className={`p-3 rounded-2xl shrink-0 ${kpi.tone.split(" ")[1]}`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.tone.split(" ")[0]}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secondary performance metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Cash-in",
              value: fmt(perf?.cashIn),
              sub: `${fmt(perf?.cashInCount)} operations`,
              icon: ArrowDownLeft,
              color: "text-emerald-500",
            },
            {
              label: "Cash-out",
              value: fmt(perf?.cashOut),
              sub: `${fmt(perf?.cashOutCount)} operations`,
              icon: ArrowUpRight,
              color: "text-red-400",
            },
            {
              label: "Jours actifs",
              value: fmt(perf?.activeDays),
              sub: `moy. ${fmt(perf?.dailyAverage)} XAF/j`,
              icon: Target,
              color: "text-blue-400",
            },
            {
              label: "Croissance",
              value: `${growth >= 0 ? "+" : ""}${growth}%`,
              sub: perf?.bestDay ? `record ${perf.bestDay.label}` : "aucune activite",
              icon: growth >= 0 ? TrendingUp : TrendingDown,
              color: growth >= 0 ? "text-emerald-500" : "text-red-400",
            },
          ].map((item) => (
            <div key={item.label} className="p-4 rounded-2xl bg-slate-900/50 border border-white/5">
              <div className="flex items-center gap-2">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
              </div>
              {isLoading && !data ? (
                <Skeleton className="h-6 w-20 mt-2 bg-slate-700" />
              ) : (
                <p className={`text-lg font-black mt-2 ${item.color}`}>{item.value}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Evolution du volume
              </CardTitle>
              <CardDescription className="text-slate-500">
                Cash-in et cash-out {data?.period?.granularity === "month" ? "par mois" : "par jour"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && !data ? (
                <Skeleton className="h-64 w-full bg-slate-800" />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f87171" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#64748b"
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                        minTickGap={24}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #ffffff1a",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                        formatter={(value: any, name: any) => [
                          `${fmt(Number(value))} XAF`,
                          name === "cashIn" ? "Cash-in" : "Cash-out",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="cashIn"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#gIn)"
                      />
                      <Area
                        type="monotone"
                        dataKey="cashOut"
                        stroke="#f87171"
                        strokeWidth={2}
                        fill="url(#gOut)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <Percent className="h-5 w-5 text-amber-500" />
                Commissions
              </CardTitle>
              <CardDescription className="text-slate-500">
                {fmt(perf?.feesCollected)} XAF de frais collectes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && !data ? (
                <Skeleton className="h-64 w-full bg-slate-800" />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#64748b"
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                        minTickGap={24}
                      />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #ffffff1a",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                        formatter={(value: any) => [`${fmt(Number(value))} XAF`, "Commission"]}
                      />
                      <Bar dataKey="commission" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top affiliates */}
        {topAffiliates.length > 0 && (
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Meilleurs affilies
              </CardTitle>
              <CardDescription className="text-slate-500">
                Classement par volume genere sur la periode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {topAffiliates.map((a, index) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-white/5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-xs font-black text-amber-500">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{a.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {fmt(a.transactionsPeriod)} operations · {fmt(a.commissionPeriod)} XAF de commission
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-emerald-500">{fmt(a.volumePeriod)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Affiliated users list */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl mb-8">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Utilisateurs affilies
                </CardTitle>
                <CardDescription className="text-slate-500">
                  {fmt(stats?.total)} recrutes · {fmt(stats?.activated)} actives · {fmt(stats?.pendingKyc)} sans KYC
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 bg-slate-800/50 text-white shrink-0"
                onClick={() => downloadReport("affiliates")}
                disabled={downloading === "affiliates"}
              >
                {downloading === "affiliates" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exporter CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un affilie (nom, telephone, email)"
                  className="pl-9 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
                />
              </div>
              <Select value={affiliateFilter} onValueChange={setAffiliateFilter}>
                <SelectTrigger className="w-full lg:w-48 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actives</SelectItem>
                  <SelectItem value="pending">KYC en attente</SelectItem>
                  <SelectItem value="period">Actifs sur la periode</SelectItem>
                  <SelectItem value="new">Nouveaux</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading && !data ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-800" />
                ))}
              </div>
            ) : filteredAffiliates.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="p-4 rounded-2xl bg-slate-800/50">
                  <UserPlus className="h-6 w-6 text-slate-600" />
                </div>
                <p className="text-sm font-bold text-white">Aucun affilie trouve</p>
                <p className="text-xs text-slate-500 max-w-xs text-pretty">
                  {affiliates.length === 0
                    ? "Partagez votre code de parrainage pour recruter vos premiers utilisateurs."
                    : "Aucun affilie ne correspond a votre recherche."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredAffiliates.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-blue-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-xs font-black text-blue-400">
                        {initials(a.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="truncate text-sm font-bold text-white">{a.name}</p>
                          {a.isNew && (
                            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] font-bold">
                              Nouveau
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-slate-500">
                          {a.phone || a.email || a.username || "—"} · inscrit le{" "}
                          {new Date(a.joinedAt).toLocaleDateString("fr-FR")}
                        </p>
                        <div className="mt-1.5">
                          <KycBadge status={a.kycStatus} verified={a.kycVerified} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:gap-6 shrink-0">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ops</p>
                        <p className="text-sm font-black text-white">{fmt(a.transactionsPeriod)}</p>
                        <p className="text-[10px] text-slate-600">{fmt(a.transactionsTotal)} total</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Volume</p>
                        <p className="text-sm font-black text-white">{fmt(a.volumePeriod)}</p>
                        <p className="text-[10px] text-slate-600">XAF</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Comm.</p>
                        <p className="text-sm font-black text-emerald-500">{fmt(a.commissionPeriod)}</p>
                        <p className="text-[10px] text-slate-600">XAF</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Downloadable reports */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              Rapports telechargeables
            </CardTitle>
            <CardDescription className="text-slate-500">
              Export CSV sur la periode selectionnee ({data?.period?.label || "30 derniers jours"})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REPORTS.map((r) => (
                <div
                  key={r.key}
                  className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl shrink-0 ${r.tone.split(" ")[1]}`}>
                      <r.icon className={`h-6 w-6 ${r.tone.split(" ")[0]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold">{r.title}</h3>
                      <p className="text-sm text-slate-500 mt-1 text-pretty">{r.desc}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 border-white/10 bg-slate-900/50 text-white"
                        onClick={() => downloadReport(r.key)}
                        disabled={downloading === r.key}
                      >
                        {downloading === r.key ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Telecharger CSV
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-800/30 p-3">
              <Receipt className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 text-pretty">
                Les provisionnements de float sont exclus des statistiques de caisse. Les fichiers CSV
                s&apos;ouvrent directement dans Excel ou LibreOffice.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
