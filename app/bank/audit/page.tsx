"use client";

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
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ClipboardList,
  Landmark,
  Menu,
  X,
  RefreshCw,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Shield,
  UserCog,
  CreditCard,
  ArrowLeftRight,
  LogIn,
  LogOut,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Bug,
  Zap,
  Clock,
  Calendar,
  Download,
  Filter,
  Activity,
  FileText,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  Wallet,
  Globe,
  Server,
} from "lucide-react";

interface AuditLog {
  id: string;
  adminId: string | null;
  adminName: string | null;
  action: string;
  targetId: string | null;
  targetEmail: string | null;
  details: string | null;
  createdAt: string;
  ip?: string;
  userAgent?: string;
}

interface SystemLog {
  id: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
  source: string;
  action: string;
  message: string;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  userId: string | null;
  requestId: string | null;
  duration: number | null;
  createdAt: string;
}

interface AuditStats {
  totalAuditLogs: number;
  totalSystemLogs: number;
  byAction: Record<string, number>;
  byLevel: Record<string, number>;
  recentActivity: number;
  criticalErrors: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AuditPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("audit");
  const [selectedLog, setSelectedLog] = useState<AuditLog | SystemLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "30",
        type: activeTab,
        dateRange,
        ...(searchTerm && { search: searchTerm }),
        ...(actionFilter !== "all" && { action: actionFilter }),
        ...(levelFilter !== "all" && { level: levelFilter }),
      });

      const res = await fetch(`/api/bank/audit?${params}`, { credentials: "include" });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Erreur lors du chargement");

      if (activeTab === "audit") {
        setAuditLogs(result.logs || []);
      } else {
        setSystemLogs(result.logs || []);
      }
      setStats(result.statistics);
      setPagination(result.pagination);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, actionFilter, levelFilter, dateRange, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, searchTerm ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchLogs, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, actionFilter, levelFilter, dateRange, activeTab]);

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      LOGIN: <LogIn className="h-4 w-4" />,
      LOGOUT: <LogOut className="h-4 w-4" />,
      USER_CREATED: <UserPlus className="h-4 w-4" />,
      USER_SUSPENDED: <UserMinus className="h-4 w-4" />,
      USER_ACTIVATED: <UserCog className="h-4 w-4" />,
      KYC_APPROVED: <CheckCircle2 className="h-4 w-4" />,
      KYC_REJECTED: <XCircle className="h-4 w-4" />,
      TRANSACTION_COMPLETED: <ArrowLeftRight className="h-4 w-4" />,
      TRANSACTION_FAILED: <AlertTriangle className="h-4 w-4" />,
      SETTINGS_UPDATED: <Settings className="h-4 w-4" />,
      SECURITY_ALERT: <Shield className="h-4 w-4" />,
      ACCOUNT_FROZEN: <Lock className="h-4 w-4" />,
      ACCOUNT_UNFROZEN: <Unlock className="h-4 w-4" />,
      WALLET_CREATED: <Wallet className="h-4 w-4" />,
      CARD_ISSUED: <CreditCard className="h-4 w-4" />,
    };
    return iconMap[action] || <Activity className="h-4 w-4" />;
  };

  const getActionBadge = (action: string) => {
    const actionConfig: Record<string, { color: string; label: string }> = {
      LOGIN: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Connexion" },
      LOGOUT: { color: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: "Deconnexion" },
      USER_CREATED: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Creation utilisateur" },
      USER_SUSPENDED: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Suspension" },
      USER_ACTIVATED: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Activation" },
      KYC_APPROVED: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "KYC Approuve" },
      KYC_REJECTED: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "KYC Rejete" },
      TRANSACTION_COMPLETED: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Transaction" },
      TRANSACTION_FAILED: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Transaction echouee" },
      SETTINGS_UPDATED: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Parametres" },
      SECURITY_ALERT: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Alerte securite" },
      ACCOUNT_FROZEN: { color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", label: "Compte gele" },
      ACCOUNT_UNFROZEN: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Compte degele" },
    };
    const config = actionConfig[action] || { color: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: action };
    return (
      <Badge className={`${config.color} text-[9px] font-bold gap-1`}>
        {getActionIcon(action)}
        {config.label}
      </Badge>
    );
  };

  const getLevelBadge = (level: string) => {
    const levelConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      DEBUG: { color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: <Bug className="h-2.5 w-2.5" /> },
      INFO: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: <Info className="h-2.5 w-2.5" /> },
      WARN: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: <AlertTriangle className="h-2.5 w-2.5" /> },
      ERROR: { color: "bg-red-500/10 text-red-400 border-red-500/20", icon: <XCircle className="h-2.5 w-2.5" /> },
      FATAL: { color: "bg-red-600/20 text-red-500 border-red-600/30", icon: <Zap className="h-2.5 w-2.5" /> },
    };
    const config = levelConfig[level] || levelConfig.INFO;
    return (
      <Badge className={`${config.color} text-[9px] font-bold gap-1`}>
        {config.icon}
        {level}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/bank/audit/export?type=${activeTab}&dateRange=${dateRange}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeTab}_logs_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert("Erreur lors de l'export");
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
            <Landmark className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Audit et Journal</h1>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                <ClipboardList className="h-3 w-3 mr-1" />
                {loading ? "..." : (stats?.totalAuditLogs || 0) + (stats?.totalSystemLogs || 0)} entrees
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Tracabilite des operations et logs systeme</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-white/10 bg-slate-900/50 text-slate-400 hover:text-white text-xs font-bold"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button
              variant="outline"
              className="border-white/10 bg-slate-900/50 text-slate-400 hover:text-white text-xs font-bold"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="bg-slate-900/50 border-white/5 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-slate-500 uppercase truncate">Logs Audit</p>
                  {loading ? (
                    <Skeleton className="h-5 w-12 bg-slate-700 mt-0.5" />
                  ) : (
                    <p className="text-sm font-black text-blue-500">{stats?.totalAuditLogs || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-2xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                  <Activity className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-slate-500 uppercase truncate">Activite 24h</p>
                  {loading ? (
                    <Skeleton className="h-5 w-12 bg-slate-700 mt-0.5" />
                  ) : (
                    <p className="text-sm font-black text-amber-500">{stats?.recentActivity || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Distribution */}
        {stats?.byAction && Object.keys(stats.byAction).length > 0 && (
          <Card className="bg-slate-900/50 border-white/5 rounded-2xl mb-6 overflow-hidden">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-bold text-white">Distribution des Actions</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {Object.entries(stats.byAction).slice(0, 8).map(([action, count]) => (
                  <div key={action} className="flex items-center gap-1.5 bg-slate-800/50 rounded-lg px-2 py-1.5 border border-white/5 shrink-0">
                    {getActionIcon(action)}
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{action.replace(/_/g, " ")}</span>
                    <Badge className="bg-slate-700/50 text-slate-300 text-[9px] px-1.5">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-slate-900/50 border border-white/5 p-1 rounded-2xl">
            <TabsTrigger value="audit" className="rounded-xl text-xs font-bold data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              <Shield className="h-3.5 w-3.5 mr-2" />
              Journal d&apos;Audit
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-xl text-xs font-bold data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Server className="h-3.5 w-3.5 mr-2" />
              Logs Systeme
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Logs Table */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-black text-white">
                  {activeTab === "audit" ? "Journal d'Audit" : "Logs Systeme"}
                </CardTitle>
                <CardDescription className="text-slate-500">
                  {pagination ? `Page ${pagination.page} sur ${pagination.totalPages} - ${pagination.total} entrees` : "Chargement..."}
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
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-28 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                    <Calendar className="h-3.5 w-3.5 mr-2" />
                    <SelectValue placeholder="Periode" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="24h">24 heures</SelectItem>
                    <SelectItem value="7d">7 jours</SelectItem>
                    <SelectItem value="30d">30 jours</SelectItem>
                    <SelectItem value="90d">90 jours</SelectItem>
                  </SelectContent>
                </Select>
                {activeTab === "audit" ? (
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-32 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                      <Filter className="h-3.5 w-3.5 mr-2" />
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="LOGIN">Connexions</SelectItem>
                      <SelectItem value="USER_CREATED">Creations</SelectItem>
                      <SelectItem value="USER_SUSPENDED">Suspensions</SelectItem>
                      <SelectItem value="KYC_APPROVED">KYC Approuve</SelectItem>
                      <SelectItem value="TRANSACTION_COMPLETED">Transactions</SelectItem>
                      <SelectItem value="SECURITY_ALERT">Alertes</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-28 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                      <Filter className="h-3.5 w-3.5 mr-2" />
                      <SelectValue placeholder="Niveau" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="DEBUG">Debug</SelectItem>
                      <SelectItem value="INFO">Info</SelectItem>
                      <SelectItem value="WARN">Warning</SelectItem>
                      <SelectItem value="ERROR">Error</SelectItem>
                      <SelectItem value="FATAL">Fatal</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="text-red-400 text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchLogs} className="border-white/10 text-xs">
                  Reessayer
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {activeTab === "audit" ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Date/Heure</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Action</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Administrateur</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Cible</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Details</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                          <TableRow key={i} className="border-white/5">
                            <TableCell><Skeleton className="h-5 w-32 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-28 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-36 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 bg-slate-700 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <ClipboardList className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">Aucun log trouve</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map((log) => (
                          <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-xs text-slate-300">{formatDate(log.createdAt)}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getActionBadge(log.action)}</TableCell>
                            <TableCell>
                              <span className="text-xs text-slate-400">{log.adminName || "Systeme"}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-slate-400">{log.targetEmail || "-"}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-slate-500 truncate max-w-[200px] block">
                                {log.details || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog open={dialogOpen && selectedLog?.id === log.id} onOpenChange={(open) => {
                                setDialogOpen(open);
                                if (open) setSelectedLog(log);
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle className="text-white">Details du Log</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                      {formatDate((selectedLog as AuditLog)?.createdAt || "")}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedLog && "action" in selectedLog && (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-3">
                                        {getActionBadge((selectedLog as AuditLog).action)}
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-slate-800/30 p-3 rounded-xl">
                                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Administrateur</p>
                                          <p className="text-white">{(selectedLog as AuditLog).adminName || "Systeme"}</p>
                                        </div>
                                        <div className="bg-slate-800/30 p-3 rounded-xl">
                                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Cible</p>
                                          <p className="text-white">{(selectedLog as AuditLog).targetEmail || "-"}</p>
                                        </div>
                                      </div>
                                      {(selectedLog as AuditLog).details && (
                                        <div className="bg-slate-800/30 p-4 rounded-xl">
                                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Details</p>
                                          <p className="text-sm text-slate-300">{(selectedLog as AuditLog).details}</p>
                                        </div>
                                      )}
                                      {(selectedLog as AuditLog).ip && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                          <Globe className="h-3.5 w-3.5" />
                                          <span>IP: {(selectedLog as AuditLog).ip}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Date/Heure</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Niveau</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Source</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Action</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Message</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Duree</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                          <TableRow key={i} className="border-white/5">
                            <TableCell><Skeleton className="h-5 w-32 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-28 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-12 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 bg-slate-700 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : systemLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <Server className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">Aucun log systeme trouve</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        systemLogs.map((log) => (
                          <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-xs text-slate-300">{formatDate(log.createdAt)}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getLevelBadge(log.level)}</TableCell>
                            <TableCell>
                              <span className="text-xs text-slate-400 font-mono bg-slate-800/50 px-2 py-1 rounded">
                                {log.source}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-slate-300">{log.action}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-slate-500 truncate max-w-[200px] block">
                                {log.message}
                              </span>
                            </TableCell>
                            <TableCell>
                              {log.duration !== null ? (
                                <span className="text-xs text-slate-400">{log.duration}ms</span>
                              ) : (
                                <span className="text-xs text-slate-600">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog open={dialogOpen && selectedLog?.id === log.id} onOpenChange={(open) => {
                                setDialogOpen(open);
                                if (open) setSelectedLog(log);
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle className="text-white">Log Systeme</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                      {formatDate((selectedLog as SystemLog)?.createdAt || "")}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedLog && "level" in selectedLog && (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-3">
                                        {getLevelBadge((selectedLog as SystemLog).level)}
                                        <span className="text-xs text-slate-500 font-mono">
                                          {(selectedLog as SystemLog).requestId}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-slate-800/30 p-3 rounded-xl">
                                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Source</p>
                                          <p className="text-white font-mono">{(selectedLog as SystemLog).source}</p>
                                        </div>
                                        <div className="bg-slate-800/30 p-3 rounded-xl">
                                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Action</p>
                                          <p className="text-white">{(selectedLog as SystemLog).action}</p>
                                        </div>
                                      </div>
                                      <div className="bg-slate-800/30 p-4 rounded-xl">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Message</p>
                                        <p className="text-sm text-slate-300">{(selectedLog as SystemLog).message}</p>
                                      </div>
                                      {(selectedLog as SystemLog).details && (
                                        <div className="bg-slate-800/30 p-4 rounded-xl">
                                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Details (JSON)</p>
                                          <ScrollArea className="h-32">
                                            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                                              {JSON.stringify((selectedLog as SystemLog).details, null, 2)}
                                            </pre>
                                          </ScrollArea>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-4 text-xs text-slate-500">
                                        {(selectedLog as SystemLog).ip && (
                                          <div className="flex items-center gap-1">
                                            <Globe className="h-3.5 w-3.5" />
                                            <span>IP: {(selectedLog as SystemLog).ip}</span>
                                          </div>
                                        )}
                                        {(selectedLog as SystemLog).duration !== null && (
                                          <div className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>{(selectedLog as SystemLog).duration}ms</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
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
