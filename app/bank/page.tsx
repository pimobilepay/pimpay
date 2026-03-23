"use client";

import { useState } from "react";
import { BankSidebar } from "@/components/bank/BankSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

// Mock data for transactions chart
const transactionData = [
  { name: "Lun", daily: 245000, weekly: 1800000 },
  { name: "Mar", daily: 312000, weekly: 1850000 },
  { name: "Mer", daily: 289000, weekly: 1920000 },
  { name: "Jeu", daily: 378000, weekly: 2100000 },
  { name: "Ven", daily: 425000, weekly: 2350000 },
  { name: "Sam", daily: 198000, weekly: 2200000 },
  { name: "Dim", daily: 156000, weekly: 2150000 },
];

// Mock KYC pending data
const pendingKyc = [
  { id: "KYC001", name: "Pierre Mukendi", type: "Entreprise", submitted: "2026-03-23 09:45", risk: "low" },
  { id: "KYC002", name: "Marie Kabongo", type: "Particulier", submitted: "2026-03-23 08:30", risk: "medium" },
  { id: "KYC003", name: "Societe Alpha SARL", type: "Entreprise", submitted: "2026-03-22 16:20", risk: "high" },
  { id: "KYC004", name: "David Tshimanga", type: "Particulier", submitted: "2026-03-22 14:15", risk: "low" },
  { id: "KYC005", name: "Global Trade Ltd", type: "Entreprise", submitted: "2026-03-22 11:00", risk: "medium" },
];

// Mock interbank transfers
const interbankTransfers = [
  { id: "IB001", institution: "Banque Centrale du Congo", amount: 5000000, type: "Sortant", status: "completed", date: "2026-03-23" },
  { id: "IB002", institution: "Rawbank", amount: 2500000, type: "Entrant", status: "pending", date: "2026-03-23" },
  { id: "IB003", institution: "FBN Bank", amount: 1800000, type: "Sortant", status: "completed", date: "2026-03-22" },
  { id: "IB004", institution: "Equity BCDC", amount: 3200000, type: "Entrant", status: "completed", date: "2026-03-22" },
];

// Mock system alerts
const systemAlerts = [
  { id: 1, type: "security", message: "Tentative de connexion suspecte detectee", time: "Il y a 5 min", severity: "high" },
  { id: 2, type: "kyc", message: "5 verifications KYC en attente depuis plus de 24h", time: "Il y a 15 min", severity: "medium" },
  { id: 3, type: "transaction", message: "Transaction de haut montant necessitant approbation", time: "Il y a 30 min", severity: "medium" },
  { id: 4, type: "system", message: "Mise a jour systeme programmee ce soir", time: "Il y a 1h", severity: "low" },
];

// Mock chat messages
const chatMessages = [
  { id: 1, sender: "Support Admin", message: "Les nouvelles procedures de conformite sont en place.", time: "10:30", isAdmin: true },
  { id: 2, sender: "Vous", message: "Merci, pouvez-vous confirmer les nouveaux seuils de verification?", time: "10:35", isAdmin: false },
  { id: 3, sender: "Support Admin", message: "Les seuils ont ete mis a jour: 50K USD pour les entreprises, 10K USD pour les particuliers.", time: "10:38", isAdmin: true },
];

// Asset distribution for pie chart
const assetDistribution = [
  { name: "USD", value: 45000000, color: "#10b981" },
  { name: "EUR", value: 28000000, color: "#3b82f6" },
  { name: "Pi", value: 15000000, color: "#f59e0b" },
  { name: "Autres", value: 7000000, color: "#6b7280" },
];

export default function BankDashboard() {
  const [period, setPeriod] = useState("7d");
  const [chatMessage, setChatMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <Button variant="outline" size="icon" className="border-white/10 bg-slate-900/50">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Deposits */}
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Volume Total Depots</p>
                  <p className="text-2xl lg:text-3xl font-black text-white mt-1">$95.2M</p>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">+8.3% vs sem. prec.</span>
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
                  <p className="text-2xl lg:text-3xl font-black text-white mt-1">$42.8M</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Activity className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400">Ratio: 45.2%</span>
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
                  <p className="text-2xl lg:text-3xl font-black text-white mt-1">28,459</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-400">+342 aujourd&apos;hui</span>
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
                  <p className="text-2xl lg:text-3xl font-black text-amber-500 mt-1">{pendingKyc.length}</p>
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
                      {pendingKyc.map((kyc) => (
                        <TableRow key={kyc.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="text-xs font-mono text-slate-400">{kyc.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                                {kyc.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="text-sm font-bold text-white">{kyc.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                              {kyc.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">{kyc.submitted}</TableCell>
                          <TableCell>{getRiskBadge(kyc.risk)}</TableCell>
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
                      ))}
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
                      {interbankTransfers.map((transfer) => (
                        <TableRow key={transfer.id} className="border-white/5 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-800 rounded-xl">
                                <Landmark className="h-4 w-4 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{transfer.institution}</p>
                                <p className="text-[10px] text-slate-500 font-mono">{transfer.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className={`text-sm font-black ${
                              transfer.type === "Entrant" ? "text-emerald-500" : "text-white"
                            }`}>
                              {transfer.type === "Entrant" ? "+" : "-"}${(transfer.amount / 1000000).toFixed(1)}M
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-2 ${
                              transfer.type === "Entrant" ? "text-emerald-500" : "text-rose-500"
                            }`}>
                              {transfer.type === "Entrant" ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                              <span className="text-xs font-bold">{transfer.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">{transfer.date}</TableCell>
                          <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                        </TableRow>
                      ))}
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
