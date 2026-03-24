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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Landmark,
  Menu,
  X,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  UserCog,
  Eye,
  Activity,
  Lock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

// Types based on Prisma schema
interface BankUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  kycStatus: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  transactionCount: number;
  walletCount: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Statistics {
  byStatus: Record<string, number>;
  byRole: Record<string, number>;
  with2FA: number;
  total: number;
}

interface ApiResponse {
  users: BankUser[];
  pagination: Pagination;
  statistics: Statistics;
}

export default function UsersPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== "all" && { role: roleFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(kycFilter !== "all" && { kycStatus: kycFilter }),
      });

      const res = await fetch(`/api/bank/users?${params}`, { credentials: "include" });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Erreur lors du chargement");

      setData(result);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, roleFilter, statusFilter, kycFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, searchTerm ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, statusFilter, kycFilter]);

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const res = await fetch("/api/bank/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur");
      await fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'action");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Actif</Badge>;
      case "INACTIVE":
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] font-bold">Inactif</Badge>;
      case "SUSPENDED":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Suspendu</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">En attente</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] font-bold">{status}</Badge>;
    }
  };

  const getKycBadge = (kycStatus: string) => {
    switch (kycStatus) {
      case "VERIFIED":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Verifie</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold gap-1"><Clock className="h-2.5 w-2.5" />En attente</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold gap-1"><XCircle className="h-2.5 w-2.5" />Rejete</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] font-bold">{kycStatus}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "ADMIN") {
      return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] font-bold">Admin Principal</Badge>;
    } else if (role === "BANK_ADMIN") {
      return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] font-bold">Bank Admin</Badge>;
    } else if (role === "BUSINESS_ADMIN") {
      return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px] font-bold">Business Admin</Badge>;
    } else {
      return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] font-bold">Utilisateur</Badge>;
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

  const stats = data?.statistics;
  const pagination = data?.pagination;

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
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Gestion des Utilisateurs</h1>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                <Users className="h-3 w-3 mr-1" />
                {loading ? "..." : stats?.total ?? 0} users
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Tous les utilisateurs enregistres sur la plateforme</p>
          </div>
          <Button
            variant="outline"
            className="border-white/10 bg-slate-900/50 text-slate-400 hover:text-white text-xs font-bold"
            onClick={fetchUsers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-500/10 rounded-xl">
                  <Users className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Total</p>
                  {loading ? <Skeleton className="h-7 w-10 bg-slate-700 mt-0.5" /> : (
                    <p className="text-xl font-black text-white">{stats?.total ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <Activity className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Actifs</p>
                  {loading ? <Skeleton className="h-7 w-10 bg-emerald-900/50 mt-0.5" /> : (
                    <p className="text-xl font-black text-emerald-500">{stats?.byStatus?.ACTIVE ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/20 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">En attente</p>
                  {loading ? <Skeleton className="h-7 w-10 bg-amber-900/50 mt-0.5" /> : (
                    <p className="text-xl font-black text-amber-500">{stats?.byStatus?.PENDING ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500/10 border-red-500/20 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-xl">
                  <Lock className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Suspendus</p>
                  {loading ? <Skeleton className="h-7 w-10 bg-red-900/50 mt-0.5" /> : (
                    <p className="text-xl font-black text-red-500">{stats?.byStatus?.SUSPENDED ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Admins</p>
                  {loading ? <Skeleton className="h-7 w-10 bg-blue-900/50 mt-0.5" /> : (
                    <p className="text-xl font-black text-blue-500">
                      {(stats?.byRole?.ADMIN ?? 0) + (stats?.byRole?.BANK_ADMIN ?? 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">2FA Actif</p>
                  {loading ? <Skeleton className="h-7 w-10 bg-emerald-900/50 mt-0.5" /> : (
                    <p className="text-xl font-black text-emerald-500">{stats?.with2FA ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black text-white">Liste des Utilisateurs</CardTitle>
                <CardDescription className="text-slate-500">
                  {pagination ? `Page ${pagination.page} sur ${pagination.totalPages} — ${pagination.total} utilisateurs` : "Chargement..."}
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
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-36 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="all">Tous les roles</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="BANK_ADMIN">Bank Admin</SelectItem>
                    <SelectItem value="BUSINESS_ADMIN">Business Admin</SelectItem>
                    <SelectItem value="USER">Utilisateur</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="ACTIVE">Actif</SelectItem>
                    <SelectItem value="PENDING">En attente</SelectItem>
                    <SelectItem value="SUSPENDED">Suspendu</SelectItem>
                    <SelectItem value="INACTIVE">Inactif</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={kycFilter} onValueChange={setKycFilter}>
                  <SelectTrigger className="w-28 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                    <SelectValue placeholder="KYC" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="all">KYC Tous</SelectItem>
                    <SelectItem value="VERIFIED">Verifie</SelectItem>
                    <SelectItem value="PENDING">En attente</SelectItem>
                    <SelectItem value="REJECTED">Rejete</SelectItem>
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
                <Button variant="outline" size="sm" onClick={fetchUsers} className="border-white/10 text-xs">
                  Reessayer
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Utilisateur</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Role</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">KYC</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">2FA</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Transactions</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Inscription</TableHead>
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
                                <Skeleton className="h-3 w-44 bg-slate-700" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Skeleton className="h-5 w-24 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-8 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-10 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-14 bg-slate-700" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-24 bg-slate-700 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : data?.users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">Aucun utilisateur trouve</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.users.map((user) => (
                        <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-slate-800 text-white text-xs font-bold">
                                  {getInitials(user.name || user.username || "?")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-white">{user.name || user.username}</p>
                                <p className="text-[10px] text-slate-500">{user.email}</p>
                                {user.phone && (
                                  <p className="text-[10px] text-slate-600">{user.phone}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{getKycBadge(user.kycStatus)}</TableCell>
                          <TableCell>
                            {user.twoFactorEnabled ? (
                              <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Shield className="h-4 w-4 text-slate-600" />
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-slate-400 font-bold">{user.transactionCount}</p>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" title="Voir">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" title="Modifier role">
                                <UserCog className="h-4 w-4" />
                              </Button>
                              {user.status === "ACTIVE" ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-red-400"
                                  title="Suspendre"
                                  onClick={() => handleUserAction(user.id, "suspend")}
                                >
                                  <Lock className="h-4 w-4" />
                                </Button>
                              ) : user.status === "SUSPENDED" ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-emerald-400"
                                  title="Activer"
                                  onClick={() => handleUserAction(user.id, "activate")}
                                >
                                  <Activity className="h-4 w-4" />
                                </Button>
                              ) : null}
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
                  {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total}
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
