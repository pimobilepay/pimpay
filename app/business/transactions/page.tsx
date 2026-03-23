"use client";

import { useState, useMemo } from "react";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Menu,
  X,
  Eye,
  Copy,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  ArrowRightLeft,
} from "lucide-react";

// Mock transactions data
const transactions = [
  { id: "TX001", reference: "TXN-2026-001234", recipient: "Fournisseur Alpha SARL", amount: 15000, type: "sortant", category: "Fournisseur", date: "2026-03-23", time: "14:30", status: "completed", description: "Paiement facture #FA-2026-089" },
  { id: "TX002", reference: "TXN-2026-001233", recipient: "Employes - Mars 2026", amount: 23300, type: "sortant", category: "Salaire", date: "2026-03-22", time: "10:00", status: "completed", description: "Paie mensuelle Mars 2026" },
  { id: "TX003", reference: "TXN-2026-001232", recipient: "Client Entreprise ABC", amount: 45000, type: "entrant", category: "Vente", date: "2026-03-21", time: "16:45", status: "completed", description: "Facture #CLI-2026-156" },
  { id: "TX004", reference: "TXN-2026-001231", recipient: "Location Bureaux SCI", amount: 5000, type: "sortant", category: "Loyer", date: "2026-03-20", time: "08:00", status: "completed", description: "Loyer bureaux Mars 2026" },
  { id: "TX005", reference: "TXN-2026-001230", recipient: "Client Entreprise XYZ", amount: 28000, type: "entrant", category: "Vente", date: "2026-03-19", time: "11:30", status: "completed", description: "Projet consultation" },
  { id: "TX006", reference: "TXN-2026-001229", recipient: "Prime Trimestrielle", amount: 8500, type: "sortant", category: "Salaire", date: "2026-03-18", time: "14:00", status: "pending", description: "Primes Q1 2026" },
  { id: "TX007", reference: "TXN-2026-001228", recipient: "Equipements IT Pro", amount: 7800, type: "sortant", category: "Fournisseur", date: "2026-03-17", time: "09:15", status: "failed", description: "Commande materiel informatique" },
  { id: "TX008", reference: "TXN-2026-001227", recipient: "Services Cloud AWS", amount: 1250, type: "sortant", category: "Operations", date: "2026-03-16", time: "00:00", status: "completed", description: "Abonnement mensuel" },
  { id: "TX009", reference: "TXN-2026-001226", recipient: "Client Startup Tech", amount: 18500, type: "entrant", category: "Vente", date: "2026-03-15", time: "15:20", status: "completed", description: "Developpement application" },
  { id: "TX010", reference: "TXN-2026-001225", recipient: "Assurance Entreprise", amount: 2800, type: "sortant", category: "Operations", date: "2026-03-14", time: "10:00", status: "completed", description: "Assurance RC Pro" },
  { id: "TX011", reference: "TXN-2026-001224", recipient: "Virement Interne", amount: 50000, type: "sortant", category: "Transfert", date: "2026-03-13", time: "09:00", status: "completed", description: "Vers compte reserve" },
  { id: "TX012", reference: "TXN-2026-001223", recipient: "Client Industries Co", amount: 62000, type: "entrant", category: "Vente", date: "2026-03-12", time: "17:45", status: "completed", description: "Contrat maintenance" },
];

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30d");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || tx.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || tx.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    });
  }, [searchQuery, typeFilter, categoryFilter, statusFilter]);

  const totalEntrant = transactions.filter(tx => tx.type === "entrant" && tx.status === "completed").reduce((sum, tx) => sum + tx.amount, 0);
  const totalSortant = transactions.filter(tx => tx.type === "sortant" && tx.status === "completed").reduce((sum, tx) => sum + tx.amount, 0);
  const pendingCount = transactions.filter(tx => tx.status === "pending").length;

  const categories = [...new Set(transactions.map(tx => tx.category))];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold"><CheckCircle2 className="h-3 w-3 mr-1" />Effectue</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-bold"><XCircle className="h-3 w-3 mr-1" />Echec</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[10px] font-bold">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: { [key: string]: string } = {
      "Salaire": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "Fournisseur": "bg-purple-500/10 text-purple-500 border-purple-500/20",
      "Vente": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      "Loyer": "bg-amber-500/10 text-amber-500 border-amber-500/20",
      "Operations": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      "Transfert": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    };
    return <Badge className={`${colors[category] || "bg-slate-500/10 text-slate-400 border-slate-500/20"} text-[10px] font-bold`}>{category}</Badge>;
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

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Transactions</h1>
            <p className="text-sm text-slate-500 mt-1">Historique complet de vos mouvements financiers</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
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
            <Button variant="outline" className="border-white/10 text-xs font-bold">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button variant="outline" size="icon" className="border-white/10 bg-slate-900/50">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Transactions</p>
                  <p className="text-3xl font-black text-white mt-1">{transactions.length}</p>
                  <p className="text-xs text-slate-500 mt-2">30 derniers jours</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-2xl">
                  <ArrowRightLeft className="h-6 w-6 text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-500/30 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-300/70 uppercase tracking-wider">Total Entrant</p>
                  <p className="text-3xl font-black text-white mt-1">${totalEntrant.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">4 transactions</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                  <ArrowDownLeft className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-500/20 to-red-600/20 border-rose-500/30 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-rose-300/70 uppercase tracking-wider">Total Sortant</p>
                  <p className="text-3xl font-black text-white mt-1">${totalSortant.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-rose-400">8 transactions</span>
                  </div>
                </div>
                <div className="p-3 bg-rose-500/20 rounded-2xl">
                  <ArrowUpRight className="h-6 w-6 text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">En Attente</p>
                  <p className="text-3xl font-black text-white mt-1">{pendingCount}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">A traiter</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-2xl">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black text-white">Historique des Transactions</CardTitle>
                <CardDescription className="text-slate-500">{filteredTransactions.length} transactions trouvees</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Rechercher par reference, destinataire..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-white/10 text-sm"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36 bg-slate-800/50 border-white/10 text-xs font-bold">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="entrant">Entrant</SelectItem>
                  <SelectItem value="sortant">Sortant</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36 bg-slate-800/50 border-white/10 text-xs font-bold">
                  <SelectValue placeholder="Categorie" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="all">Toutes categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-slate-800/50 border-white/10 text-xs font-bold">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="completed">Effectue</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="failed">Echec</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-white/5 overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-slate-500 text-xs font-bold">Reference</TableHead>
                    <TableHead className="text-slate-500 text-xs font-bold">Destinataire</TableHead>
                    <TableHead className="text-slate-500 text-xs font-bold">Categorie</TableHead>
                    <TableHead className="text-slate-500 text-xs font-bold">Montant</TableHead>
                    <TableHead className="text-slate-500 text-xs font-bold">Date</TableHead>
                    <TableHead className="text-slate-500 text-xs font-bold">Statut</TableHead>
                    <TableHead className="text-slate-500 text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${tx.type === "entrant" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                            {tx.type === "entrant" ? (
                              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white font-mono">{tx.reference}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-bold text-white">{tx.recipient}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{tx.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(tx.category)}</TableCell>
                      <TableCell>
                        <p className={`text-sm font-black ${tx.type === "entrant" ? "text-emerald-400" : "text-white"}`}>
                          {tx.type === "entrant" ? "+" : "-"}${tx.amount.toLocaleString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs font-bold text-white">{tx.date}</p>
                          <p className="text-[10px] text-slate-500">{tx.time}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-slate-500">Affichage de 1 a {filteredTransactions.length} sur {transactions.length} transactions</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="border-white/10 text-xs font-bold" disabled>
                  Precedent
                </Button>
                <Button variant="outline" size="sm" className="border-white/10 text-xs font-bold bg-emerald-500/10 text-emerald-500">
                  1
                </Button>
                <Button variant="outline" size="sm" className="border-white/10 text-xs font-bold" disabled>
                  Suivant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
