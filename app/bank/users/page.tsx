"use client";

import { useState } from "react";
import { BankSidebar } from "@/components/bank/BankSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  UserPlus,
  Shield,
  ShieldCheck,
  UserCog,
  Eye,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Activity,
  Lock,
  Unlock,
  Building2,
  User,
} from "lucide-react";

// Mock users data
const institutionUsers = [
  { id: "USR001", name: "Jean-Pierre Kabongo", email: "jp.kabongo@pimpay.com", role: "Super Admin", department: "Direction", status: "active", lastLogin: "2026-03-24 10:30", twoFa: true },
  { id: "USR002", name: "Marie Tshimanga", email: "m.tshimanga@pimpay.com", role: "Compliance Officer", department: "Conformite", status: "active", lastLogin: "2026-03-24 09:45", twoFa: true },
  { id: "USR003", name: "David Mukendi", email: "d.mukendi@pimpay.com", role: "Treasury Manager", department: "Tresorerie", status: "active", lastLogin: "2026-03-24 08:15", twoFa: true },
  { id: "USR004", name: "Sophie Lumumba", email: "s.lumumba@pimpay.com", role: "KYC Analyst", department: "Conformite", status: "active", lastLogin: "2026-03-23 16:20", twoFa: false },
  { id: "USR005", name: "Patrick Ngandu", email: "p.ngandu@pimpay.com", role: "Operations Lead", department: "Operations", status: "active", lastLogin: "2026-03-23 14:00", twoFa: true },
  { id: "USR006", name: "Claire Kasongo", email: "c.kasongo@pimpay.com", role: "Risk Analyst", department: "Risque", status: "inactive", lastLogin: "2026-03-15 11:30", twoFa: true },
  { id: "USR007", name: "Emmanuel Mbuyi", email: "e.mbuyi@pimpay.com", role: "IT Admin", department: "IT", status: "active", lastLogin: "2026-03-24 11:00", twoFa: true },
  { id: "USR008", name: "Alice Nkulu", email: "a.nkulu@pimpay.com", role: "Customer Support", department: "Support", status: "suspended", lastLogin: "2026-03-20 09:00", twoFa: false },
];

// User statistics
const userStats = {
  total: 24,
  active: 20,
  inactive: 2,
  suspended: 2,
  admins: 3,
  with2FA: 18,
};

// Departments
const departments = [
  { name: "Direction", count: 2, color: "bg-blue-500" },
  { name: "Conformite", count: 6, color: "bg-emerald-500" },
  { name: "Tresorerie", count: 4, color: "bg-amber-500" },
  { name: "Operations", count: 5, color: "bg-purple-500" },
  { name: "IT", count: 3, color: "bg-red-500" },
  { name: "Support", count: 4, color: "bg-slate-500" },
];

export default function UsersPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Actif</Badge>;
      case "inactive":
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] font-bold">Inactif</Badge>;
      case "suspended":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Suspendu</Badge>;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role.includes("Admin")) {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-bold">{role}</Badge>;
    } else if (role.includes("Manager") || role.includes("Lead")) {
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">{role}</Badge>;
    } else {
      return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] font-bold">{role}</Badge>;
    }
  };

  const filteredUsers = institutionUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role.toLowerCase().includes(roleFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

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
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Gestion des Utilisateurs</h1>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                <Users className="h-3 w-3 mr-1" />
                Equipe
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Gestion des acces et permissions des collaborateurs</p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter Utilisateur
            </Button>
            <Button variant="outline" size="icon" className="border-white/10 bg-slate-900/50">
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
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
                  <p className="text-xl font-black text-white">{userStats.total}</p>
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
                  <p className="text-xl font-black text-emerald-500">{userStats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-500/10 border-slate-500/20 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-500/20 rounded-xl">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Inactifs</p>
                  <p className="text-xl font-black text-slate-400">{userStats.inactive}</p>
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
                  <p className="text-xl font-black text-red-500">{userStats.suspended}</p>
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
                  <p className="text-xl font-black text-blue-500">{userStats.admins}</p>
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
                  <p className="text-xl font-black text-emerald-500">{userStats.with2FA}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Users Table */}
          <div className="xl:col-span-3">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Liste des Utilisateurs</CardTitle>
                    <CardDescription className="text-slate-500">Collaborateurs avec acces au portail institution</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-48 bg-slate-800/50 border-white/10 text-white text-xs"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-28 bg-slate-800/50 border-white/10 text-white text-xs font-bold">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                        <SelectItem value="suspended">Suspendu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Utilisateur</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Role</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Departement</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">2FA</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Derniere connexion</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Statut</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 bg-slate-800">
                                <AvatarFallback className="bg-slate-800 text-white text-xs font-bold">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-white">{user.name}</p>
                                <p className="text-[10px] text-slate-500">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell className="text-xs text-slate-400">{user.department}</TableCell>
                          <TableCell>
                            {user.twoFa ? (
                              <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Shield className="h-4 w-4 text-slate-600" />
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">{user.lastLogin}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                <UserCog className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Departments */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white">Departements</CardTitle>
              <CardDescription className="text-slate-500">Repartition des utilisateurs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departments.map((dept) => (
                  <div key={dept.name} className="p-3 rounded-xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${dept.color}`} />
                        <div>
                          <p className="text-sm font-bold text-white">{dept.name}</p>
                          <p className="text-[10px] text-slate-500">{dept.count} membres</p>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-700/50">
                        <Building2 className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
