"use client";

import { useState, useEffect, useCallback } from "react";
import { BankSidebar } from "@/components/bank/BankSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Wallet,
  Landmark,
  Menu,
  X,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Eye,
  Ban,
  Unlock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  PiggyBank,
  CreditCard,
  CircleDollarSign,
  Snowflake,
  History,
} from "lucide-react";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  currency: string;
  type: string;
  balance: number;
  frozenBalance: number;
  createdAt: string;
  lastActivity: string;
  transactionCount: number;
}

interface AccountStats {
  totalAccounts: number;
  totalBalance: number;
  totalFrozen: number;
  byCurrency: Record<string, { count: number; balance: number }>;
  byType: Record<string, number>;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AccountsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("balance");
  const [page, setPage] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        sortBy,
        ...(searchTerm && { search: searchTerm }),
        ...(currencyFilter !== "all" && { currency: currencyFilter }),
        ...(typeFilter !== "all" && { type: typeFilter }),
      });

      const res = await fetch(`/api/bank/accounts?${params}`, { credentials: "include" });
      
      if (!res.ok) {
        const result = await res.json().catch(() => ({ error: "Erreur serveur" }));
        throw new Error(result.error || "Erreur lors du chargement");
      }
      
      const result = await res.json();

      setAccounts(result.accounts || []);
      setStats(result.statistics || null);
      setPagination(result.pagination || null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      setAccounts([]);
      
      // Log error to admin logs API
      try {
        await fetch("/api/admin/system-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            level: "ERROR",
            source: "BANK_ACCOUNTS_PAGE",
            action: "FETCH_ACCOUNTS",
            message: errorMessage,
            details: { page, searchTerm, currencyFilter, typeFilter, sortBy },
          }),
        });
      } catch {
        // Silent fail for logging
      }
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, currencyFilter, typeFilter, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAccounts();
    }, searchTerm ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchAccounts, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, currencyFilter, typeFilter, sortBy]);

  const handleAccountAction = async (accountId: string, action: "freeze" | "unfreeze") => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/bank/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accountId, action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur");
      toast.success(action === "freeze" ? "Compte gele avec succes" : "Compte degele avec succes");
      await fetchAccounts();
      setDialogOpen(false);
      setSelectedAccount(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'action";
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency === "XAF" ? "XAF" : currency === "PI" ? "USD" : currency,
      minimumFractionDigits: 2,
    }).format(amount).replace("USD", currency);
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      FIAT: "Monnaie Fiduciaire",
      PI: "Pi Network",
      CRYPTO: "Crypto",
      SIDRA: "Sidra Chain",
    };
    return types[type] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "FIAT":
        return <DollarSign className="h-4 w-4" />;
      case "PI":
        return <CircleDollarSign className="h-4 w-4" />;
      case "CRYPTO":
        return <CreditCard className="h-4 w-4" />;
      case "SIDRA":
        return <PiggyBank className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Comptes Bancaires</h1>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                <Wallet className="h-3 w-3 mr-1" />
                {loading ? "..." : stats?.totalAccounts ?? 0} comptes
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Gestion des soldes et comptes utilisateurs</p>
          </div>
          <Button
            variant="outline"
            className="border-white/10 bg-slate-900/50 text-slate-400 hover:text-white text-xs font-bold"
            onClick={fetchAccounts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Solde Total</p>
                  {loading ? (
                    <Skeleton className="h-6 w-24 bg-slate-700 mt-1" />
                  ) : (
                    <p className="text-lg font-black text-emerald-500">
                      {formatCurrency(stats?.totalBalance || 0, "XAF")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <Wallet className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Comptes Actifs</p>
                  {loading ? (
                    <Skeleton className="h-6 w-16 bg-slate-700 mt-1" />
                  ) : (
                    <p className="text-lg font-black text-blue-500">{stats?.totalAccounts || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-xl">
                  <Snowflake className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Fonds Geles</p>
                  {loading ? (
                    <Skeleton className="h-6 w-20 bg-slate-700 mt-1" />
                  ) : (
                    <p className="text-lg font-black text-amber-500">
                      {formatCurrency(stats?.totalFrozen || 0, "XAF")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-500/10 rounded-xl">
                  <PiggyBank className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Devises</p>
                  {loading ? (
                    <Skeleton className="h-6 w-12 bg-slate-700 mt-1" />
                  ) : (
                    <p className="text-lg font-black text-slate-300">
                      {Object.keys(stats?.byCurrency || {}).length}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Currency Distribution */}
        {stats?.byCurrency && Object.keys(stats.byCurrency).length > 0 && (
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-white">Repartition par Devise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.byCurrency).map(([currency, data]) => (
                  <div key={currency} className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 text-[10px] font-bold">
                        {currency}
                      </Badge>
                      <span className="text-[10px] text-slate-500">{data.count} comptes</span>
                    </div>
                    <p className="text-sm font-bold text-white mb-2">
                      {formatCurrency(data.balance, currency)}
                    </p>
                    <Progress 
                      value={(data.balance / (stats.totalBalance || 1)) * 100} 
                      className="h-1.5 bg-slate-700"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accounts Table */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black text-white">Liste des Comptes</CardTitle>
                <CardDescription className="text-slate-500">
                  {pagination ? `Page ${pagination.page} sur ${pagination.totalPages} - ${pagination.total} comptes` : "Chargement..."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-48 bg-slate-800/50 border-white/10 text-white text-xs"
                  />
                </div>
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="w-28 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                    <SelectValue placeholder="Devise" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="XAF">XAF</SelectItem>
                    <SelectItem value="PI">PI</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="FIAT">Fiduciaire</SelectItem>
                    <SelectItem value="PI">Pi Network</SelectItem>
                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                    <SelectItem value="SIDRA">Sidra</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-28 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                    <SelectValue placeholder="Trier" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="balance">Solde</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="activity">Activite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="text-red-400 text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchAccounts} className="border-white/10 text-xs">
                  Reessayer
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Titulaire</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Type</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Devise</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Solde</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Gele</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Transactions</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Derniere activite</TableHead>
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
                                <Skeleton className="h-3 w-44 bg-slate-700" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Skeleton className="h-5 w-20 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-12 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24 bg-slate-700 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16 bg-slate-700 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-10 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-20 bg-slate-700 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : accounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <Wallet className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">Aucun compte trouve</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      accounts.map((account) => (
                        <TableRow key={account.id} className="border-white/5 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-slate-800 text-white text-xs font-bold">
                                  {getInitials(account.userName || "?")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-white">{account.userName}</p>
                                <p className="text-[10px] text-slate-500">{account.userEmail}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-slate-800/50">
                                {getTypeIcon(account.type)}
                              </div>
                              <span className="text-xs text-slate-400">{getTypeLabel(account.type)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 text-[10px] font-bold">
                              {account.currency}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm font-bold text-emerald-500">
                              {formatCurrency(account.balance, account.currency)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {account.frozenBalance > 0 ? (
                              <span className="text-xs font-bold text-amber-500">
                                {formatCurrency(account.frozenBalance, account.currency)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <History className="h-3.5 w-3.5 text-slate-500" />
                              <span className="text-xs font-bold text-slate-400">{account.transactionCount}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {new Date(account.lastActivity).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Dialog open={dialogOpen && selectedAccount?.id === account.id} onOpenChange={(open) => {
                                setDialogOpen(open);
                                if (open) setSelectedAccount(account);
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" title="Details">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-slate-900 border-white/10 max-w-md">
                                  <DialogHeader>
                                    <DialogTitle className="text-white">Details du Compte</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                      Informations completes du compte
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedAccount && (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl">
                                        <Avatar className="h-12 w-12">
                                          <AvatarFallback className="bg-slate-700 text-white text-sm font-bold">
                                            {getInitials(selectedAccount.userName)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="text-white font-bold">{selectedAccount.userName}</p>
                                          <p className="text-slate-400 text-sm">{selectedAccount.userEmail}</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-800/30 p-4 rounded-xl">
                                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Solde Disponible</p>
                                          <p className="text-lg font-black text-emerald-500">
                                            {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                                          </p>
                                        </div>
                                        <div className="bg-slate-800/30 p-4 rounded-xl">
                                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Solde Gele</p>
                                          <p className="text-lg font-black text-amber-500">
                                            {formatCurrency(selectedAccount.frozenBalance, selectedAccount.currency)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="text-slate-500 text-xs">Type de compte</p>
                                          <p className="text-white">{getTypeLabel(selectedAccount.type)}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 text-xs">Devise</p>
                                          <p className="text-white">{selectedAccount.currency}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 text-xs">Transactions</p>
                                          <p className="text-white">{selectedAccount.transactionCount}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 text-xs">Cree le</p>
                                          <p className="text-white">
                                            {new Date(selectedAccount.createdAt).toLocaleDateString("fr-FR")}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <DialogFooter className="flex gap-2">
                                    {selectedAccount && selectedAccount.frozenBalance > 0 ? (
                                      <Button
                                        variant="outline"
                                        className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                                        onClick={() => selectedAccount && handleAccountAction(selectedAccount.id, "unfreeze")}
                                      >
                                        <Unlock className="h-4 w-4 mr-2" />
                                        Degeler les fonds
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                                        onClick={() => selectedAccount && handleAccountAction(selectedAccount.id, "freeze")}
                                      >
                                        <Snowflake className="h-4 w-4 mr-2" />
                                        Geler le compte
                                      </Button>
                                    )}
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              {account.frozenBalance > 0 ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-400 hover:text-emerald-300"
                                  title="Degeler"
                                  onClick={() => handleAccountAction(account.id, "unfreeze")}
                                >
                                  <Unlock className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-amber-400"
                                  title="Geler"
                                  onClick={() => handleAccountAction(account.id, "freeze")}
                                >
                                  <Snowflake className="h-4 w-4" />
                                </Button>
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
