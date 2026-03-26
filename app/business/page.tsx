"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  BadgeCheck,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Wallet,
  Building2,
  Send,
  Upload,
  UserPlus,
  Search,
  Filter,
  Calendar,
  MoreVertical,
  RefreshCw,
  FileSpreadsheet,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Banknote,
  ChevronRight,
  PiggyBank,
  CreditCard,
  Menu,
  X,
} from "lucide-react";

// Types for API response
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  salary: number | null;
  isActive: boolean;
}

interface TransactionData {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string | null;
  createdAt: string;
  isIncoming: boolean;
  counterparty: string;
}

interface CashFlowPoint {
  day: string;
  entrant: number;
  sortant: number;
}

interface BusinessDashboardData {
  success: boolean;
  data: {
    business: {
      id: string;
      name: string;
      registrationNumber: string;
      type: string;
      status: string;
      employeeCount: number;
    } | null;
    balances: {
      usd: number;
      pi: number;
    };
    stats: {
      totalIncoming: number;
      totalOutgoing: number;
      netFlow: number;
      pendingTransactions: number;
      employeeCount: number;
    };
    cashFlowData: CashFlowPoint[];
    recentTransactions: TransactionData[];
    employees: Employee[];
  };
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function BusinessDashboard() {
  const [period, setPeriod] = useState("30d");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [quickPayAmount, setQuickPayAmount] = useState("");
  const [quickPayRecipient, setQuickPayRecipient] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch real data from API
  const { data, error, isLoading, mutate } = useSWR<BusinessDashboardData>(
    "/api/business/dashboard",
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  const dashboardData = data?.data;
  const employees = dashboardData?.employees || [];
  const transactions = dashboardData?.recentTransactions || [];
  const balances = dashboardData?.balances || { usd: 0, pi: 0 };
  const stats = dashboardData?.stats || { totalIncoming: 0, totalOutgoing: 0, netFlow: 0, pendingTransactions: 0, employeeCount: 0 };
  const business = dashboardData?.business;

  // Use chart data directly from API (pre-computed with all 30 days)
  const treasuryData = useMemo(() => dashboardData?.cashFlowData || [], [dashboardData]);

  const totalSalary = useMemo(() => 
    employees.filter(e => selectedEmployees.includes(e.id) || selectedEmployees.length === 0)
      .reduce((sum, e) => sum + (e.salary || 0), 0)
  , [selectedEmployees, employees]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "success":
      case "completed":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">Effectue</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold">En attente</Badge>;
      case "failed":
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-bold">Echec</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[10px] font-bold">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string, isIncoming?: boolean) => {
    const typeLower = type.toLowerCase();
    if (isIncoming) {
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">Entrant</Badge>;
    }
    switch (typeLower) {
      case "transfer":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] font-bold">Transfert</Badge>;
      case "payment":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px] font-bold">Paiement</Badge>;
      case "withdraw":
        return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px] font-bold">Retrait</Badge>;
      case "deposit":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">Depot</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[10px] font-bold">{type}</Badge>;
    }
  };

  const getBusinessStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE": return "Verifie";
      case "PENDING_VERIFICATION": return "En attente";
      case "SUSPENDED": return "Suspendu";
      case "INACTIVE": return "Inactif";
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <BusinessSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-black text-white">PIMPAY</h1>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase">Business</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <BusinessSidebar isMobile />
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
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
                  <p className="text-xs text-red-300/70 mt-1">Impossible de charger les donnees du tableau de bord. Veuillez reessayer.</p>
                </div>
                <Button 
                  onClick={() => mutate()} 
                  className="bg-red-500 hover:bg-red-600 text-xs font-bold"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Tableau de Bord Entreprise</h1>
            <p className="text-sm text-slate-500 mt-1">Gerez votre tresorerie et vos paiements en un seul endroit</p>
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
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Balance & Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Balance */}
          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-500/30 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-300/70 uppercase tracking-wider">Solde Total USD</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-32 mt-1 bg-emerald-500/20" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">${balances.usd.toLocaleString()}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {stats.netFlow >= 0 ? (
                      <>
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400">+${stats.totalIncoming.toLocaleString()} ce mois</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                        <span className="text-xs font-bold text-rose-400">-${Math.abs(stats.netFlow).toLocaleString()} ce mois</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                  <Wallet className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Statut du Compte</p>
                  <div className="flex items-center gap-2 mt-2">
                    {business?.status === "ACTIVE" ? (
                      <BadgeCheck className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                    {isLoading ? (
                      <Skeleton className="h-6 w-20 bg-slate-700" />
                    ) : (
                      <p className="text-lg font-black text-white">{business ? getBusinessStatusLabel(business.status) : "Non configure"}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{business?.name || "Entreprise"}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <Building2 className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Employees */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employes</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-12 mt-1 bg-slate-700" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">{stats.employeeCount}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400">{employees.length} actifs</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Payments */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paiements en attente</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-8 mt-1 bg-slate-700" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">{stats.pendingTransactions}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">Sortant: ${stats.totalOutgoing.toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-2xl">
                  <Banknote className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="xl:col-span-2 space-y-6">
            {/* Treasury Chart */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Tresorerie & Flux</CardTitle>
                    <CardDescription className="text-slate-500">Entrees et sorties des 30 derniers jours</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-400">Entrant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-slate-400">Sortant</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {isLoading ? (
                    <Skeleton className="h-full w-full rounded-2xl bg-slate-800" />
                  ) : treasuryData.length === 0 || treasuryData.every(d => d.entrant === 0 && d.sortant === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <PiggyBank className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm font-bold">Aucun flux sur les 30 derniers jours</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={treasuryData}>
                        <defs>
                          <linearGradient id="colorEntrant" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorSortant" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 10, fontWeight: 600 }} interval="preserveStartEnd" />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10, fontWeight: 600 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                        />
                        <Area type="monotone" dataKey="entrant" stroke="#10b981" strokeWidth={2} fill="url(#colorEntrant)" name="Entrant" />
                        <Area type="monotone" dataKey="sortant" stroke="#f43f5e" strokeWidth={2} fill="url(#colorSortant)" name="Sortant" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payroll Section */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Gestion des Salaires</CardTitle>
                    <CardDescription className="text-slate-500">Paiement groupe des employes</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-white/10 text-xs font-bold">
                      <Upload className="h-4 w-4 mr-2" />
                      Importer CSV
                    </Button>
                    <Button className="bg-emerald-500 hover:bg-emerald-600 text-xs font-bold">
                      <Send className="h-4 w-4 mr-2" />
                      Payer ({selectedEmployees.length || "Tous"})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Rechercher un employe..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-slate-800/50 border-white/10 text-sm"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={selectAllEmployees} className="border-white/10 text-xs font-bold">
                    {selectedEmployees.length === employees.length ? "Deselectionner tout" : "Selectionner tout"}
                  </Button>
                </div>

                {/* Employee List */}
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl border bg-slate-800/30 border-white/5">
                        <div className="flex items-center gap-4">
                          <Skeleton className="w-10 h-10 rounded-xl bg-slate-700" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-2 bg-slate-700" />
                            <Skeleton className="h-3 w-20 bg-slate-700" />
                          </div>
                        </div>
                        <Skeleton className="h-5 w-16 bg-slate-700" />
                      </div>
                    ))
                  ) : employees.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Users className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                      <p className="text-sm font-bold">Aucun employe</p>
                      <p className="text-xs mt-1">Ajoutez des employes pour commencer</p>
                    </div>
                  ) : (
                    employees.filter(e => {
                      const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
                      const position = (e.position || '').toLowerCase();
                      return fullName.includes(searchQuery.toLowerCase()) || position.includes(searchQuery.toLowerCase());
                    }).map((employee) => (
                      <div
                        key={employee.id}
                        onClick={() => toggleEmployee(employee.id)}
                        className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                          selectedEmployees.includes(employee.id)
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-slate-800/30 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase ${
                            selectedEmployees.includes(employee.id)
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-700 text-slate-300"
                          }`}>
                            {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{employee.firstName} {employee.lastName}</p>
                            <p className="text-[11px] text-slate-500">{employee.position || "Non defini"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-white">${(employee.salary || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-emerald-500 font-bold uppercase">Mensuel</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-400">Total a payer</p>
                  <p className="text-2xl font-black text-emerald-500">${totalSalary.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Historique des Transactions</CardTitle>
                    <CardDescription className="text-slate-500">Toutes les operations recentes</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="border-white/10 text-xs font-bold">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtrer
                    </Button>
                    <Button variant="outline" size="sm" className="border-white/10 text-xs font-bold">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Exporter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Destinataire</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Montant</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Type</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Date</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Statut</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i} className="border-white/5">
                            <TableCell><Skeleton className="h-10 w-40 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 bg-slate-700" /></TableCell>
                          </TableRow>
                        ))
                      ) : transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                            <Banknote className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                            <p className="text-sm font-bold">Aucune transaction</p>
                            <p className="text-xs mt-1">Les transactions apparaitront ici</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((tx) => (
                          <TableRow key={tx.id} className="border-white/5 hover:bg-white/5">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${
                                  tx.isIncoming ? "bg-emerald-500/10" : "bg-rose-500/10"
                                }`}>
                                  {tx.isIncoming ? (
                                    <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <ArrowUpRight className="h-4 w-4 text-rose-500" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white">{tx.counterparty}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">{tx.reference}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className={`text-sm font-black ${
                                tx.isIncoming ? "text-emerald-500" : "text-white"
                              }`}>
                                {tx.isIncoming ? "+" : "-"}${tx.amount.toLocaleString()}
                              </p>
                            </TableCell>
                            <TableCell>{getTypeBadge(tx.type, tx.isIncoming)}</TableCell>
                            <TableCell className="text-sm text-slate-400">{formatDate(tx.createdAt)}</TableCell>
                            <TableCell>{getStatusBadge(tx.status)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4 text-slate-500" />
                              </Button>
                            </TableCell>
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
            {/* Quick Payment Widget */}
            <Card className="bg-gradient-to-br from-slate-900/80 to-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-emerald-500" />
                  Paiement Rapide
                </CardTitle>
                <CardDescription className="text-slate-500">Virement instantane</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    Destinataire
                  </label>
                  <Input
                    placeholder="Nom ou ID du destinataire"
                    value={quickPayRecipient}
                    onChange={(e) => setQuickPayRecipient(e.target.value)}
                    className="bg-slate-800/50 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    Montant (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={quickPayAmount}
                      onChange={(e) => setQuickPayAmount(e.target.value)}
                      className="pl-10 bg-slate-800/50 border-white/10 text-lg font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    Type de paiement
                  </label>
                  <Select defaultValue="instant">
                    <SelectTrigger className="bg-slate-800/50 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="instant">Instantane</SelectItem>
                      <SelectItem value="scheduled">Programme</SelectItem>
                      <SelectItem value="recurring">Recurrent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 h-12 text-sm font-bold">
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer le paiement
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-between h-12 border-white/10 text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="text-sm font-bold">Ajouter un employe</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-12 border-white/10 text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-xl">
                      <CreditCard className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className="text-sm font-bold">Payer un fournisseur</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-12 border-white/10 text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                      <PiggyBank className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-sm font-bold">Deposer des fonds</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-12 border-white/10 text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-xl">
                      <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                    </div>
                    <span className="text-sm font-bold">Generer un rapport</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Activite Recente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="w-9 h-9 rounded-xl bg-slate-700" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2 bg-slate-700" />
                        <Skeleton className="h-3 w-24 bg-slate-700" />
                      </div>
                    </div>
                  ))
                ) : transactions.length === 0 ? (
                  <div className="text-center py-4 text-slate-500">
                    <p className="text-xs">Aucune activite recente</p>
                  </div>
                ) : (
                  transactions.slice(0, 4).map((tx) => {
                    const getActivityIcon = () => {
                      if (tx.status === 'PENDING') return { icon: AlertCircle, color: 'amber' };
                      if (tx.status === 'FAILED' || tx.status === 'CANCELLED') return { icon: XCircle, color: 'red' };
                      if (tx.isIncoming) return { icon: ArrowDownLeft, color: 'emerald' };
                      return { icon: CheckCircle2, color: 'emerald' };
                    };
                    const { icon: Icon, color } = getActivityIcon();
                    const timeAgo = (dateStr: string) => {
                      const diff = Date.now() - new Date(dateStr).getTime();
                      const hours = Math.floor(diff / (1000 * 60 * 60));
                      if (hours < 1) return 'Il y a quelques minutes';
                      if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
                      const days = Math.floor(hours / 24);
                      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
                    };

                    return (
                      <div key={tx.id} className="flex items-start gap-3">
                        <div className={`p-2 bg-${color}-500/10 rounded-xl mt-0.5`}>
                          <Icon className={`h-4 w-4 text-${color}-500`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            {tx.isIncoming ? 'Paiement recu' : tx.status === 'PENDING' ? 'Paiement en attente' : tx.status === 'FAILED' ? 'Paiement echoue' : 'Paiement effectue'}
                          </p>
                          <p className="text-xs text-slate-500">{tx.counterparty} - ${tx.amount.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-600 mt-1">{timeAgo(tx.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
