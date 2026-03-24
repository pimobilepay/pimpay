"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Users,
  Building2,
  Send,
  Upload,
  UserPlus,
  Search,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Menu,
  X,
  Download,
  Mail,
  Edit,
  Trash2,
  History,
  TrendingUp,
} from "lucide-react";

// Types based on Prisma schema
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  salary: number | null;
  isActive: boolean;
}

interface PayrollHistory {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  createdAt: string;
}

interface PayrollData {
  employees: Employee[];
  payrollHistory: PayrollHistory[];
  stats: {
    totalEmployees: number;
    totalMonthlySalary: number;
  };
}

export default function PayrollPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  
  // Real data state
  const [data, setData] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Fetch payroll data
  const fetchPayrollData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/business/payroll", {
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
  }, []);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  // Process payroll payment
  const processPayroll = async () => {
    if (selectedEmployees.length === 0) return;
    
    try {
      setProcessing(true);
      const response = await fetch("/api/business/payroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          employeeIds: selectedEmployees,
          description: `Paiement salaires - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Erreur lors du paiement");
      }
      
      // Refresh data and clear selection
      await fetchPayrollData();
      setSelectedEmployees([]);
      alert(`Paiement effectue avec succes! Reference: ${result.data.reference}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur lors du paiement");
    } finally {
      setProcessing(false);
    }
  };

  // Get employees from data or empty array
  const employees = data?.employees || [];

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
      const position = (e.position || "").toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
        position.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && e.isActive) ||
        (statusFilter === "pending" && !e.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  const totalSalary = useMemo(() => 
    employees.filter(e => selectedEmployees.includes(e.id) || selectedEmployees.length === 0)
      .reduce((sum, e) => sum + (e.salary || 0), 0)
  , [employees, selectedEmployees]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
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
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Paie & Salaires</h1>
            <p className="text-sm text-slate-500 mt-1">Gerez les salaires et paiements de vos employes</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-white/10 text-xs font-bold">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-xs font-bold">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter Employe
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white">Ajouter un Employe</DialogTitle>
                  <DialogDescription className="text-slate-400">Remplissez les informations de l&apos;employe</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Prenom</Label>
                      <Input className="bg-slate-800 border-white/10" placeholder="Jean" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Nom</Label>
                      <Input className="bg-slate-800 border-white/10" placeholder="Dupont" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Poste</Label>
                      <Input className="bg-slate-800 border-white/10" placeholder="Developpeur" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Salaire (USD)</Label>
                      <Input className="bg-slate-800 border-white/10" type="number" placeholder="0.00" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="border-white/10" onClick={() => setAddEmployeeOpen(false)}>Annuler</Button>
                  <Button className="bg-emerald-500 hover:bg-emerald-600">Ajouter</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border-blue-500/30 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-300/70 uppercase tracking-wider">Total Employes</p>
                  {loading ? (
                    <Skeleton className="h-9 w-16 mt-1 bg-blue-500/20" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">{data?.stats.totalEmployees || 0}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400">Actifs</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-2xl">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-500/30 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-300/70 uppercase tracking-wider">Masse Salariale</p>
                  {loading ? (
                    <Skeleton className="h-9 w-24 mt-1 bg-emerald-500/20" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-1">${(data?.stats.totalMonthlySalary || 0).toLocaleString()}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">par mois</p>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selectionnes</p>
                  <p className="text-3xl font-black text-white mt-1">{selectedEmployees.length}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">Pour paiement</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-2xl">
                  <AlertCircle className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Derniere Paie</p>
                  {loading ? (
                    <Skeleton className="h-7 w-28 mt-1 bg-slate-700" />
                  ) : data?.payrollHistory?.[0] ? (
                    <p className="text-xl font-black text-white mt-1">
                      {new Date(data.payrollHistory[0].createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  ) : (
                    <p className="text-xl font-black text-white mt-1">Aucune</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">
                      {data?.payrollHistory?.[0] ? `$${data.payrollHistory[0].amount.toLocaleString()}` : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <Calendar className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Employee List - 2 columns */}
          <div className="xl:col-span-2">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Liste des Employes</CardTitle>
                    <CardDescription className="text-slate-500">Selectionnez pour paiement groupe</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-white/10 text-xs font-bold">
                      <Upload className="h-4 w-4 mr-2" />
                      Importer CSV
                    </Button>
                    <Button 
                      className="bg-emerald-500 hover:bg-emerald-600 text-xs font-bold"
                      disabled={selectedEmployees.length === 0 || processing}
                      onClick={processPayroll}
                    >
                      {processing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Payer ({selectedEmployees.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Rechercher un employe..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-slate-800/50 border-white/10 text-sm"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-white/10 text-xs font-bold"
                    onClick={fetchPayrollData}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 bg-slate-800/50 border-white/10 text-xs font-bold">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={selectAllEmployees} className="border-white/10 text-xs font-bold whitespace-nowrap">
                    {selectedEmployees.length === filteredEmployees.length ? "Deselectionner" : "Tout selectionner"}
                  </Button>
                </div>

                {/* Employee Table */}
                <div className="rounded-2xl border border-white/5 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-slate-500 text-xs font-bold">Employe</TableHead>
                        <TableHead className="text-slate-500 text-xs font-bold">Poste</TableHead>
                        <TableHead className="text-slate-500 text-xs font-bold">Salaire</TableHead>
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
                              <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-xl bg-slate-700" />
                                <div>
                                  <Skeleton className="h-4 w-32 bg-slate-700 mb-1" />
                                  <Skeleton className="h-3 w-24 bg-slate-700" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-5 w-20 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-14 bg-slate-700" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-24 bg-slate-700 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : error ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <p className="text-red-400 text-sm">{error}</p>
                            <Button variant="outline" size="sm" onClick={fetchPayrollData} className="mt-2 border-white/10">
                              Reessayer
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : filteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <p className="text-slate-500 text-sm">Aucun employe trouve</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployees.map((employee) => {
                          const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
                          const fullName = `${employee.firstName} ${employee.lastName}`;
                          
                          return (
                            <TableRow 
                              key={employee.id} 
                              className={`border-white/5 cursor-pointer transition-colors ${
                                selectedEmployees.includes(employee.id) ? "bg-emerald-500/10" : "hover:bg-white/5"
                              }`}
                              onClick={() => toggleEmployee(employee.id)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase ${
                                    selectedEmployees.includes(employee.id)
                                      ? "bg-emerald-500 text-white"
                                      : "bg-slate-700 text-slate-300"
                                  }`}>
                                    {initials}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-white">{fullName}</p>
                                    <p className="text-[11px] text-slate-500">{employee.position || "Non defini"}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-slate-800 text-slate-300 border-white/10 text-[10px] font-bold">
                                  {employee.position || "N/A"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm font-black text-white">${(employee.salary || 0).toLocaleString()}</p>
                              </TableCell>
                              <TableCell>
                                {employee.isActive ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">Actif</Badge>
                                ) : (
                                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold">Inactif</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400">
                                    <Trash2 className="h-4 w-4" />
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

                {/* Total Selected */}
                {selectedEmployees.length > 0 && (
                  <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{selectedEmployees.length} employe(s) selectionne(s)</p>
                        <p className="text-xs text-slate-400">Pret pour paiement groupe</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Total a payer</p>
                        <p className="text-2xl font-black text-emerald-400">${totalSalary.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Payroll History */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-white">Historique des Paies</CardTitle>
                  <Button variant="ghost" size="icon" className="text-slate-400">
                    <History className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-800/30" />
                  ))
                ) : data?.payrollHistory && data.payrollHistory.length > 0 ? (
                  data.payrollHistory.map((payroll) => (
                    <div key={payroll.id} className="p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-white truncate max-w-[150px]">
                          {payroll.description || payroll.reference}
                        </p>
                        <Badge className={`text-[10px] font-bold ${
                          payroll.status === "SUCCESS" 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : payroll.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}>
                          {payroll.status === "SUCCESS" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {payroll.status === "SUCCESS" ? "Complete" : payroll.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          {new Date(payroll.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="font-bold text-white">${payroll.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-slate-500 text-sm">Aucun historique de paie</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start border-white/10 text-sm font-bold">
                  <FileSpreadsheet className="h-4 w-4 mr-3 text-emerald-500" />
                  Generer Fiche de Paie
                </Button>
                <Button variant="outline" className="w-full justify-start border-white/10 text-sm font-bold">
                  <Download className="h-4 w-4 mr-3 text-blue-500" />
                  Telecharger Rapport
                </Button>
                <Button variant="outline" className="w-full justify-start border-white/10 text-sm font-bold">
                  <Calendar className="h-4 w-4 mr-3 text-purple-500" />
                  Planifier Paie Auto
                </Button>
                <Button variant="outline" className="w-full justify-start border-white/10 text-sm font-bold">
                  <RefreshCw className="h-4 w-4 mr-3 text-amber-500" />
                  Synchroniser Donnees
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
