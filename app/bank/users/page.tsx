"use client";

import { useState, useEffect, useCallback } from "react";
import { BankSidebar } from "@/components/bank/BankSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ShieldAlert,
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
  MoreHorizontal,
  UserPlus,
  Download,
  Upload,
  Mail,
  Phone,
  Ban,
  Unlock,
  Wallet,
  CreditCard,
  History,
  Send,
  FileText,
  DollarSign,
  TrendingUp,
  Building2,
  UserCheck,
  Trash2,
  Edit,
  Key,
} from "lucide-react";
import { toast } from "sonner";

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
  updatedAt?: string;
  transactionCount: number;
  walletCount: number;
  lastLoginAt?: string;
  country?: string;
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
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUserDetailDialog, setShowUserDetailDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BankUser | null>(null);
  const [actionType, setActionType] = useState<string>("");

  // Form states
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "USER",
    password: "",
  });
  const [actionNote, setActionNote] = useState("");

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

  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, statusFilter, kycFilter]);

  const handleUserAction = async (userId: string, action: string, note?: string) => {
    try {
      const res = await fetch("/api/bank/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, action, note }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur");
      toast.success("Action effectuee avec succes");
      await fetchUsers();
      setShowActionDialog(false);
      setActionNote("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'action");
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast.error("Selectionnez au moins un utilisateur");
      return;
    }

    try {
      for (const userId of selectedUsers) {
        await handleUserAction(userId, action);
      }
      setSelectedUsers([]);
      toast.success(`Action appliquee a ${selectedUsers.length} utilisateurs`);
    } catch {
      toast.error("Erreur lors de l'action groupee");
    }
  };

  const handleCreateUser = async () => {
    try {
      const res = await fetch("/api/bank/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newUserForm),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur");
      toast.success("Utilisateur cree avec succes");
      setShowCreateDialog(false);
      setNewUserForm({ name: "", email: "", phone: "", role: "USER", password: "" });
      await fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la creation");
    }
  };

  const handleExportUsers = () => {
    // Generate CSV from users
    if (!data?.users) return;
    const headers = ["Nom", "Email", "Telephone", "Role", "Statut", "KYC", "Date inscription"];
    const rows = data.users.map(u => [
      u.name || u.username,
      u.email,
      u.phone || "",
      u.role,
      u.status,
      u.kycStatus,
      new Date(u.createdAt).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Export CSV telecharge");
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (data?.users) {
      if (selectedUsers.length === data.users.length) {
        setSelectedUsers([]);
      } else {
        setSelectedUsers(data.users.map(u => u.id));
      }
    }
  };

  const openActionDialog = (user: BankUser, type: string) => {
    setSelectedUser(user);
    setActionType(type);
    setShowActionDialog(true);
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
      case "FROZEN":
        return <Badge className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20 text-[9px] font-bold">Gele</Badge>;
      case "BANNED":
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] font-bold">Banni</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] font-bold">{status}</Badge>;
    }
  };

  const getKycBadge = (kycStatus: string) => {
    switch (kycStatus) {
      case "VERIFIED":
      case "APPROVED":
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
    } else if (role === "AGENT") {
      return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] font-bold">Agent</Badge>;
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

  const getActionTitle = () => {
    switch (actionType) {
      case "suspend": return "Suspendre l'utilisateur";
      case "activate": return "Activer l'utilisateur";
      case "freeze": return "Geler le compte";
      case "unfreeze": return "Degeler le compte";
      case "ban": return "Bannir l'utilisateur";
      case "verify_kyc": return "Verifier KYC";
      case "reject_kyc": return "Rejeter KYC";
      case "reset_password": return "Reinitialiser mot de passe";
      case "disable_2fa": return "Desactiver 2FA";
      default: return "Action";
    }
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
                {loading ? "..." : stats?.total ?? 0} utilisateurs
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Gerez les comptes, verifications KYC et permissions des utilisateurs</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-white/10 bg-slate-900/50 text-slate-400 hover:text-white text-xs font-bold"
              onClick={handleExportUsers}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              onClick={() => setShowCreateDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Nouvel Utilisateur
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-white/10 bg-slate-900/50"
              onClick={fetchUsers}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <Card className="bg-slate-900/50 border-white/5 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-500/10 rounded-lg">
                  <Users className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Total</p>
                  {loading ? <Skeleton className="h-5 w-8 bg-slate-700" /> : (
                    <p className="text-lg font-black text-white">{stats?.total ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                  <Activity className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Actifs</p>
                  {loading ? <Skeleton className="h-5 w-8 bg-emerald-900/50" /> : (
                    <p className="text-lg font-black text-emerald-500">{stats?.byStatus?.ACTIVE ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/20 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/20 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">En attente</p>
                  {loading ? <Skeleton className="h-5 w-8 bg-amber-900/50" /> : (
                    <p className="text-lg font-black text-amber-500">{stats?.byStatus?.PENDING ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500/10 border-red-500/20 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-500/20 rounded-lg">
                  <Lock className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Suspendus</p>
                  {loading ? <Skeleton className="h-5 w-8 bg-red-900/50" /> : (
                    <p className="text-lg font-black text-red-500">{stats?.byStatus?.SUSPENDED ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cyan-500/10 border-cyan-500/20 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                  <ShieldAlert className="h-4 w-4 text-cyan-500" />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Geles</p>
                  {loading ? <Skeleton className="h-5 w-8 bg-cyan-900/50" /> : (
                    <p className="text-lg font-black text-cyan-500">{stats?.byStatus?.FROZEN ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                  <Shield className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Admins</p>
                  {loading ? <Skeleton className="h-5 w-8 bg-blue-900/50" /> : (
                    <p className="text-lg font-black text-blue-500">
                      {(stats?.byRole?.ADMIN ?? 0) + (stats?.byRole?.BANK_ADMIN ?? 0)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">2FA</p>
                  {loading ? <Skeleton className="h-5 w-8 bg-emerald-900/50" /> : (
                    <p className="text-lg font-black text-emerald-500">{stats?.with2FA ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-500/20 rounded-lg">
                  <Building2 className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Business</p>
                  {loading ? <Skeleton className="h-5 w-8 bg-purple-900/50" /> : (
                    <p className="text-lg font-black text-purple-500">{stats?.byRole?.BUSINESS_ADMIN ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.length > 0 && (
          <Card className="bg-blue-500/10 border-blue-500/20 rounded-2xl mb-4">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-blue-400">
                  {selectedUsers.length} utilisateur(s) selectionne(s)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs"
                    onClick={() => handleBulkAction("activate")}
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Activer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                    onClick={() => handleBulkAction("suspend")}
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Suspendre
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs"
                    onClick={() => handleBulkAction("freeze")}
                  >
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    Geler
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-500/30 text-slate-400 hover:bg-slate-500/10 text-xs"
                    onClick={() => setSelectedUsers([])}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black text-white">Liste des Utilisateurs</CardTitle>
                <CardDescription className="text-slate-500">
                  {pagination ? `Page ${pagination.page} sur ${pagination.totalPages} - ${pagination.total} utilisateurs` : "Chargement..."}
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
                    <SelectItem value="AGENT">Agent</SelectItem>
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
                    <SelectItem value="FROZEN">Gele</SelectItem>
                    <SelectItem value="BANNED">Banni</SelectItem>
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
                      <TableHead className="w-8">
                        <Checkbox
                          checked={data?.users && selectedUsers.length === data.users.length && data.users.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="border-white/20"
                        />
                      </TableHead>
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
                          <TableCell><Skeleton className="h-4 w-4 bg-slate-700" /></TableCell>
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
                          <TableCell><Skeleton className="h-8 w-8 bg-slate-700 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : data?.users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">Aucun utilisateur trouve</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.users.map((user) => (
                        <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={() => toggleSelectUser(user.id)}
                              className="border-white/20"
                            />
                          </TableCell>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-slate-900 border-white/10" align="end">
                                <DropdownMenuLabel className="text-slate-400 text-xs">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  className="text-slate-300 text-xs cursor-pointer"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserDetailDialog(true);
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5 mr-2" />
                                  Voir details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-slate-300 text-xs cursor-pointer">
                                  <Wallet className="h-3.5 w-3.5 mr-2" />
                                  Voir portefeuilles
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-slate-300 text-xs cursor-pointer">
                                  <History className="h-3.5 w-3.5 mr-2" />
                                  Historique transactions
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuLabel className="text-slate-400 text-xs">Compte</DropdownMenuLabel>
                                {user.status === "ACTIVE" ? (
                                  <>
                                    <DropdownMenuItem
                                      className="text-amber-400 text-xs cursor-pointer"
                                      onClick={() => openActionDialog(user, "suspend")}
                                    >
                                      <Lock className="h-3.5 w-3.5 mr-2" />
                                      Suspendre
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-cyan-400 text-xs cursor-pointer"
                                      onClick={() => openActionDialog(user, "freeze")}
                                    >
                                      <ShieldAlert className="h-3.5 w-3.5 mr-2" />
                                      Geler le compte
                                    </DropdownMenuItem>
                                  </>
                                ) : user.status === "SUSPENDED" ? (
                                  <DropdownMenuItem
                                    className="text-emerald-400 text-xs cursor-pointer"
                                    onClick={() => openActionDialog(user, "activate")}
                                  >
                                    <Unlock className="h-3.5 w-3.5 mr-2" />
                                    Reactiver
                                  </DropdownMenuItem>
                                ) : user.status === "FROZEN" ? (
                                  <DropdownMenuItem
                                    className="text-emerald-400 text-xs cursor-pointer"
                                    onClick={() => openActionDialog(user, "unfreeze")}
                                  >
                                    <Unlock className="h-3.5 w-3.5 mr-2" />
                                    Degeler
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuLabel className="text-slate-400 text-xs">Securite</DropdownMenuLabel>
                                <DropdownMenuItem
                                  className="text-slate-300 text-xs cursor-pointer"
                                  onClick={() => openActionDialog(user, "reset_password")}
                                >
                                  <Key className="h-3.5 w-3.5 mr-2" />
                                  Reinitialiser mot de passe
                                </DropdownMenuItem>
                                {user.twoFactorEnabled && (
                                  <DropdownMenuItem
                                    className="text-amber-400 text-xs cursor-pointer"
                                    onClick={() => openActionDialog(user, "disable_2fa")}
                                  >
                                    <Shield className="h-3.5 w-3.5 mr-2" />
                                    Desactiver 2FA
                                  </DropdownMenuItem>
                                )}
                                {user.kycStatus === "PENDING" && (
                                  <>
                                    <DropdownMenuItem
                                      className="text-emerald-400 text-xs cursor-pointer"
                                      onClick={() => openActionDialog(user, "verify_kyc")}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                                      Valider KYC
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-400 text-xs cursor-pointer"
                                      onClick={() => openActionDialog(user, "reject_kyc")}
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-2" />
                                      Rejeter KYC
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  className="text-red-400 text-xs cursor-pointer"
                                  onClick={() => openActionDialog(user, "ban")}
                                >
                                  <Ban className="h-3.5 w-3.5 mr-2" />
                                  Bannir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-black">Creer un nouvel utilisateur</DialogTitle>
            <DialogDescription className="text-slate-500">
              Ajoutez un nouvel utilisateur au systeme bancaire
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-400 text-xs font-bold">Nom complet</Label>
              <Input
                id="name"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm(f => ({ ...f, name: e.target.value }))}
                className="bg-slate-800/50 border-white/10 text-white"
                placeholder="Jean Dupont"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-400 text-xs font-bold">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm(f => ({ ...f, email: e.target.value }))}
                className="bg-slate-800/50 border-white/10 text-white"
                placeholder="jean@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-400 text-xs font-bold">Telephone</Label>
              <Input
                id="phone"
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm(f => ({ ...f, phone: e.target.value }))}
                className="bg-slate-800/50 border-white/10 text-white"
                placeholder="+243 XXX XXX XXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-400 text-xs font-bold">Role</Label>
              <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="USER">Utilisateur</SelectItem>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="BUSINESS_ADMIN">Business Admin</SelectItem>
                  <SelectItem value="BANK_ADMIN">Bank Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-400 text-xs font-bold">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm(f => ({ ...f, password: e.target.value }))}
                className="bg-slate-800/50 border-white/10 text-white"
                placeholder="Min. 8 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-white/10 text-slate-400">
              Annuler
            </Button>
            <Button onClick={handleCreateUser} className="bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={showUserDetailDialog} onOpenChange={setShowUserDetailDialog}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white font-black">Details de l&apos;utilisateur</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-slate-800 text-white text-lg font-bold">
                    {getInitials(selectedUser.name || selectedUser.username || "?")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedUser.name || selectedUser.username}</h3>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  {selectedUser.phone && <p className="text-xs text-slate-600">{selectedUser.phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-800/50 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Role</p>
                  <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Statut</p>
                  <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">KYC</p>
                  <div className="mt-1">{getKycBadge(selectedUser.kycStatus)}</div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">2FA</p>
                  <div className="mt-1">
                    {selectedUser.twoFactorEnabled ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Active</Badge>
                    ) : (
                      <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] font-bold">Inactive</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-800/50 rounded-xl text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Transactions</p>
                  <p className="text-xl font-black text-white mt-1">{selectedUser.transactionCount}</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Portefeuilles</p>
                  <p className="text-xl font-black text-white mt-1">{selectedUser.walletCount}</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Inscription</p>
                  <p className="text-xs font-bold text-white mt-2">
                    {new Date(selectedUser.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDetailDialog(false)} className="border-white/10 text-slate-400">
              Fermer
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-black">{getActionTitle()}</DialogTitle>
            <DialogDescription className="text-slate-500">
              {selectedUser && `Cette action affectera le compte de ${selectedUser.name || selectedUser.username}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note" className="text-slate-400 text-xs font-bold">Note (optionnel)</Label>
              <Textarea
                id="note"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="bg-slate-800/50 border-white/10 text-white min-h-[80px]"
                placeholder="Raison de cette action..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)} className="border-white/10 text-slate-400">
              Annuler
            </Button>
            <Button
              onClick={() => selectedUser && handleUserAction(selectedUser.id, actionType, actionNote)}
              className={
                actionType === "ban" || actionType === "reject_kyc"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : actionType === "suspend" || actionType === "freeze"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
