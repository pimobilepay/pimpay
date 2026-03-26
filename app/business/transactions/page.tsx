"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Calendar,
  RefreshCw,
  Download,
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
  AlertCircle,
} from "lucide-react";

// Types for API response
interface Transaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string | null;
  category: string;
  createdAt: string;
  isIncoming: boolean;
  counterparty: string;
}

interface TransactionsData {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalTransactions: number;
    totalIncoming: number;
    totalOutgoing: number;
    netFlow: number;
    pendingCount: number;
  };
}

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30d");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Real data state
  const [data, setData] = useState<TransactionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions data
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        dateRange,
        ...(typeFilter !== "all" && { type: typeFilter }),
        ...(statusFilter !== "all" && { status: statusFilter === "completed" ? "SUCCESS" : statusFilter === "pending" ? "PENDING" : "FAILED" }),
        ...(searchQuery && { search: searchQuery }),
      });
      
      const response = await fetch(`/api/business/transactions?${params}`, {
        headers: {
          "Content-Type": "application/json",
        },
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
  }, [currentPage, dateRange, typeFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Get transactions from data
  const transactions = data?.transactions || [];
  const stats = data?.stats || { totalTransactions: 0, totalIncoming: 0, totalOutgoing: 0, pendingCount: 0 };
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  // Filter transactions client-side for category (API doesn't support category filter)
  const filteredTransactions = useMemo(() => {
    if (categoryFilter === "all") return transactions;
    return transactions.filter(tx => tx.category === categoryFilter);
  }, [transactions, categoryFilter]);

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(transactions.map(tx => tx.category))];
  }, [transactions]);

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case "SUCCESS":
      case "COMPLETED":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold"><CheckCircle2 className="h-3 w-3 mr-1" />Effectue</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case "FAILED":
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
      "TRANSFER": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      "DEPOSIT": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      "WITHDRAWAL": "bg-rose-500/10 text-rose-500 border-rose-500/20",
      "PAYMENT": "bg-blue-500/10 text-blue-500 border-blue-500/20",
    };
    return <Badge className={`${colors[category] || "bg-slate-500/10 text-slate-400 border-slate-500/20"} text-[10px] font-bold`}>{category}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
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
            <Select value={dateRange} onValueChange={(value) => { setDateRange(value); setCurrentPage(1); }}>
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
            <Button 
              variant="outline" 
              size="icon" 
              className="border-white/10 bg-slate-900/50"
              onClick={fetchTransactions}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30 rounded-3xl mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-2xl">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-400">Erreur de chargement</p>
                  <p className="text-xs text-red-300/70 mt-1">{error}</p>
                </div>
                <Button onClick={fetchTransactions} className="bg-red-500 hover:bg-red-600 text-xs font-bold">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Transactions</p>
                  {loading ? (
                    <Skeleton className="h-9 w-16 mt-1 bg-slate-700" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">{stats.totalTransactions}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">{dateRange === "7d" ? "7 derniers jours" : dateRange === "30d" ? "30 derniers jours" : dateRange === "90d" ? "90 derniers jours" : "Cette annee"}</p>
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
                  {loading ? (
                    <Skeleton className="h-9 w-24 mt-1 bg-emerald-500/20" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">${stats.totalIncoming.toLocaleString()}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">Revenus</span>
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
                  {loading ? (
                    <Skeleton className="h-9 w-24 mt-1 bg-rose-500/20" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">${stats.totalOutgoing.toLocaleString()}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-rose-400">Depenses</span>
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
                  {loading ? (
                    <Skeleton className="h-9 w-12 mt-1 bg-slate-700" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">{stats.pendingCount}</p>
                  )}
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
                <CardDescription className="text-slate-500">
                  {loading ? "Chargement..." : `${filteredTransactions.length} transactions trouvees`}
                </CardDescription>
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
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-10 bg-slate-800/50 border-white/10 text-sm"
                />
              </div>
              <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setCurrentPage(1); }}>
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
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
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
                  {loading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-8 h-8 rounded-lg bg-slate-700" />
                            <Skeleton className="h-4 w-24 bg-slate-700" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-32 bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 bg-slate-700 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 bg-slate-700 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24 bg-slate-700 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-slate-800/50 rounded-2xl">
                            <ArrowRightLeft className="h-8 w-8 text-slate-500" />
                          </div>
                          <p className="text-sm font-bold text-slate-400">Aucune transaction trouvee</p>
                          <p className="text-xs text-slate-500">Les transactions apparaitront ici</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const { date, time } = formatDate(tx.createdAt);
                      const isIncoming = tx.isIncoming;
                      return (
                        <TableRow key={tx.id} className="border-white/5 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${isIncoming ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                                {isIncoming ? (
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
                              <p className="text-sm font-bold text-white">{tx.counterparty}</p>
                              <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{tx.description || "-"}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getCategoryBadge(tx.category)}</TableCell>
                          <TableCell>
                            <p className={`text-sm font-black ${isIncoming ? "text-emerald-400" : "text-white"}`}>
                              {isIncoming ? "+" : "-"}${tx.amount.toLocaleString()}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-xs font-bold text-white">{date}</p>
                              <p className="text-[10px] text-slate-500">{time}</p>
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-slate-500">
                {loading ? "Chargement..." : `Affichage de ${((pagination.page - 1) * pagination.limit) + 1} a ${Math.min(pagination.page * pagination.limit, pagination.total)} sur ${pagination.total} transactions`}
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-white/10 text-xs font-bold" 
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  Precedent
                </Button>
                <Button variant="outline" size="sm" className="border-white/10 text-xs font-bold bg-emerald-500/10 text-emerald-500">
                  {currentPage}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-white/10 text-xs font-bold" 
                  disabled={currentPage >= pagination.totalPages || loading}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
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
