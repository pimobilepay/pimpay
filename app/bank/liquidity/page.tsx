"use client";

import { useState } from "react";
import { BankSidebar } from "@/components/bank/BankSidebar";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  AlertTriangle,
  Menu,
  X,
  RefreshCw,
  DollarSign,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Lock,
} from "lucide-react";

// Mock liquidity data over time
const liquidityTrend = [
  { date: "01 Mar", reserves: 38000000, deposits: 85000000, ratio: 44.7 },
  { date: "05 Mar", reserves: 39500000, deposits: 87000000, ratio: 45.4 },
  { date: "10 Mar", reserves: 41000000, deposits: 89000000, ratio: 46.1 },
  { date: "15 Mar", reserves: 40200000, deposits: 91000000, ratio: 44.2 },
  { date: "20 Mar", reserves: 42800000, deposits: 95200000, ratio: 45.0 },
  { date: "24 Mar", reserves: 42800000, deposits: 95200000, ratio: 45.0 },
];

// Asset breakdown
const assetDistribution = [
  { name: "USD", value: 45000000, color: "#10b981" },
  { name: "EUR", value: 28000000, color: "#3b82f6" },
  { name: "Pi", value: 15000000, color: "#f59e0b" },
  { name: "CDF", value: 5200000, color: "#8b5cf6" },
  { name: "Autres", value: 2000000, color: "#6b7280" },
];

// Recent liquidity movements
const liquidityMovements = [
  { id: "LM001", type: "inflow", source: "Depot Client", amount: 2500000, currency: "USD", date: "2026-03-24 10:30", status: "completed" },
  { id: "LM002", type: "outflow", source: "Retrait ATM", amount: 850000, currency: "USD", date: "2026-03-24 09:45", status: "completed" },
  { id: "LM003", type: "inflow", source: "Transfert Interbancaire", amount: 5000000, currency: "EUR", date: "2026-03-24 08:15", status: "pending" },
  { id: "LM004", type: "outflow", source: "Paiement Fournisseur", amount: 1200000, currency: "USD", date: "2026-03-23 16:20", status: "completed" },
  { id: "LM005", type: "inflow", source: "Depot Entreprise", amount: 3800000, currency: "USD", date: "2026-03-23 14:00", status: "completed" },
];

// Reserve requirements
const reserveRequirements = [
  { currency: "USD", required: 15000000, actual: 18500000, status: "compliant" },
  { currency: "EUR", required: 8000000, actual: 9200000, status: "compliant" },
  { currency: "Pi", required: 5000000, actual: 4800000, status: "warning" },
  { currency: "CDF", required: 2000000, actual: 2100000, status: "compliant" },
];

export default function LiquidityPage() {
  const [period, setPeriod] = useState("30d");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalAssets = assetDistribution.reduce((sum, asset) => sum + asset.value, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Effectue</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">En attente</Badge>;
      case "compliant":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Conforme</Badge>;
      case "warning":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">Attention</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[9px] font-bold">{status}</Badge>;
    }
  };

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
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Gestion des Liquidites</h1>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">
                <Activity className="h-3 w-3 mr-1" />
                En temps reel
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Suivi des reserves, flux de tresorerie et ratios de liquidite</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-white/10 text-white text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
                <SelectItem value="90d">90 jours</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="border-white/10 bg-slate-900/50">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-slate-900/50 border-emerald-500/20 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reserves Totales</p>
                  <p className="text-2xl lg:text-3xl font-black text-white mt-1">$42.8M</p>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">+5.2% ce mois</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <Wallet className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ratio de Liquidite</p>
                  <p className="text-2xl lg:text-3xl font-black text-white mt-1">45.0%</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Activity className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400">Objectif: 40%</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entrees (24h)</p>
                  <p className="text-2xl lg:text-3xl font-black text-emerald-500 mt-1">+$8.3M</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-400">12 transactions</span>
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
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sorties (24h)</p>
                  <p className="text-2xl lg:text-3xl font-black text-red-500 mt-1">-$2.1M</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-xs font-bold text-slate-400">8 transactions</span>
                  </div>
                </div>
                <div className="p-3 bg-red-500/10 rounded-2xl">
                  <ArrowUpRight className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Liquidity Trend Chart */}
          <Card className="xl:col-span-2 bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white">Evolution des Liquidites</CardTitle>
              <CardDescription className="text-slate-500">Reserves vs Depots sur la periode</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liquidityTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10, fontWeight: 600 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10, fontWeight: 600 }} tickFormatter={(v) => `$${v/1000000}M`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [`$${(value/1000000).toFixed(1)}M`, ""]}
                    />
                    <Area type="monotone" dataKey="deposits" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Depots" />
                    <Area type="monotone" dataKey="reserves" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.4} name="Reserves" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Asset Distribution */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white">Repartition des Actifs</CardTitle>
              <CardDescription className="text-slate-500">Par devise</CardDescription>
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
                      dataKey="value"
                      stroke="none"
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
                      formatter={(value: number) => [`$${(value/1000000).toFixed(1)}M`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {assetDistribution.map((asset) => (
                  <div key={asset.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }} />
                    <span className="text-xs font-bold text-slate-400">{asset.name}</span>
                    <span className="text-xs font-bold text-white ml-auto">{((asset.value / totalAssets) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Recent Movements */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white">Mouvements Recents</CardTitle>
              <CardDescription className="text-slate-500">Flux de liquidite des dernieres 24h</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Type</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Source</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Montant</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liquidityMovements.map((movement) => (
                      <TableRow key={movement.id} className="border-white/5 hover:bg-white/5">
                        <TableCell>
                          <div className={`p-2 rounded-lg w-fit ${movement.type === "inflow" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                            {movement.type === "inflow" ? (
                              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-bold text-white">{movement.source}</TableCell>
                        <TableCell className={`text-sm font-bold ${movement.type === "inflow" ? "text-emerald-500" : "text-red-500"}`}>
                          {movement.type === "inflow" ? "+" : "-"}${(movement.amount/1000000).toFixed(2)}M {movement.currency}
                        </TableCell>
                        <TableCell>{getStatusBadge(movement.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Reserve Requirements */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white">Exigences de Reserves</CardTitle>
              <CardDescription className="text-slate-500">Conformite aux ratios reglementaires</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reserveRequirements.map((req) => (
                  <div key={req.currency} className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-700/50">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-white">{req.currency}</span>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Requis: ${(req.required/1000000).toFixed(1)}M</span>
                        <span className="text-white font-bold">Actuel: ${(req.actual/1000000).toFixed(1)}M</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${req.status === "compliant" ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${Math.min((req.actual / req.required) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
