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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Users,
  Landmark,
  Menu,
  X,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  User,
  MoreHorizontal,
} from "lucide-react";

// Mock KYC verification requests
const kycRequests = [
  { id: "KYC001", name: "Pierre Mukendi", type: "Entreprise", document: "Registre Commerce", submitted: "2026-03-24 09:45", risk: "low", status: "pending" },
  { id: "KYC002", name: "Marie Kabongo", type: "Particulier", document: "Carte Identite", submitted: "2026-03-24 08:30", risk: "medium", status: "pending" },
  { id: "KYC003", name: "Societe Alpha SARL", type: "Entreprise", document: "Statuts", submitted: "2026-03-23 16:20", risk: "high", status: "review" },
  { id: "KYC004", name: "David Tshimanga", type: "Particulier", document: "Passeport", submitted: "2026-03-23 14:15", risk: "low", status: "approved" },
  { id: "KYC005", name: "Global Trade Ltd", type: "Entreprise", document: "Licence Import", submitted: "2026-03-23 11:00", risk: "medium", status: "pending" },
  { id: "KYC006", name: "Jean Baptiste Lumu", type: "Particulier", document: "Permis Conduire", submitted: "2026-03-22 15:30", risk: "low", status: "approved" },
  { id: "KYC007", name: "Mining Corp SA", type: "Entreprise", document: "Permis Exploitation", submitted: "2026-03-22 10:00", risk: "high", status: "rejected" },
];

// AML alerts
const amlAlerts = [
  { id: "AML001", account: "ACC-78945", type: "Transaction suspecte", amount: 150000, currency: "USD", date: "2026-03-24 11:20", severity: "high", status: "open" },
  { id: "AML002", account: "ACC-12367", type: "Fractionnement", amount: 45000, currency: "EUR", date: "2026-03-24 09:15", severity: "medium", status: "investigating" },
  { id: "AML003", account: "ACC-56234", type: "Pays a risque", amount: 250000, currency: "USD", date: "2026-03-23 16:45", severity: "high", status: "open" },
  { id: "AML004", account: "ACC-89012", type: "Client PEP", amount: 80000, currency: "EUR", date: "2026-03-23 14:00", severity: "medium", status: "resolved" },
  { id: "AML005", account: "ACC-34567", type: "Volume inhabituel", amount: 500000, currency: "USD", date: "2026-03-22 11:30", severity: "low", status: "resolved" },
];

// Compliance statistics
const complianceStats = {
  kycPending: 12,
  kycApproved: 1845,
  kycRejected: 23,
  amlOpen: 8,
  amlResolved: 156,
  riskScore: 72,
};

export default function CompliancePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("kyc");

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Haut</Badge>;
      case "medium":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">Moyen</Badge>;
      case "low":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Faible</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">En attente</Badge>;
      case "approved":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Approuve</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Rejete</Badge>;
      case "review":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-bold">En revision</Badge>;
      case "open":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Ouvert</Badge>;
      case "investigating":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">Investigation</Badge>;
      case "resolved":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Resolu</Badge>;
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Critique</Badge>;
      case "medium":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">Moyen</Badge>;
      case "low":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Faible</Badge>;
      default:
        return null;
    }
  };

  const filteredKyc = kycRequests.filter(kyc => {
    const matchesSearch = kyc.name.toLowerCase().includes(searchTerm.toLowerCase()) || kyc.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || kyc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Conformite</h1>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                <Shield className="h-3 w-3 mr-1" />
                KYC/AML
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Gestion des verifications KYC et alertes anti-blanchiment</p>
          </div>
          <Button variant="outline" size="icon" className="border-white/10 bg-slate-900/50">
            <RefreshCw className="h-4 w-4 text-slate-400" />
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <Card className="bg-amber-500/10 border-amber-500/20 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/20 rounded-lg shrink-0">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[7px] font-bold text-slate-500 uppercase truncate">KYC En attente</p>
                  <p className="text-base font-black text-amber-500">{complianceStats.kycPending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500/10 border-red-500/20 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-500/20 rounded-lg shrink-0">
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[7px] font-bold text-slate-500 uppercase truncate">KYC Rejetes</p>
                  <p className="text-base font-black text-red-500">{complianceStats.kycRejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg shrink-0">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[7px] font-bold text-slate-500 uppercase truncate">AML Resolus</p>
                  <p className="text-base font-black text-emerald-500">{complianceStats.amlResolved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-white/5 p-1 rounded-2xl">
            <TabsTrigger value="kyc" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              <FileText className="h-4 w-4 mr-2" />
              Verifications KYC
            </TabsTrigger>
            <TabsTrigger value="aml" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              <ShieldAlert className="h-4 w-4 mr-2" />
              Alertes AML
            </TabsTrigger>
          </TabsList>

          {/* KYC Tab */}
          <TabsContent value="kyc">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Demandes de Verification KYC</CardTitle>
                    <CardDescription className="text-slate-500">Validez les documents soumis par les clients</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-48 bg-slate-800/50 border-white/10 text-white text-xs"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="review">En revision</SelectItem>
                        <SelectItem value="approved">Approuve</SelectItem>
                        <SelectItem value="rejected">Rejete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">ID</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Client</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Type</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Document</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Date</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Risque</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Statut</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredKyc.map((kyc) => (
                        <TableRow key={kyc.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="text-xs font-mono text-slate-400">{kyc.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                                {kyc.type === "Entreprise" ? (
                                  <Building2 className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <User className="h-4 w-4 text-slate-400" />
                                )}
                              </div>
                              <span className="text-sm font-bold text-white">{kyc.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                              {kyc.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">{kyc.document}</TableCell>
                          <TableCell className="text-xs text-slate-400">{kyc.submitted}</TableCell>
                          <TableCell>{getRiskBadge(kyc.risk)}</TableCell>
                          <TableCell>{getStatusBadge(kyc.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {kyc.status === "pending" && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:text-emerald-400">
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AML Tab */}
          <TabsContent value="aml">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Alertes Anti-Blanchiment</CardTitle>
                    <CardDescription className="text-slate-500">Transactions signalees pour verification</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">ID</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Compte</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Type Alerte</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Montant</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Date</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Severite</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Statut</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {amlAlerts.map((alert) => (
                        <TableRow key={alert.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="text-xs font-mono text-slate-400">{alert.id}</TableCell>
                          <TableCell className="text-xs font-mono text-white">{alert.account}</TableCell>
                          <TableCell className="text-sm font-bold text-white">{alert.type}</TableCell>
                          <TableCell className="text-sm font-bold text-white">
                            ${alert.amount.toLocaleString()} {alert.currency}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">{alert.date}</TableCell>
                          <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                          <TableCell>{getStatusBadge(alert.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                <MoreHorizontal className="h-4 w-4" />
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
