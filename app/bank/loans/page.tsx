"use client";

import { getErrorMessage } from '@/lib/error-utils';
import { useState, useEffect, useCallback } from "react";
import { BankSidebar } from "@/components/bank/BankSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  HandCoins,
  Landmark,
  Menu,
  X,
  RefreshCw,
  Search,
  TrendingUp,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
  Percent,
  Banknote,
  FileText,
  Users,
  Building2,
  AlertTriangle,
  Check,
  Ban,
  Calculator,
  Receipt,
} from "lucide-react";

interface Loan {
  id: string;
  reference: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: "PERSONAL" | "BUSINESS" | "MORTGAGE" | "AUTO" | "EDUCATION";
  amount: number;
  interestRate: number;
  term: number; // in months
  monthlyPayment: number;
  totalPaid: number;
  remainingBalance: number;
  status: "PENDING" | "APPROVED" | "ACTIVE" | "COMPLETED" | "DEFAULTED" | "REJECTED";
  purpose: string;
  collateral?: string;
  guarantor?: string;
  createdAt: string;
  approvedAt?: string;
  nextPaymentDate?: string;
  missedPayments: number;
}

interface LoanStats {
  totalLoans: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalCollected: number;
  byStatus: Record<string, number>;
  byType: Record<string, { count: number; amount: number }>;
  defaultRate: number;
  avgInterestRate: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function LoansPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [loans, setLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(typeFilter !== "all" && { type: typeFilter }),
        ...(activeTab !== "all" && { tab: activeTab }),
      });

      const res = await fetch(`/api/bank/loans?${params}`, { credentials: "include" });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Erreur lors du chargement");

      setLoans(result.loans || []);
      setStats(result.statistics);
      setPagination(result.pagination);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? getErrorMessage(err) : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, typeFilter, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLoans();
    }, searchTerm ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchLoans, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, typeFilter, activeTab]);

  const handleLoanAction = async (loanId: string, action: "approve" | "reject" | "mark_default") => {
    try {
      const res = await fetch("/api/bank/loans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ loanId, action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur");
      await fetchLoans();
      setDialogOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? getErrorMessage(err) : "Erreur lors de l'action");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-bold gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Approuve</Badge>;
      case "ACTIVE":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold gap-1"><TrendingUp className="h-2.5 w-2.5" />Actif</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold gap-1"><Clock className="h-2.5 w-2.5" />En attente</Badge>;
      case "COMPLETED":
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] font-bold gap-1"><Check className="h-2.5 w-2.5" />Rembourse</Badge>;
      case "DEFAULTED":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold gap-1"><AlertTriangle className="h-2.5 w-2.5" />Defaut</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] font-bold gap-1"><XCircle className="h-2.5 w-2.5" />Rejete</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] font-bold">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      PERSONAL: { icon: <Users className="h-2.5 w-2.5" />, label: "Personnel", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
      BUSINESS: { icon: <Building2 className="h-2.5 w-2.5" />, label: "Entreprise", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
      MORTGAGE: { icon: <Landmark className="h-2.5 w-2.5" />, label: "Immobilier", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      AUTO: { icon: <Receipt className="h-2.5 w-2.5" />, label: "Automobile", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
      EDUCATION: { icon: <FileText className="h-2.5 w-2.5" />, label: "Education", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    };
    const config = typeConfig[type] || { icon: <HandCoins className="h-2.5 w-2.5" />, label: type, color: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
    return (
      <Badge className={`${config.color} text-[9px] font-bold gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateProgress = (loan: Loan) => {
    if (loan.amount === 0) return 0;
    return Math.min(100, (loan.totalPaid / loan.amount) * 100);
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
            <Landmark className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Prets et Credits</h1>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                <HandCoins className="h-3 w-3 mr-1" />
                {loading ? "..." : stats?.totalLoans ?? 0} prets
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Gestion des prets et credits bancaires</p>
          </div>
          <Button
            variant="outline"
            className="border-white/10 bg-slate-900/50 text-slate-400 hover:text-white text-xs font-bold"
            onClick={fetchLoans}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="bg-slate-900/50 border-white/5 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                  <Banknote className="h-4 w-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-slate-500 uppercase truncate">Total Decaisse</p>
                  {loading ? (
                    <Skeleton className="h-5 w-16 bg-slate-700 mt-0.5" />
                  ) : (
                    <p className="text-sm font-black text-blue-500 truncate">
                      {formatCurrency(stats?.totalDisbursed || 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                  <Calculator className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-slate-500 uppercase truncate">Encours</p>
                  {loading ? (
                    <Skeleton className="h-5 w-16 bg-slate-700 mt-0.5" />
                  ) : (
                    <p className="text-sm font-black text-amber-500 truncate">
                      {formatCurrency(stats?.totalOutstanding || 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-slate-500 uppercase truncate">Recouvre</p>
                  {loading ? (
                    <Skeleton className="h-5 w-16 bg-slate-700 mt-0.5" />
                  ) : (
                    <p className="text-sm font-black text-emerald-500 truncate">
                      {formatCurrency(stats?.totalCollected || 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-slate-500 uppercase truncate">Taux Defaut</p>
                  {loading ? (
                    <Skeleton className="h-5 w-10 bg-slate-700 mt-0.5" />
                  ) : (
                    <p className="text-sm font-black text-red-500">
                      {(stats?.defaultRate || 0).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loan Type Distribution */}
        {stats?.byType && Object.keys(stats.byType).length > 0 && (
          <Card className="bg-slate-900/50 border-white/5 rounded-2xl mb-6 overflow-hidden">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-bold text-white">Repartition par Type</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {Object.entries(stats.byType).map(([type, data]) => (
                  <div key={type} className="bg-slate-800/50 rounded-xl p-3 border border-white/5 min-w-[120px] shrink-0">
                    <div className="mb-2">
                      {getTypeBadge(type)}
                    </div>
                    <p className="text-xs font-bold text-white truncate">
                      {formatCurrency(data.amount)}
                    </p>
                    <p className="text-[9px] text-slate-500">{data.count} prets</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="bg-slate-900/50 border border-white/5 p-1 rounded-xl w-full flex overflow-x-auto">
            <TabsTrigger value="all" className="rounded-lg text-[10px] font-bold data-[state=active]:bg-white/10 flex-1 min-w-0 px-2">
              Tous
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg text-[10px] font-bold data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 flex-1 min-w-0 px-2">
              En attente ({stats?.byStatus?.PENDING || 0})
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg text-[10px] font-bold data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 flex-1 min-w-0 px-2">
              Actifs ({stats?.byStatus?.ACTIVE || 0})
            </TabsTrigger>
            <TabsTrigger value="defaulted" className="rounded-lg text-[10px] font-bold data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 flex-1 min-w-0 px-2">
              En defaut ({stats?.byStatus?.DEFAULTED || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loans Table */}
        <Card className="bg-slate-900/50 border-white/5 rounded-2xl">
          <CardHeader className="px-4 py-3">
            <div className="flex flex-col gap-3">
              <div>
                <CardTitle className="text-sm font-black text-white">Liste des Prets</CardTitle>
                <CardDescription className="text-slate-500 text-xs">
                  {pagination ? `${pagination.total} prets` : "Chargement..."}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full bg-slate-800/50 border-white/10 text-white text-xs h-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="flex-1 bg-slate-800/50 border-white/10 text-white text-xs font-bold h-9">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="all">Tous types</SelectItem>
                      <SelectItem value="PERSONAL">Personnel</SelectItem>
                      <SelectItem value="BUSINESS">Entreprise</SelectItem>
                      <SelectItem value="MORTGAGE">Immobilier</SelectItem>
                      <SelectItem value="AUTO">Automobile</SelectItem>
                      <SelectItem value="EDUCATION">Education</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="flex-1 bg-slate-800/50 border-white/10 text-white text-xs font-bold h-9">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="PENDING">En attente</SelectItem>
                      <SelectItem value="APPROVED">Approuve</SelectItem>
                      <SelectItem value="ACTIVE">Actif</SelectItem>
                      <SelectItem value="COMPLETED">Rembourse</SelectItem>
                      <SelectItem value="DEFAULTED">Defaut</SelectItem>
                      <SelectItem value="REJECTED">Rejete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="text-red-400 text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchLoans} className="border-white/10 text-xs">
                  Reessayer
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Emprunteur</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Type</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Montant</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Taux</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Duree</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Progression</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Statut</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i} className="border-white/5">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-9 w-9 rounded-full bg-slate-700" />
                              <div>
                                <Skeleton className="h-4 w-32 bg-slate-700 mb-1" />
                                <Skeleton className="h-3 w-24 bg-slate-700" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Skeleton className="h-5 w-20 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24 bg-slate-700 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-12 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-32 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-20 bg-slate-700 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : loans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <HandCoins className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">Aucun pret trouve</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      loans.map((loan) => (
                        <TableRow key={loan.id} className="border-white/5 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-slate-800 text-white text-xs font-bold">
                                  {getInitials(loan.userName || "?")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-white">{loan.userName}</p>
                                <p className="text-[10px] text-slate-500">{loan.reference}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(loan.type)}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm font-bold text-white">{formatCurrency(loan.amount)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Percent className="h-3 w-3 text-slate-500" />
                              <span className="text-xs font-bold text-slate-300">{loan.interestRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-500" />
                              <span className="text-xs text-slate-400">{loan.term} mois</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-32">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-slate-500">{calculateProgress(loan).toFixed(0)}%</span>
                                <span className="text-[10px] text-slate-400">{formatCurrency(loan.remainingBalance)}</span>
                              </div>
                              <Progress value={calculateProgress(loan)} className="h-1.5 bg-slate-700" />
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(loan.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Dialog open={dialogOpen && selectedLoan?.id === loan.id} onOpenChange={(open) => {
                                setDialogOpen(open);
                                if (open) setSelectedLoan(loan);
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" title="Details">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle className="text-white">Details du Pret</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                      Reference: {selectedLoan?.reference}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedLoan && (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl">
                                        <Avatar className="h-12 w-12">
                                          <AvatarFallback className="bg-slate-700 text-white text-sm font-bold">
                                            {getInitials(selectedLoan.userName)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                          <p className="text-white font-bold">{selectedLoan.userName}</p>
                                          <p className="text-slate-400 text-sm">{selectedLoan.userEmail}</p>
                                        </div>
                                        {getStatusBadge(selectedLoan.status)}
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-800/30 p-4 rounded-xl">
                                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Montant du Pret</p>
                                          <p className="text-lg font-black text-white">{formatCurrency(selectedLoan.amount)}</p>
                                        </div>
                                        <div className="bg-slate-800/30 p-4 rounded-xl">
                                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Reste a payer</p>
                                          <p className="text-lg font-black text-amber-500">{formatCurrency(selectedLoan.remainingBalance)}</p>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                          <p className="text-slate-500 text-xs">Taux d&apos;interet</p>
                                          <p className="text-white font-bold">{selectedLoan.interestRate}%</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 text-xs">Duree</p>
                                          <p className="text-white">{selectedLoan.term} mois</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 text-xs">Mensualite</p>
                                          <p className="text-white">{formatCurrency(selectedLoan.monthlyPayment)}</p>
                                        </div>
                                      </div>

                                      <div className="bg-slate-800/30 p-4 rounded-xl">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Objet du pret</p>
                                        <p className="text-sm text-slate-300">{selectedLoan.purpose}</p>
                                      </div>

                                      {selectedLoan.collateral && (
                                        <div className="bg-slate-800/30 p-4 rounded-xl">
                                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Garantie</p>
                                          <p className="text-sm text-slate-300">{selectedLoan.collateral}</p>
                                        </div>
                                      )}

                                      {selectedLoan.missedPayments > 0 && (
                                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                                          <div className="flex items-center gap-2 text-red-400">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span className="text-sm font-bold">{selectedLoan.missedPayments} paiement(s) manque(s)</span>
                                          </div>
                                        </div>
                                      )}

                                      <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Progression du remboursement</p>
                                        <Progress value={calculateProgress(selectedLoan)} className="h-2 bg-slate-700" />
                                        <div className="flex justify-between mt-1">
                                          <span className="text-[10px] text-slate-500">Paye: {formatCurrency(selectedLoan.totalPaid)}</span>
                                          <span className="text-[10px] text-slate-500">{calculateProgress(selectedLoan).toFixed(1)}%</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <DialogFooter className="flex gap-2">
                                    {selectedLoan?.status === "PENDING" && (
                                      <>
                                        <Button
                                          variant="outline"
                                          className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                                          onClick={() => handleLoanAction(selectedLoan.id, "approve")}
                                        >
                                          <CheckCircle2 className="h-4 w-4 mr-2" />
                                          Approuver
                                        </Button>
                                        <Button
                                          variant="outline"
                                          className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                          onClick={() => handleLoanAction(selectedLoan.id, "reject")}
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Rejeter
                                        </Button>
                                      </>
                                    )}
                                    {selectedLoan?.status === "ACTIVE" && selectedLoan.missedPayments >= 3 && (
                                      <Button
                                        variant="outline"
                                        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                        onClick={() => handleLoanAction(selectedLoan.id, "mark_default")}
                                      >
                                        <AlertTriangle className="h-4 w-4 mr-2" />
                                        Marquer en defaut
                                      </Button>
                                    )}
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              {loan.status === "PENDING" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-emerald-400 hover:text-emerald-300"
                                    title="Approuver"
                                    onClick={() => handleLoanAction(loan.id, "approve")}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-400 hover:text-red-300"
                                    title="Rejeter"
                                    onClick={() => handleLoanAction(loan.id, "reject")}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <p className="text-xs text-slate-500">
                  {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-white/10 bg-slate-800/50"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-slate-400 font-bold">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-white/10 bg-slate-800/50"
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
