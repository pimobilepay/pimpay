"use client";

import { getErrorMessage } from '@/lib/error-utils';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Landmark,
  Menu,
  X,
  RefreshCw,
  Bell,
  ShieldAlert,
  DollarSign,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  BellOff,
  AlertCircle,
  Server,
  Users,
  Lock,
  TrendingDown,
} from "lucide-react";

// Types for alerts API response
interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  time: string;
  status: string;
  ipAddress?: string;
}

interface AlertStats {
  total: number;
  open: number;
  pending: number;
  resolved: number;
  highPriority: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiResponse {
  alerts: Alert[];
  pagination: Pagination;
  statistics: AlertStats;
}

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "A l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString("fr-FR");
}

export default function AlertsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  // API data state
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        ...(searchTerm && { search: searchTerm }),
        ...(severityFilter !== "all" && { severity: severityFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(activeTab !== "all" && { type: activeTab }),
      });

      const res = await fetch(`/api/bank/alerts?${params}`, { credentials: "include" });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Erreur lors du chargement des alertes");

      setData(result);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? getErrorMessage(err) : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, severityFilter, statusFilter, activeTab]);

  // Fetch on mount and when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlerts();
    }, searchTerm ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchAlerts, searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, severityFilter, statusFilter, activeTab]);

  // Handle alert actions (resolve, acknowledge)
  const handleAlertAction = async (alertId: string, action: string) => {
    try {
      const res = await fetch("/api/bank/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ alertId, action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur");
      await fetchAlerts();
    } catch (err: unknown) {
      alert(err instanceof Error ? getErrorMessage(err) : "Erreur lors de l'action");
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    // For now, refresh the list - in production, would call a dedicated endpoint
    await fetchAlerts();
  };

  // Get data from API response
  const alerts = data?.alerts || [];
  const alertStats = data?.statistics || { total: 0, open: 0, pending: 0, resolved: 0, highPriority: 0 };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "security":
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case "transaction":
        return <DollarSign className="h-5 w-5 text-amber-500" />;
      case "compliance":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case "system":
        return <Server className="h-5 w-5 text-slate-400" />;
      case "liquidity":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case "users":
        return <Users className="h-5 w-5 text-emerald-500" />;
      default:
        return <Bell className="h-5 w-5 text-slate-400" />;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Ouvert</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">En attente</Badge>;
      case "acknowledged":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-bold">Pris en compte</Badge>;
      case "investigating":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[9px] font-bold">Investigation</Badge>;
      case "resolved":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Resolu</Badge>;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-l-red-500 bg-red-500/5";
      case "medium":
        return "border-l-amber-500 bg-amber-500/5";
      case "low":
        return "border-l-emerald-500 bg-emerald-500/5";
      default:
        return "border-l-slate-500 bg-slate-500/5";
    }
  };

  // Alerts are already filtered by the API, no need to filter again
  const filteredAlerts = alerts;

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
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Centre d&apos;Alertes</h1>
              {loading ? (
                <Skeleton className="h-5 w-20 bg-slate-700" />
              ) : alertStats.highPriority > 0 && (
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {alertStats.highPriority} Critiques
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500">Surveillance et gestion des alertes systeme</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-white/10 text-xs font-bold" onClick={handleMarkAllRead}>
              <BellOff className="h-4 w-4 mr-2" />
              Tout marquer lu
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="border-white/10 bg-slate-900/50"
              onClick={fetchAlerts}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-500/10 rounded-xl">
                  <Bell className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Total</p>
                  {loading ? (
                    <Skeleton className="h-7 w-10 bg-slate-700 mt-0.5" />
                  ) : (
                    <p className="text-xl font-black text-white">{alertStats.total}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500/10 border-red-500/20 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Ouverts</p>
                  {loading ? (
                    <Skeleton className="h-7 w-10 bg-red-900/50 mt-0.5" />
                  ) : (
                    <p className="text-xl font-black text-red-500">{alertStats.open}</p>
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
                  {loading ? (
                    <Skeleton className="h-7 w-10 bg-amber-900/50 mt-0.5" />
                  ) : (
                    <p className="text-xl font-black text-amber-500">{alertStats.pending}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Resolus</p>
                  {loading ? (
                    <Skeleton className="h-7 w-10 bg-emerald-900/50 mt-0.5" />
                  ) : (
                    <p className="text-xl font-black text-emerald-500">{alertStats.resolved}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500/10 border-red-500/20 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-xl">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Critiques</p>
                  {loading ? (
                    <Skeleton className="h-7 w-10 bg-red-900/50 mt-0.5" />
                  ) : (
                    <p className="text-xl font-black text-red-500">{alertStats.highPriority}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Rechercher une alerte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-white/10 text-white text-xs"
                />
              </div>
              <div className="flex items-center gap-3">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-32 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                    <SelectValue placeholder="Severite" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="high">Critique</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="investigating">Investigation</SelectItem>
                    <SelectItem value="resolved">Resolu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-white/5 p-1 rounded-2xl flex-wrap h-auto">
            <TabsTrigger value="all" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              Toutes
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              <Lock className="h-3.5 w-3.5 mr-1" />
              Securite
            </TabsTrigger>
            <TabsTrigger value="transaction" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="compliance" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              <AlertCircle className="h-3.5 w-3.5 mr-1" />
              Conformite
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              <Server className="h-3.5 w-3.5 mr-1" />
              Systeme
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {error ? (
              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-400 font-bold">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchAlerts} className="border-white/10 text-xs mt-4">
                    Reessayer
                  </Button>
                </CardContent>
              </Card>
            ) : loading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="bg-slate-900/50 border-white/5 rounded-3xl border-l-4 border-l-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <Skeleton className="h-11 w-11 rounded-xl bg-slate-700" />
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="h-4 w-48 bg-slate-700" />
                            <Skeleton className="h-5 w-16 bg-slate-700" />
                          </div>
                          <Skeleton className="h-3 w-64 bg-slate-700 mb-2" />
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-3 w-20 bg-slate-700" />
                            <Skeleton className="h-5 w-16 bg-slate-700" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredAlerts.length === 0 ? (
              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardContent className="p-8 text-center">
                  <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">Aucune alerte trouvee</p>
                  <p className="text-xs text-slate-500 mt-1">Modifiez vos filtres ou revenez plus tard</p>
                </CardContent>
              </Card>
            ) : (
              filteredAlerts.map((alert) => (
                <Card key={alert.id} className={`bg-slate-900/50 border-white/5 rounded-3xl border-l-4 ${getSeverityColor(alert.severity)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-slate-800/50">
                          {getAlertIcon(alert.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-white">{alert.title}</p>
                            {getSeverityBadge(alert.severity)}
                          </div>
                          <p className="text-xs text-slate-400">{alert.description}</p>
                          {alert.ipAddress && (
                            <p className="text-[10px] text-slate-500 mt-1">IP: {alert.ipAddress}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(alert.time)}
                            </span>
                            {getStatusBadge(alert.status)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {alert.status !== "resolved" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-400"
                            onClick={() => handleAlertAction(alert.id, "resolve")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
