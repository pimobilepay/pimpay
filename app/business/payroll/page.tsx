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
  MoreVertical,
  Mail,
  Phone,
  Edit,
  Trash2,
  History,
  TrendingUp,
} from "lucide-react";

// Mock employees data
const employees = [
  { id: 1, name: "Jean-Pierre Mbote", email: "jp.mbote@email.com", phone: "+243 812 345 678", role: "Developpeur Senior", department: "Tech", salary: 3500, status: "active", avatar: "JP", joinDate: "2024-01-15", lastPaid: "2026-02-28" },
  { id: 2, name: "Marie Lukusa", email: "m.lukusa@email.com", phone: "+243 823 456 789", role: "Designer UX", department: "Design", salary: 2800, status: "active", avatar: "ML", joinDate: "2024-03-20", lastPaid: "2026-02-28" },
  { id: 3, name: "Patrick Kalala", email: "p.kalala@email.com", phone: "+243 834 567 890", role: "Chef de Projet", department: "Management", salary: 4200, status: "active", avatar: "PK", joinDate: "2023-09-01", lastPaid: "2026-02-28" },
  { id: 4, name: "Esther Mbuyi", email: "e.mbuyi@email.com", phone: "+243 845 678 901", role: "Comptable", department: "Finance", salary: 3000, status: "pending", avatar: "EM", joinDate: "2024-06-10", lastPaid: "2026-02-28" },
  { id: 5, name: "David Tshimanga", email: "d.tshimanga@email.com", phone: "+243 856 789 012", role: "Marketing Manager", department: "Marketing", salary: 2600, status: "active", avatar: "DT", joinDate: "2024-02-01", lastPaid: "2026-02-28" },
  { id: 6, name: "Grace Kabongo", email: "g.kabongo@email.com", phone: "+243 867 890 123", role: "Support Client", department: "Support", salary: 2200, status: "active", avatar: "GK", joinDate: "2024-04-15", lastPaid: "2026-02-28" },
  { id: 7, name: "Samuel Mutombo", email: "s.mutombo@email.com", phone: "+243 878 901 234", role: "Developpeur Junior", department: "Tech", salary: 1800, status: "active", avatar: "SM", joinDate: "2025-01-10", lastPaid: "2026-02-28" },
  { id: 8, name: "Nicole Kasongo", email: "n.kasongo@email.com", phone: "+243 889 012 345", role: "RH Manager", department: "RH", salary: 3200, status: "active", avatar: "NK", joinDate: "2023-11-05", lastPaid: "2026-02-28" },
];

// Payroll history
const payrollHistory = [
  { id: "PAY001", period: "Fevrier 2026", employees: 8, totalAmount: 23300, status: "completed", date: "2026-02-28" },
  { id: "PAY002", period: "Janvier 2026", employees: 8, totalAmount: 23300, status: "completed", date: "2026-01-31" },
  { id: "PAY003", period: "Decembre 2025", employees: 7, totalAmount: 21500, status: "completed", date: "2025-12-31" },
  { id: "PAY004", period: "Novembre 2025", employees: 7, totalAmount: 21500, status: "completed", date: "2025-11-30" },
];

export default function PayrollPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = departmentFilter === "all" || e.department === departmentFilter;
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [searchQuery, departmentFilter, statusFilter]);

  const totalSalary = useMemo(() => 
    employees.filter(e => selectedEmployees.includes(e.id) || selectedEmployees.length === 0)
      .reduce((sum, e) => sum + e.salary, 0)
  , [selectedEmployees]);

  const toggleEmployee = (id: number) => {
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

  const departments = [...new Set(employees.map(e => e.department))];

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
                      <Label className="text-slate-300">Nom complet</Label>
                      <Input className="bg-slate-800 border-white/10" placeholder="Jean Dupont" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Email</Label>
                      <Input className="bg-slate-800 border-white/10" placeholder="email@example.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Telephone</Label>
                      <Input className="bg-slate-800 border-white/10" placeholder="+243 XXX XXX XXX" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Poste</Label>
                      <Input className="bg-slate-800 border-white/10" placeholder="Developpeur" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Departement</Label>
                      <Select>
                        <SelectTrigger className="bg-slate-800 border-white/10">
                          <SelectValue placeholder="Selectionner" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          {departments.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <p className="text-3xl font-black text-white mt-1">{employees.length}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400">+2 ce mois</span>
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
                  <p className="text-3xl font-black text-white mt-1">${employees.reduce((sum, e) => sum + e.salary, 0).toLocaleString()}</p>
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
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paies en Attente</p>
                  <p className="text-3xl font-black text-white mt-1">1</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">Esther Mbuyi</span>
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
                  <p className="text-xl font-black text-white mt-1">28 Fev 2026</p>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">8 employes payes</span>
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
                      disabled={selectedEmployees.length === 0}
                    >
                      <Send className="h-4 w-4 mr-2" />
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
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-36 bg-slate-800/50 border-white/10 text-xs font-bold">
                      <SelectValue placeholder="Departement" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="all">Tous</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        <TableHead className="text-slate-500 text-xs font-bold">Departement</TableHead>
                        <TableHead className="text-slate-500 text-xs font-bold">Salaire</TableHead>
                        <TableHead className="text-slate-500 text-xs font-bold">Statut</TableHead>
                        <TableHead className="text-slate-500 text-xs font-bold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
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
                                {employee.avatar}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{employee.name}</p>
                                <p className="text-[11px] text-slate-500">{employee.role}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-slate-800 text-slate-300 border-white/10 text-[10px] font-bold">
                              {employee.department}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-black text-white">${employee.salary.toLocaleString()}</p>
                          </TableCell>
                          <TableCell>
                            {employee.status === "active" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">Actif</Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold">En attente</Badge>
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
                      ))}
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
                {payrollHistory.map((payroll) => (
                  <div key={payroll.id} className="p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-white">{payroll.period}</p>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{payroll.employees} employes</span>
                      <span className="font-bold text-white">${payroll.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
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
