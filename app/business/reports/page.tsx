"use client";

import { useState } from "react";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  Download,
  FileText,
  BarChart3,
  PieChartIcon,
  Menu,
  X,
  Printer,
  Mail,
  Share2,
  FileSpreadsheet,
} from "lucide-react";

// Revenue data
const revenueData = [
  { month: "Jan", recettes: 180000, depenses: 145000, profit: 35000 },
  { month: "Fev", recettes: 195000, depenses: 160000, profit: 35000 },
  { month: "Mar", recettes: 220000, depenses: 175000, profit: 45000 },
  { month: "Avr", recettes: 210000, depenses: 165000, profit: 45000 },
  { month: "Mai", recettes: 235000, depenses: 180000, profit: 55000 },
  { month: "Jun", recettes: 250000, depenses: 190000, profit: 60000 },
];

// Category expenses
const categoryExpenses = [
  { name: "Salaires", value: 55, amount: 128000, color: "#10b981" },
  { name: "Fournisseurs", value: 25, amount: 58000, color: "#3b82f6" },
  { name: "Operations", value: 12, amount: 28000, color: "#f59e0b" },
  { name: "Marketing", value: 5, amount: 12000, color: "#8b5cf6" },
  { name: "Autres", value: 3, amount: 7000, color: "#ec4899" },
];

// Top clients
const topClients = [
  { name: "Entreprise ABC", revenue: 125000, transactions: 15, growth: 12.5 },
  { name: "Industries Co", revenue: 98000, transactions: 8, growth: 8.2 },
  { name: "Startup Tech", revenue: 72000, transactions: 12, growth: 25.4 },
  { name: "Client XYZ", revenue: 56000, transactions: 6, growth: -3.1 },
  { name: "Groupe Delta", revenue: 45000, transactions: 4, growth: 15.8 },
];

// Monthly comparison
const monthlyComparison = [
  { metric: "Chiffre d'affaires", current: 250000, previous: 220000, change: 13.6 },
  { metric: "Depenses totales", current: 190000, previous: 175000, change: 8.6 },
  { metric: "Profit net", current: 60000, previous: 45000, change: 33.3 },
  { metric: "Transactions", current: 156, previous: 142, change: 9.9 },
];

// Available reports
const availableReports = [
  { id: 1, name: "Rapport Financier Mensuel", type: "Finances", lastGenerated: "23 Mar 2026", format: "PDF" },
  { id: 2, name: "Analyse des Depenses", type: "Depenses", lastGenerated: "22 Mar 2026", format: "Excel" },
  { id: 3, name: "Rapport de Paie", type: "RH", lastGenerated: "01 Mar 2026", format: "PDF" },
  { id: 4, name: "Flux de Tresorerie", type: "Tresorerie", lastGenerated: "20 Mar 2026", format: "PDF" },
  { id: 5, name: "Performance Clients", type: "Ventes", lastGenerated: "15 Mar 2026", format: "Excel" },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState("6m");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <Button variant="outline" className="border-white/10 text-xs font-bold">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button variant="outline" size="icon" className="border-white/10 bg-slate-900/50">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {monthlyComparison.map((metric, index) => (
            <Card key={index} className={`rounded-3xl ${
              index === 2 ? "bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-500/30" : "bg-slate-900/50 border-white/5"
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${index === 2 ? "text-emerald-300/70" : "text-slate-500"}`}>
                      {metric.metric}
                    </p>
                    <p className="text-2xl font-black text-white mt-1">
                      {metric.metric.includes("Transactions") ? metric.current : `$${metric.current.toLocaleString()}`}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {metric.change > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                      )}
                      <span className={`text-xs font-bold ${metric.change > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {metric.change > 0 ? "+" : ""}{metric.change}%
                      </span>
                      <span className="text-xs text-slate-500">vs mois dernier</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                    <CardDescription className="text-slate-500">Evolution sur 6 mois</CardDescription>
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
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
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
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryExpenses}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryExpenses.map((entry, index) => (
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
                      formatter={(value: number, name: string, props: { payload: { amount: number } }) => [`$${props.payload.amount.toLocaleString()} (${value}%)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {categoryExpenses.map((category) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                      <span className="text-xs font-bold text-slate-400">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-white">${(category.amount / 1000).toFixed(0)}k</span>
                      <span className="text-[10px] text-slate-500 ml-2">({category.value}%)</span>
                    </div>
                  </div>
                ))}
              </div>
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
                <Button variant="outline" size="sm" className="border-white/10 text-xs font-bold">
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {topClients.map((client, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-sm font-black text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{client.name}</p>
                      <p className="text-[10px] text-slate-500">{client.transactions} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">${client.revenue.toLocaleString()}</p>
                    <div className="flex items-center gap-1 justify-end">
                      {client.growth > 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-rose-400" />
                      )}
                      <span className={`text-[10px] font-bold ${client.growth > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {client.growth > 0 ? "+" : ""}{client.growth}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
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
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-xs font-bold">
                  <FileText className="h-4 w-4 mr-2" />
                  Nouveau rapport
                </Button>
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
                        <FileText className={`h-5 w-5 ${report.format === "PDF" ? "text-red-500" : "text-emerald-500"}`} />
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
                        <span className="text-[10px] text-slate-500">{report.lastGenerated}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                      <Download className="h-4 w-4" />
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
