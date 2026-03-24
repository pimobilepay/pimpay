"use client";

import { useState } from "react";
import { BankSidebar } from "@/components/bank/BankSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "recharts";
import {
  ArrowLeftRight,
  Landmark,
  Menu,
  X,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Eye,
  Send,
  Download,
} from "lucide-react";

// Mock interbank flow data
const flowData = [
  { name: "Lun", entrant: 8500000, sortant: 6200000 },
  { name: "Mar", entrant: 12000000, sortant: 9500000 },
  { name: "Mer", entrant: 7800000, sortant: 11000000 },
  { name: "Jeu", entrant: 15200000, sortant: 8900000 },
  { name: "Ven", entrant: 18500000, sortant: 14200000 },
  { name: "Sam", entrant: 5200000, sortant: 3800000 },
  { name: "Dim", entrant: 2100000, sortant: 1500000 },
];

// Mock interbank transfers
const interbankTransfers = [
  { id: "IB001", institution: "Banque Centrale du Congo", swift: "BCCNCDKX", amount: 5000000, currency: "USD", type: "outgoing", status: "completed", date: "2026-03-24 10:30", reference: "BCC/2026/03/001" },
  { id: "IB002", institution: "Rawbank", swift: "RAWBCDKI", amount: 2500000, currency: "EUR", type: "incoming", status: "pending", date: "2026-03-24 09:45", reference: "RAW/2026/03/145" },
  { id: "IB003", institution: "FBN Bank", swift: "FBNKCDKI", amount: 1800000, currency: "USD", type: "outgoing", status: "completed", date: "2026-03-24 08:15", reference: "FBN/2026/03/089" },
  { id: "IB004", institution: "Equity BCDC", swift: "EQTYCDKX", amount: 3200000, currency: "USD", type: "incoming", status: "completed", date: "2026-03-23 16:20", reference: "EQT/2026/03/234" },
  { id: "IB005", institution: "Access Bank", swift: "ABNGCDKI", amount: 4500000, currency: "EUR", type: "outgoing", status: "processing", date: "2026-03-23 14:00", reference: "ACC/2026/03/067" },
  { id: "IB006", institution: "Standard Bank", swift: "SBICCDKX", amount: 8900000, currency: "USD", type: "incoming", status: "completed", date: "2026-03-23 11:30", reference: "STD/2026/03/112" },
  { id: "IB007", institution: "TMB Bank", swift: "TMBKCDKI", amount: 1200000, currency: "USD", type: "outgoing", status: "failed", date: "2026-03-22 15:45", reference: "TMB/2026/03/078" },
];

// Partner banks
const partnerBanks = [
  { name: "Banque Centrale du Congo", swift: "BCCNCDKX", country: "RDC", status: "active", volume: 45000000 },
  { name: "Rawbank", swift: "RAWBCDKI", country: "RDC", status: "active", volume: 32000000 },
  { name: "FBN Bank", swift: "FBNKCDKI", country: "RDC", status: "active", volume: 18500000 },
  { name: "Equity BCDC", swift: "EQTYCDKX", country: "RDC", status: "active", volume: 28000000 },
  { name: "Access Bank", swift: "ABNGCDKI", country: "RDC", status: "maintenance", volume: 15000000 },
];

