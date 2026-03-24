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
  BarChart,
  Bar,
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
  Calendar,
  RefreshCw,
  Download,
  FileText,
  Menu,
  X,
  Printer,
  Share2,
  FileSpreadsheet,
} from "lucide-react";

// Types based on API response
interface Summary {
  totalRecettes: number;
  totalDepenses: number;
  totalProfit: number;
  totalTransactions: number;
  recettesChange: number;
  depensesChange: number;
  profitChange: number;
  transactionsChange: number;
}

interface RevenueData {
  month: string;
  recettes: number;
  depenses: number;
  profit: number;
}

interface ExpenseCategory {
  name: string;
  value: number;
  amount: number;
  color: string;
}

interface TopClient {
  rank: number;
  name: string;
  revenue: number;
  transactions: number;
  growth: number;
}

interface ReportsData {
  summary: Summary;
  revenueData: RevenueData[];
  expenseCategories: ExpenseCategory[];
  topClients: TopClient[];
  period: {
    start: string;
    end: string;
    months: number;
  };
}

// Static available reports (these would be saved reports in DB in production)
const availableReports = [
  { id: 1, name: "Rapport Financier Mensuel", type: "Finances", reportType: "financial", lastGenerated: "-", format: "PDF" },
  { id: 2, name: "Rapport de Paie", type: "RH", reportType: "payroll", lastGenerated: "-", format: "PDF" },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState("6m");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Real data state
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  // Fetch reports data
  const fetchReportsData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/business/reports?period=${period}`, {
        headers: { "Content-Type": "application/json" },
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
    fetchReportsData();
  }, [fetchReportsData]);

  // Generate report
  const generateReport = async (reportType: string) => {
    try {
      setGeneratingReport(reportType);
      const response = await fetch("/api/business/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reportType,
          format: "json"
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la generation");
      }
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur lors de la generation");
    } finally {
      setGeneratingReport(null);
    }
  };

  // Metrics for cards
  const metrics = data ? [
    { 
      metric: "Chiffre d'affaires", 
      current: data.summary.totalRecettes, 
      change: data.summary.recettesChange,
      isHighlight: false
    },
    { 
      metric: "Depenses totales", 
      current: data.summary.totalDepenses, 
      change: data.summary.depensesChange,
      isHighlight: false
    },
    { 
      metric: "Profit net", 
      current: data.summary.totalProfit, 
      change: data.summary.profitChange,
      isHighlight: true
    },
    { 
      metric: "Transactions", 
      current: data.summary.totalTransactions, 
      change: data.summary.transactionsChange,
      isHighlight: false
    },
  ] : [];

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
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Rapports</h1>
            <p className="text-sm text-slate-500 mt-1">Analyses et statistiques de votre activite</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36 bg-slate-900/50 border-white/10 text-white text-xs font-bold">
                <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="1m">Ce mois</SelectItem>
                <SelectItem value="3m">3 mois</SelectItem>
                <SelectItem value="6m">6 mois</SelectItem>
                <SelectItem value="1y">Cette annee</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              className="border-white/10 text-xs font-bold"
              onClick={fetchReportsData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30 rounded-3xl mb-8">
            <CardContent className="p-6">
              <p className="text-red-400 text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchReportsData} className="mt-2 border-red-500/30 text-red-400">
                Reessayer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-3xl bg-slate-800" />
            ))
          ) : (
            metrics.map((metric, index) => (
              <Card key={index} className={`rounded-3xl ${
                metric.isHighlight 
                  ? "bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-500/30" 
                  : "bg-slate-900/50 border-white/5"
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${
                        metric.isHighlight ? "text-emerald-300/70" : "text-slate-500"
                      }`}>
                        {metric.metric}
                      </p>
                      <p className="text-2xl font-black text-white mt-1">
                        {metric.metric.includes("Transactions") 
                          ? metric.current 
                          : `$${metric.current.toLocaleString()}`}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {metric.change >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                        )}
                        <span className={`text-xs font-bold ${
                          metric.change >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {metric.change >= 0 ? "+" : ""}{metric.change}%
                        </span>
                        <span className="text-xs text-slate-500">vs periode prec.</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Revenue & Expenses Chart */}
          <div className="xl:col-span-2">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Recettes vs Depenses</CardTitle>
                    <CardDescription className="text-slate-500">
                      Evolution sur {data?.period.months || 6} mois
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-400">Recettes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-slate-400">Depenses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold text-slate-400">Profit</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Skeleton className="w-full h-full rounded-2xl bg-slate-800" />
                    </div>
                  ) : data?.revenueData && data.revenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 10, fontWeight: 600 }} />
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
                        <Bar dataKey="recettes" fill="#10b981" radius={[4, 4, 0, 0]} name="Recettes" />
                        <Bar dataKey="depenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Depenses" />
                        <Bar dataKey="profit" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-slate-500 text-sm">Aucune donnee disponible</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense Categories */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white">Repartition des Depenses</CardTitle>
              <CardDescription className="text-slate-500">Par categorie</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <Skeleton className="h-[180px] rounded-2xl bg-slate-800 mb-4" />
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 bg-slate-800" />
                    ))}
                  </div>
                </>
              ) : data?.expenseCategories && data.expenseCategories.some(c => c.amount > 0) ? (
                <>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.expenseCategories.filter(c => c.amount > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {data.expenseCategories.filter(c => c.amount > 0).map((entry, index) => (
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
                          formatter={(value: number, name: string, props: { payload: ExpenseCategory }) => [
                            `$${props.payload.amount.toLocaleString()} (${value}%)`, 
                            props.payload.name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {data.expenseCategories.map((category) => (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                          <span className="text-xs font-bold text-slate-400">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-white">
                            ${category.amount >= 1000 ? `${(category.amount / 1000).toFixed(0)}k` : category.amount}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-2">({category.value}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-slate-500 text-sm">Aucune depense enregistree</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Top Clients */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-white">Top Clients</CardTitle>
                  <CardDescription className="text-slate-500">Par chiffre d&apos;affaires</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl bg-slate-800" />
                ))
              ) : data?.topClients && data.topClients.length > 0 ? (
                data.topClients.map((client) => (
                  <div key={client.rank} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-sm font-black text-white">
                        {client.rank}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{client.name}</p>
                        <p className="text-[10px] text-slate-500">{client.transactions} transactions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">${client.revenue.toLocaleString()}</p>
                      <div className="flex items-center gap-1 justify-end">
                        {client.growth >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-rose-400" />
                        )}
                        <span className={`text-[10px] font-bold ${client.growth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {client.growth >= 0 ? "+" : ""}{client.growth}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">Aucun client trouve</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Reports */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-white">Rapports Disponibles</CardTitle>
                  <CardDescription className="text-slate-500">Telecharger ou partager</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      report.format === "PDF" ? "bg-red-500/10" : "bg-emerald-500/10"
                    }`}>
                      {report.format === "PDF" ? (
                        <FileText className="h-5 w-5 text-red-500" />
                      ) : (
                        <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{report.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-800 text-slate-300 border-white/10 text-[9px] font-bold">
                          {report.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-white"
                      onClick={() => generateReport(report.reportType)}
                      disabled={generatingReport === report.reportType}
                    >
                      {generatingReport === report.reportType ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
