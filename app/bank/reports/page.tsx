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
  FileBarChart,
  Landmark,
  Menu,
  X,
  RefreshCw,
  Download,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
  Wallet,
  Shield,
  Eye,
  Plus,
  FilePieChart,
  FileSpreadsheet,
} from "lucide-react";

// Mock reports data
const recentReports = [
  { id: "RPT001", name: "Rapport Liquidite Mensuel", type: "liquidity", period: "Mars 2026", generated: "2026-03-24 08:00", status: "ready", size: "2.4 MB" },
  { id: "RPT002", name: "Synthese Conformite KYC", type: "compliance", period: "Q1 2026", generated: "2026-03-23 14:30", status: "ready", size: "1.8 MB" },
  { id: "RPT003", name: "Analyse Flux Interbancaires", type: "interbank", period: "Mars 2026", generated: "2026-03-22 16:00", status: "ready", size: "3.1 MB" },
  { id: "RPT004", name: "Rapport Risque Global", type: "risk", period: "Q1 2026", generated: "2026-03-20 09:00", status: "ready", size: "4.5 MB" },
  { id: "RPT005", name: "Rapport Utilisateurs Actifs", type: "users", period: "Mars 2026", generated: "2026-03-18 11:00", status: "ready", size: "1.2 MB" },
  { id: "RPT006", name: "Rapport Transactions Suspectes", type: "aml", period: "Mars 2026", generated: "2026-03-15 10:00", status: "ready", size: "890 KB" },
];

// Scheduled reports
const scheduledReports = [
  { id: "SCH001", name: "Rapport Journalier Transactions", frequency: "Quotidien", nextRun: "2026-03-25 06:00", recipients: 3 },
  { id: "SCH002", name: "Synthese Hebdomadaire Liquidite", frequency: "Hebdomadaire", nextRun: "2026-03-31 08:00", recipients: 5 },
  { id: "SCH003", name: "Rapport Mensuel Conformite", frequency: "Mensuel", nextRun: "2026-04-01 09:00", recipients: 8 },
  { id: "SCH004", name: "Analyse Trimestrielle Risques", frequency: "Trimestriel", nextRun: "2026-04-01 10:00", recipients: 4 },
];

// Report templates
const reportTemplates = [
  { id: "TPL001", name: "Liquidite Standard", icon: Wallet, description: "Reserves, ratios et flux de tresorerie", category: "Finance" },
  { id: "TPL002", name: "Conformite KYC/AML", icon: Shield, description: "Verifications et alertes anti-blanchiment", category: "Conformite" },
  { id: "TPL003", name: "Performance Utilisateurs", icon: Users, description: "Activite et engagement des clients", category: "Clients" },
  { id: "TPL004", name: "Analyse des Risques", icon: TrendingUp, description: "Exposition et indicateurs de risque", category: "Risque" },
  { id: "TPL005", name: "Flux Interbancaires", icon: FileBarChart, description: "Transferts SWIFT et volumes", category: "Operations" },
  { id: "TPL006", name: "Audit Trail", icon: FileText, description: "Journal des actions systeme", category: "Securite" },
];

export default function ReportsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("all");

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "liquidity":
        return <Wallet className="h-4 w-4 text-emerald-500" />;
      case "compliance":
        return <Shield className="h-4 w-4 text-blue-500" />;
      case "interbank":
        return <FileBarChart className="h-4 w-4 text-amber-500" />;
      case "risk":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "users":
        return <Users className="h-4 w-4 text-slate-400" />;
      case "aml":
        return <Shield className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "liquidity":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Liquidite</Badge>;
      case "compliance":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-bold">Conformite</Badge>;
      case "interbank":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">Interbancaire</Badge>;
      case "risk":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Risque</Badge>;
      case "users":
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] font-bold">Utilisateurs</Badge>;
      case "aml":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">AML</Badge>;
      default:
        return null;
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
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Rapports</h1>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                <FileBarChart className="h-3 w-3 mr-1" />
                Analytics
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Generation et planification de rapports institutionnels</p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Rapport
            </Button>
            <Button variant="outline" size="icon" className="border-white/10 bg-slate-900/50">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Generes ce mois</p>
                  <p className="text-xl font-black text-white">24</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Programmes</p>
                  <p className="text-xl font-black text-white">{scheduledReports.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <FilePieChart className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Templates</p>
                  <p className="text-xl font-black text-white">{reportTemplates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-500/10 rounded-xl">
                  <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Stockage</p>
                  <p className="text-xl font-black text-white">13.8 MB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Reports */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Rapports Recents</CardTitle>
                    <CardDescription className="text-slate-500">Rapports generes et disponibles au telechargement</CardDescription>
                  </div>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-32 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                      <SelectValue placeholder="Periode" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                      <SelectItem value="quarter">Ce trimestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentReports.map((report) => (
                    <div key={report.id} className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 hover:bg-slate-800/80 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl bg-slate-700/50">
                            {getTypeIcon(report.type)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{report.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {getTypeBadge(report.type)}
                              <span className="text-[10px] text-slate-500">{report.period}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {report.generated}
                              </span>
                              <span className="text-[10px] text-slate-500">{report.size}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-400">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Report Templates */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Templates de Rapports</CardTitle>
                <CardDescription className="text-slate-500">Modeles predéfinis pour generation rapide</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTemplates.map((template) => (
                    <div key={template.id} className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-blue-500/30 transition-colors cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/10">
                          <template.icon className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">{template.name}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{template.description}</p>
                          <Badge className="mt-2 bg-slate-700/50 text-slate-400 border-slate-600 text-[9px] font-bold">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scheduled Reports */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white">Rapports Programmes</CardTitle>
              <CardDescription className="text-slate-500">Generation automatique planifiee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduledReports.map((report) => (
                  <div key={report.id} className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <p className="text-sm font-bold text-white">{report.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-bold">
                        {report.frequency}
                      </Badge>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500">Prochaine execution</span>
                        <span className="text-xs font-bold text-white">{report.nextRun}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500">Destinataires</span>
                        <span className="text-xs font-bold text-white">{report.recipients} personnes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 border-white/10 text-xs font-bold">
                <Plus className="h-4 w-4 mr-2" />
                Planifier un rapport
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