export default function InterbankPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [period, setPeriod] = useState("7d");
  const [typeFilter, setTypeFilter] = useState("all");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Effectue</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">En attente</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-bold">Traitement</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Echec</Badge>;
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Actif</Badge>;
      case "maintenance":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">Maintenance</Badge>;
      default:
        return null;
    }
  };

  const filteredTransfers = interbankTransfers.filter(transfer => {
    if (typeFilter === "all") return true;
    return transfer.type === typeFilter;
  });

  const totalIncoming = interbankTransfers.filter(t => t.type === "incoming" && t.status === "completed").reduce((sum, t) => sum + t.amount, 0);
  const totalOutgoing = interbankTransfers.filter(t => t.type === "outgoing" && t.status === "completed").reduce((sum, t) => sum + t.amount, 0);
  const pendingCount = interbankTransfers.filter(t => t.status === "pending" || t.status === "processing").length;

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
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Flux Interbancaires</h1>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                <ArrowLeftRight className="h-3 w-3 mr-1" />
                SWIFT
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Transferts entre institutions financieres</p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Transfert
            </Button>
            <Button variant="outline" size="icon" className="border-white/10 bg-slate-900/50">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Entrant</p>
                  <p className="text-2xl lg:text-3xl font-black text-emerald-500 mt-1">${(totalIncoming/1000000).toFixed(1)}M</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-400">Cette semaine</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                  <ArrowDownLeft className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500/10 border-red-500/20 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Sortant</p>
                  <p className="text-2xl lg:text-3xl font-black text-red-500 mt-1">${(totalOutgoing/1000000).toFixed(1)}M</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-xs font-bold text-slate-400">Cette semaine</span>
                  </div>
                </div>
                <div className="p-3 bg-red-500/20 rounded-2xl">
                  <ArrowUpRight className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/20 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">En Attente</p>
                  <p className="text-2xl lg:text-3xl font-black text-amber-500 mt-1">{pendingCount}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-slate-400">Transferts</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-500/20 rounded-2xl">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Partenaires</p>
                  <p className="text-2xl lg:text-3xl font-black text-blue-500 mt-1">{partnerBanks.length}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Building2 className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-slate-400">Banques actives</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-2xl">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flow Chart */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl mb-8">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black text-white">Volume des Flux</CardTitle>
                <CardDescription className="text-slate-500">Comparaison entrees/sorties interbancaires</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-400">Entrant</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs font-bold text-slate-400">Sortant</span>
                </div>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-28 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="7d">7 jours</SelectItem>
                    <SelectItem value="30d">30 jours</SelectItem>
                    <SelectItem value="90d">90 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fontWeight: 600 }} />
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
                  <Bar dataKey="entrant" fill="#10b981" radius={[4, 4, 0, 0]} name="Entrant" />
                  <Bar dataKey="sortant" fill="#ef4444" radius={[4, 4, 0, 0]} name="Sortant" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Transfers Table */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-black text-white">Transferts Recents</CardTitle>
                  <CardDescription className="text-slate-500">Historique des operations interbancaires</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="incoming">Entrant</SelectItem>
                      <SelectItem value="outgoing">Sortant</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="border-white/10 text-xs font-bold">
                    <Download className="h-4 w-4 mr-2" />
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
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Reference</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Institution</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Montant</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Type</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Date</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Statut</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransfers.map((transfer) => (
                      <TableRow key={transfer.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-xs font-mono text-slate-400">{transfer.reference}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{transfer.institution}</p>
                              <p className="text-[10px] text-slate-500">{transfer.swift}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className={`text-sm font-bold ${transfer.type === "incoming" ? "text-emerald-500" : "text-red-500"}`}>
                          {transfer.type === "incoming" ? "+" : "-"}${(transfer.amount/1000000).toFixed(2)}M {transfer.currency}
                        </TableCell>
                        <TableCell>
                          <div className={`p-2 rounded-lg w-fit ${transfer.type === "incoming" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                            {transfer.type === "incoming" ? (
                              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">{transfer.date}</TableCell>
                        <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Partner Banks */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white">Banques Partenaires</CardTitle>
              <CardDescription className="text-slate-500">Reseau interbancaire</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {partnerBanks.map((bank) => (
                  <div key={bank.swift} className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{bank.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{bank.swift}</p>
                        </div>
                      </div>
                      {getStatusBadge(bank.status)}
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                      <span className="text-[10px] text-slate-500">Volume total</span>
                      <span className="text-sm font-bold text-white">${(bank.volume/1000000).toFixed(1)}M</span>
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
