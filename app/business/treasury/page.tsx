"use client";

import { useState, useEffect, useCallback } from "react";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Calendar,
  RefreshCw,
  PiggyBank,
  CreditCard,
  Banknote,
  Menu,
  X,
  LineChart,
  CircleDollarSign,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

// Types
interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: string;
}

interface Movement {
  id: string;
  description: string;
  amount: number;
  type: "entrant" | "sortant";
  date: string;
  time: string;
}

interface ExpenseCategory {
  name: string;
  value: number;
  amount: number;
}

interface CashFlowPoint {
  day: string;
  entrant: number;
  sortant: number;
}

interface TreasuryData {
  accounts: Account[];
  totals: {
    totalBalance: number;
    totalEntrant: number;
    totalSortant: number;
    netFlow: number;
  };
  cashFlowData: CashFlowPoint[];
  expenseCategories: ExpenseCategory[];
  recentMovements: Movement[];
}

const EXPENSE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];

export default function TreasuryPage() {
  const [period, setPeriod] = useState("30d");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTreasuryData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/business/treasury?period=${period}`, {
        credentials: "include",
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Erreur lors du chargement");
      }
      
      setData(result.data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchTreasuryData();
  }, [fetchTreasuryData]);

  const accounts = data?.accounts || [];
  const totals = data?.totals || { totalBalance: 0, totalEntrant: 0, totalSortant: 0, netFlow: 0 };
  const cashFlowData = data?.cashFlowData || [];
  const expenseCategories = data?.expenseCategories || [];
  const recentMovements = data?.recentMovements || [];

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

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Tresorerie</h1>
            <p className="text-sm text-slate-500 mt-1">Vue d&apos;ensemble de vos flux financiers</p>
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
              onClick={fetchTreasuryData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchTreasuryData} className="ml-auto border-red-500/20 text-red-400">
              Reessayer
            </Button>
          </div>
        )}

        {/* Balance Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-500/30 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-300/70 uppercase tracking-wider">Solde Total USD</p>
                  {loading ? (
                    <Skeleton className="h-9 w-32 mt-1 bg-emerald-500/20" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">${totals.totalBalance.toLocaleString()}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">Portefeuille</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                  <Wallet className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recettes ({period})</p>
                  {loading ? (
                    <Skeleton className="h-9 w-28 mt-1 bg-slate-700" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">${totals.totalEntrant.toLocaleString()}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">Entrees</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <ArrowDownLeft className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Depenses ({period})</p>
                  {loading ? (
                    <Skeleton className="h-9 w-28 mt-1 bg-slate-700" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">${totals.totalSortant.toLocaleString()}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                    <span className="text-xs font-bold text-rose-400">Sorties</span>
                  </div>
                </div>
                <div className="p-3 bg-rose-500/10 rounded-2xl">
                  <ArrowUpRight className="h-6 w-6 text-rose-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`rounded-3xl ${totals.netFlow >= 0 ? "bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border-blue-500/30" : "bg-gradient-to-br from-rose-500/20 to-red-600/20 border-rose-500/30"}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${totals.netFlow >= 0 ? "text-blue-300/70" : "text-rose-300/70"}`}>Flux Net</p>
                  {loading ? (
                    <Skeleton className="h-9 w-28 mt-1 bg-blue-500/20" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">{totals.netFlow >= 0 ? "+" : ""}${totals.netFlow.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">Periode: {period}</p>
                </div>
                <div className={`p-3 rounded-2xl ${totals.netFlow >= 0 ? "bg-blue-500/20" : "bg-rose-500/20"}`}>
                  <LineChart className={`h-6 w-6 ${totals.netFlow >= 0 ? "text-blue-400" : "text-rose-400"}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Cash Flow Chart */}
          <div className="xl:col-span-2">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Flux de Tresorerie</CardTitle>
                    <CardDescription className="text-slate-500">Entrees et sorties sur {period}</CardDescription>
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
                <div className="h-[300px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Skeleton className="h-full w-full rounded-2xl bg-slate-800" />
                    </div>
                  ) : cashFlowData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <LineChart className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm">Aucune donnee pour cette periode</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashFlowData}>
                        <defs>
                          <linearGradient id="colorEntrantTreasury" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorSortantTreasury" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis 
                          dataKey="day" 
                          stroke="#64748b" 
                          tick={{ fontSize: 10, fontWeight: 600 }} 
                          interval="preserveStartEnd"
                          minTickGap={30}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          tick={{ fontSize: 10, fontWeight: 600 }} 
                          tickFormatter={(v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                        />
                        <Area type="monotone" dataKey="entrant" stroke="#10b981" strokeWidth={2} fill="url(#colorEntrantTreasury)" name="Entrant" />
                        <Area type="monotone" dataKey="sortant" stroke="#f43f5e" strokeWidth={2} fill="url(#colorSortantTreasury)" name="Sortant" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense Distribution */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white">Repartition des Depenses</CardTitle>
              <CardDescription className="text-slate-500">Par categorie</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {loading ? (
                  <Skeleton className="h-full w-full rounded-full bg-slate-800" />
                ) : expenseCategories.length === 0 || expenseCategories.every(c => c.value === 0) ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <PiggyBank className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-xs">Aucune depense</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseCategories.filter(c => c.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {expenseCategories.filter(c => c.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string, props: { payload: ExpenseCategory }) => [
                          `${value}% ($${props.payload.amount.toLocaleString()})`,
                          props.payload.name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full bg-slate-800" />
                  ))
                ) : (
                  expenseCategories.map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }} />
                        <span className="text-xs font-bold text-slate-400">{category.name}</span>
                      </div>
                      <span className="text-xs font-black text-white">{category.value}%</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Accounts & Recent Movements */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Cash Accounts */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-white">Comptes de Tresorerie</CardTitle>
                  <CardDescription className="text-slate-500">Soldes par compte</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="border-white/10 text-xs font-bold">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Ajouter Compte
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-2xl bg-slate-800" />
                ))
              ) : accounts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Wallet className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Aucun compte trouve</p>
                </div>
              ) : (
                accounts.map((account) => (
                  <div key={account.id} className="p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                          account.type === "MAIN" ? "bg-emerald-500/10" :
                          account.type === "SAVINGS" ? "bg-amber-500/10" : "bg-purple-500/10"
                        }`}>
                          {account.type === "MAIN" ? <Wallet className="h-5 w-5 text-emerald-500" /> :
                           account.type === "SAVINGS" ? <PiggyBank className="h-5 w-5 text-amber-500" /> :
                           account.currency === "PI" ? <CircleDollarSign className="h-5 w-5 text-purple-500" /> :
                           <Banknote className="h-5 w-5 text-blue-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{account.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{account.currency}</p>
                        </div>
                      </div>
                      <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px] font-bold">
                        {account.type}
                      </Badge>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-black text-white">
                        {account.currency === "PI" ? "Pi " : "$"}{account.balance.toLocaleString()}
                      </p>
                      <Button variant="ghost" size="sm" className="text-emerald-500 text-xs font-bold h-8">
                        Details <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Movements */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-white">Mouvements Recents</CardTitle>
                  <CardDescription className="text-slate-500">Dernieres operations</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="border-white/10 text-xs font-bold">
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-800" />
                ))
              ) : recentMovements.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ArrowUpRight className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Aucun mouvement recent</p>
                </div>
              ) : (
                recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${movement.type === "entrant" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                        {movement.type === "entrant" ? (
                          <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-rose-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{movement.description}</p>
                        <p className="text-[10px] text-slate-500">{movement.date} - {movement.time}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-black ${movement.type === "entrant" ? "text-emerald-500" : "text-rose-500"}`}>
                      {movement.type === "entrant" ? "+" : "-"}${movement.amount.toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
