"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { BankSidebar } from "@/components/bank/BankSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Landmark,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Globe,
  Lock,
  Menu,
  X,
  Search,
  RefreshCw,
  Eye,
  XCircle,
  MoreHorizontal,
  MessageSquare,
  Bell,
  Settings,
  ChevronRight,
  DollarSign,
  PiggyBank,
  BadgeCheck,
} from "lucide-react";

// Types for API response
interface DashboardStats {
  totalDeposits: number;
  availableReserves: number;
  totalUsers: number;
  activeUsers: number;
  pendingKyc: number;
  businessCount: number;
  transactionVolume: number;
  transactionCount: number;
}

interface KycPendingItem {
  id: string;
  name: string;
  email: string;
  type: string;
  submitted: string;
}

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  sender: string;
  receiver: string;
  createdAt: string;
}

interface BankDashboardData {
  stats: DashboardStats;
  recentTransactions: RecentTransaction[];
  kycPendingList: KycPendingItem[];
  recentAlerts: any[];
  period: string;
}

// Color mapping for pie chart
const ASSET_COLORS: Record<string, string> = {
  USD: "#10b981",
  EUR: "#3b82f6",
  PI: "#f59e0b",
  XAF: "#8b5cf6",
  default: "#6b7280",
};

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function BankDashboard() {
  const [period, setPeriod] = useState("7d");
  const [chatMessage, setChatMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch dashboard data
  const { data, error, isLoading, mutate } = useSWR<BankDashboardData>(
    `/api/bank/dashboard?period=${period}`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  const stats = data?.stats || {
    totalDeposits: 0,
    availableReserves: 0,
    totalUsers: 0,
    activeUsers: 0,
    pendingKyc: 0,
    businessCount: 0,
    transactionVolume: 0,
    transactionCount: 0,
  };
  const kycPendingList = data?.kycPendingList || [];
  const recentTransactions = data?.recentTransactions || [];
  const recentAlerts = data?.recentAlerts || [];

  // Compute chart data from transactions (simplified for demo)
  const transactionData = [
    { name: "Lun", daily: Math.round(stats.transactionVolume * 0.12), weekly: Math.round(stats.transactionVolume * 0.8) },
    { name: "Mar", daily: Math.round(stats.transactionVolume * 0.15), weekly: Math.round(stats.transactionVolume * 0.82) },
    { name: "Mer", daily: Math.round(stats.transactionVolume * 0.14), weekly: Math.round(stats.transactionVolume * 0.85) },
    { name: "Jeu", daily: Math.round(stats.transactionVolume * 0.18), weekly: Math.round(stats.transactionVolume * 0.93) },
    { name: "Ven", daily: Math.round(stats.transactionVolume * 0.20), weekly: Math.round(stats.transactionVolume * 1.0) },
    { name: "Sam", daily: Math.round(stats.transactionVolume * 0.10), weekly: Math.round(stats.transactionVolume * 0.95) },
    { name: "Dim", daily: Math.round(stats.transactionVolume * 0.08), weekly: Math.round(stats.transactionVolume * 0.92) },
  ];

  // Static asset distribution (would come from API in production)
  const assetDistribution = [
    { name: "USD", value: stats.totalDeposits * 0.48, color: ASSET_COLORS.USD },
    { name: "EUR", value: stats.totalDeposits * 0.29, color: ASSET_COLORS.EUR },
    { name: "Pi", value: stats.totalDeposits * 0.16, color: ASSET_COLORS.PI },
    { name: "Autres", value: stats.totalDeposits * 0.07, color: ASSET_COLORS.default },
  ];

  // System alerts from recent audit logs
  const systemAlerts = recentAlerts.map((alert: any, index: number) => ({
    id: alert.id || index,
    type: alert.action?.includes("SECURITY") ? "security" : 
          alert.action?.includes("KYC") ? "kyc" : 
          alert.action?.includes("TRANSACTION") ? "transaction" : "system",
    message: alert.details || alert.action || "Alerte systeme",
    time: new Date(alert.createdAt).toLocaleString("fr-FR"),
    severity: alert.action?.includes("SUSPICIOUS") || alert.action?.includes("FRAUD") ? "high" : "medium",
  })).slice(0, 4);

  // Placeholder chat messages
  const chatMessages = [
    { id: 1, sender: "Support Admin", message: "Les nouvelles procedures de conformite sont en place.", time: "10:30", isAdmin: true },
    { id: 2, sender: "Vous", message: "Merci, pouvez-vous confirmer les nouveaux seuils de verification?", time: "10:35", isAdmin: false },
    { id: 3, sender: "Support Admin", message: "Les seuils ont ete mis a jour: 50K USD pour les entreprises, 10K USD pour les particuliers.", time: "10:38", isAdmin: true },
  ];

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Haut</Badge>;
      case "medium":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">Moyen</Badge>;
      case "low":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Faible</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[9px] font-bold">{risk}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Effectue</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">En attente</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Echec</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[9px] font-bold">{status}</Badge>;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "security":
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case "kyc":
        return <FileText className="h-4 w-4 text-amber-500" />;
      case "transaction":
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      case "system":
        return <Settings className="h-4 w-4 text-slate-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-l-red-500 bg-red-500/5";
      case "medium":
        return "border-l-amber-500 bg-amber-500/5";
      case "low":
        return "border-l-slate-500 bg-slate-500/5";
      default:
        return "border-l-slate-500 bg-slate-500/5";
    }
  };

  const totalAssets = assetDistribution.reduce((sum, asset) => sum + asset.value, 0);

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <BankSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
                  <Landmark className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-black text-white">PIMPAY</h1>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Institution</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <BankSidebar isMobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Mobile Header */}
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl bg-white/5 text-slate-400">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
              <Landmark className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Portail Institution</h1>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                <Lock className="h-3 w-3 mr-1" />
                Securise
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Monitoring des liquidites et reporting de conformite</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-white/10 text-white text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="24h">24 heures</SelectItem>
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
                <SelectItem value="90d">90 jours</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon" 
              className="border-white/10 bg-slate-900/50"
              onClick={() => mutate()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30 rounded-3xl mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-2xl">
                  <XCircle className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-400">Erreur de chargement</p>
                  <p className="text-xs text-red-300/70 mt-1">Impossible de charger les donnees. Verifiez vos permissions.</p>
                </div>
                <Button onClick={() => mutate()} className="bg-red-500 hover:bg-red-600 text-xs font-bold">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Deposits */}
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Volume Total Depots</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-28 mt-1 bg-slate-700" />
                  ) : (
                    <p className="text-2xl lg:text-3xl font-black text-white mt-1">
                      ${stats.totalDeposits >= 1000000 
                        ? `${(stats.totalDeposits / 1000000).toFixed(1)}M` 
                        : stats.totalDeposits.toLocaleString()}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">{stats.transactionCount} transactions</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <PiggyBank className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Reserves */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reserves Disponibles</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-28 mt-1 bg-slate-700" />
                  ) : (
                    <p className="text-2xl lg:text-3xl font-black text-white mt-1">
                      ${stats.availableReserves >= 1000000 
                        ? `${(stats.availableReserves / 1000000).toFixed(1)}M` 
                        : stats.availableReserves.toLocaleString()}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Activity className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400">
                      Ratio: {stats.totalDeposits > 0 ? ((stats.availableReserves / stats.totalDeposits) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Wallet className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Utilisateurs Actifs</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-20 mt-1 bg-slate-700" />
                  ) : (
                    <p className="text-2xl lg:text-3xl font-black text-white mt-1">{stats.activeUsers.toLocaleString()}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-400">sur {stats.totalUsers.toLocaleString()} total</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-2xl">
                  <Users className="h-6 w-6 text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Verifications */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">KYC en Attente</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-12 mt-1 bg-slate-700" />
                  ) : (
                    <p className="text-2xl lg:text-3xl font-black text-amber-500 mt-1">{stats.pendingKyc}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">Action requise</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-2xl">
                  <Shield className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="xl:col-span-2 space-y-6">
            {/* Transactions Chart */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Reporting des Transactions</CardTitle>
                    <CardDescription className="text-slate-500">Comparaison volumes quotidiens vs hebdomadaires</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold text-slate-400">Quotidien</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-500" />
                      <span className="text-xs font-bold text-slate-400">Hebdo (cumul)</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={transactionData} barGap={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fontWeight: 600 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10, fontWeight: 600 }} tickFormatter={(v) => `$${v/1000}k`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                      />
                      <Bar dataKey="daily" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Volume Quotidien" />
                      <Bar dataKey="weekly" fill="#475569" radius={[4, 4, 0, 0]} name="Volume Hebdo" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* KYC Monitoring */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Monitoring de Conformite</CardTitle>
                    <CardDescription className="text-slate-500">Verifications KYC en attente de validation</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="border-white/10 text-xs font-bold">
                    <Eye className="h-4 w-4 mr-2" />
                    Voir tout
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">ID</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Nom</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Type</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Soumis</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Risque</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i} className="border-white/5">
                            <TableCell><Skeleton className="h-4 w-16 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-32 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-12 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-7 w-20 bg-slate-700" /></TableCell>
                          </TableRow>
                        ))
                      ) : kycPendingList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                            Aucune verification KYC en attente
                          </TableCell>
                        </TableRow>
                      ) : (
                        kycPendingList.map((kyc) => (
                          <TableRow key={kyc.id} className="border-white/5 hover:bg-white/5">
                            <TableCell className="text-xs font-mono text-slate-400">{kyc.id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                                  {(kyc.name || kyc.email || "?").split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <span className="text-sm font-bold text-white">{kyc.name || kyc.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                                {kyc.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-400">
                              {new Date(kyc.submitted).toLocaleDateString("fr-FR")}
                            </TableCell>
                            <TableCell>{getRiskBadge("low")}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button size="sm" className="h-7 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-red-500 hover:bg-red-500/10 text-xs">
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-slate-400 text-xs">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Interbank Transfers */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Flux Interbancaires</CardTitle>
                    <CardDescription className="text-slate-500">Virements vers autres institutions et banques centrales</CardDescription>
                  </div>
                  <Button className="bg-slate-700 hover:bg-slate-600 text-xs font-bold">
                    <Send className="h-4 w-4 mr-2" />
                    Nouveau virement
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Institution</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Montant</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Type</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Date</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i} className="border-white/5">
                            <TableCell><Skeleton className="h-10 w-40 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16 bg-slate-700" /></TableCell>
                          </TableRow>
                        ))
                      ) : recentTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                            Aucune transaction recente
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentTransactions.slice(0, 5).map((tx) => (
                          <TableRow key={tx.id} className="border-white/5 hover:bg-white/5">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-xl">
                                  <Landmark className="h-4 w-4 text-slate-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white">{tx.sender || tx.receiver}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">{tx.id.slice(0, 8)}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className={`text-sm font-black ${
                                tx.type === "DEPOSIT" ? "text-emerald-500" : "text-white"
                              }`}>
                                {tx.type === "DEPOSIT" ? "+" : "-"}${tx.amount >= 1000000 
                                  ? `${(tx.amount / 1000000).toFixed(1)}M` 
                                  : tx.amount.toLocaleString()}
                              </p>
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-2 ${
                                tx.type === "DEPOSIT" ? "text-emerald-500" : "text-rose-500"
                              }`}>
                                {tx.type === "DEPOSIT" ? (
                                  <ArrowDownLeft className="h-4 w-4" />
                                ) : (
                                  <ArrowUpRight className="h-4 w-4" />
                                )}
                                <span className="text-xs font-bold">
                                  {tx.type === "DEPOSIT" ? "Entrant" : "Sortant"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-400">
                              {new Date(tx.createdAt).toLocaleDateString("fr-FR")}
                            </TableCell>
                            <TableCell>{getStatusBadge(tx.status.toLowerCase())}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Asset Distribution */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Repartition des Actifs</CardTitle>
                <CardDescription className="text-slate-500">Total: ${(totalAssets / 1000000).toFixed(0)}M</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {assetDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [`$${(value / 1000000).toFixed(1)}M`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {assetDistribution.map((asset) => (
                    <div key={asset.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }} />
                      <span className="text-xs font-bold text-slate-400">{asset.name}</span>
                      <span className="text-xs font-bold text-white ml-auto">
                        {((asset.value / totalAssets) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Alerts */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-white">Alertes Systeme</CardTitle>
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">
                    {systemAlerts.filter(a => a.severity === "high").length} critique
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {systemAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border-l-4 ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{alert.message}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Secure Chat */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-slate-400" />
                    Messagerie Securisee
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-500">En ligne</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[240px] pr-4">
                  <div className="space-y-4">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isAdmin ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 ${
                            msg.isAdmin
                              ? "bg-slate-800 rounded-tl-sm"
                              : "bg-blue-500/20 rounded-tr-sm"
                          }`}
                        >
                          <p className="text-[10px] font-bold text-slate-400 mb-1">{msg.sender}</p>
                          <p className="text-sm text-white">{msg.message}</p>
                          <p className="text-[9px] text-slate-500 mt-1 text-right">{msg.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                  <Input
                    placeholder="Votre message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="bg-slate-800/50 border-white/10 text-sm"
                  />
                  <Button size="icon" className="bg-slate-700 hover:bg-slate-600 shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 border-white/5 rounded-3xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Transactions / 24h</span>
                  <span className="text-sm font-black text-white">12,847</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Volume / 24h</span>
                  <span className="text-sm font-black text-emerald-500">$4.2M</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Taux de reussite</span>
                  <span className="text-sm font-black text-white">99.7%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Latence moyenne</span>
                  <span className="text-sm font-black text-white">124ms</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
