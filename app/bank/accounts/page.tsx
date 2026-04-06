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

  // ✅ CORRECTION: Sécurisation du formatage pour éviter les crashs Intl
  const formatCurrency = (amount: number = 0, currency: string = "USD") => {
    try {
      const displayCurrency = (currency === "XAF" || currency === "PI" || currency === "SDA") ? "USD" : currency;
      const formatted = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: displayCurrency,
        minimumFractionDigits: 2,
      }).format(amount || 0);
      
      return formatted.replace("US$", currency).replace("USD", currency);
    } catch (e) {
      return `${(amount || 0).toFixed(2)} ${currency}`;
    }
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
      case "FIAT": return <DollarSign className="h-4 w-4" />;
      case "PI": return <CircleDollarSign className="h-4 w-4" />;
      case "CRYPTO": return <CreditCard className="h-4 w-4" />;
      case "SIDRA": return <PiggyBank className="h-4 w-4" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  const getInitials = (name: string = "") => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      <div className="hidden lg:block">
        <BankSidebar />
      </div>

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

      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl bg-white/5 text-slate-400">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
            <Landmark className="h-5 w-5 text-white" />
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="bg-slate-900/50 border-white/5 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-slate-500 uppercase truncate">Solde Total</p>
                  {loading ? (
                    <Skeleton className="h-5 w-20 bg-slate-700 mt-0.5" />
                  ) : (
                    <p className="text-sm font-black text-emerald-500 truncate">
                      {formatCurrency(stats?.totalBalance || 0, "$US")}
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
                  <Snowflake className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-slate-500 uppercase truncate">Fonds Geles</p>
                  {loading ? (
                    <Skeleton className="h-5 w-20 bg-slate-700 mt-0.5" />
                  ) : (
                    <p className="text-sm font-black text-amber-500 truncate">
                      {formatCurrency(stats?.totalFrozen || 0, "$US")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {stats?.byCurrency && Object.keys(stats.byCurrency).length > 0 && (
          <Card className="bg-slate-900/50 border-white/5 rounded-2xl mb-6 overflow-hidden">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-bold text-white">Repartition par Devise</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {Object.entries(stats.byCurrency).map(([currency, data]) => (
                  <div key={currency} className="bg-slate-800/50 rounded-xl p-3 border border-white/5 min-w-[110px] shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 text-[9px] font-bold px-1.5">{currency}</Badge>
                      <span className="text-[9px] text-slate-500">{data.count}</span>
                    </div>
                    <p className="text-xs font-bold text-white mb-1.5 truncate">{formatCurrency(data.balance, currency)}</p>
                    <Progress value={(data.balance / (stats?.totalBalance || 1)) * 100} className="h-1 bg-slate-700" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                  <Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-48 bg-slate-800/50 border-white/10 text-white text-xs" />
                </div>
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="w-28 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                    <SelectValue placeholder="Devise" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
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
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="FIAT">Fiduciaire</SelectItem>
                    <SelectItem value="PI">Pi Network</SelectItem>
                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                    <SelectItem value="SIDRA">Sidra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="text-red-400 text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchAccounts} className="border-white/10 text-xs">Reessayer</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent uppercase">
                      <TableHead className="text-[10px] font-bold text-slate-500">Titulaire</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500">Type</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500">Devise</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 text-right">Solde</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 text-right">Gele</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500">Activite</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-white/5 hover:bg-transparent">
                          <TableCell colSpan={7}><Skeleton className="h-12 w-full bg-slate-800/50" /></TableCell>
                        </TableRow>
                      ))
                    ) : accounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-500 text-xs font-bold uppercase">Aucun compte trouve</TableCell>
                      </TableRow>
                    ) : (
                      accounts.map((account) => (
                        <TableRow key={account.id} className="border-white/5 hover:bg-white/[0.02]">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-white/5">
                                <AvatarFallback className="bg-slate-800 text-white text-[10px] font-black">{getInitials(account.userName)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-xs font-bold text-white">{account.userName}</p>
                                <p className="text-[10px] text-slate-500">{account.userEmail}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-slate-800 rounded-lg text-slate-400">{getTypeIcon(account.type)}</div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{getTypeLabel(account.type)}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge className="bg-slate-800/50 text-slate-300 border-slate-700 text-[10px] font-bold">{account.currency}</Badge></TableCell>
                          <TableCell className="text-right text-xs font-black text-white">{formatCurrency(account.balance, account.currency)}</TableCell>
                          <TableCell className="text-right text-xs font-black text-amber-500">{formatCurrency(account.frozenBalance, account.currency)}</TableCell>
                          <TableCell className="text-[10px] font-bold text-slate-500 uppercase">{new Date(account.lastActivity || account.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => { setSelectedAccount(account); setDialogOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button variant="outline" size="icon" className="h-8 w-8 border-white/10" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs text-white font-bold">{page} / {pagination.totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 border-white/10" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">Gestion du Compte</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">Actions disponibles pour {selectedAccount?.userName}</DialogDescription>
          </DialogHeader>
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 my-4">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Solde Actuel</p>
            <p className="text-2xl font-black text-white">{formatCurrency(selectedAccount?.balance || 0, selectedAccount?.currency || "USD")}</p>
          </div>
          <DialogFooter>
            <Button 
              className={`w-full font-bold rounded-xl ${selectedAccount?.frozenBalance === 0 ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              onClick={() => selectedAccount && handleAccountAction(selectedAccount.id, selectedAccount.frozenBalance === 0 ? "freeze" : "unfreeze")}
              disabled={actionLoading}
            >
              {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : selectedAccount?.frozenBalance === 0 ? <Ban className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
              {selectedAccount?.frozenBalance === 0 ? "Geler le compte" : "Degeler le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

