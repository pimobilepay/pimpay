"use client";

import { useState } from "react";
import useSWR from "swr";
import { AgentSidebar } from "@/components/hub/AgentSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  RefreshCw,
  Users,
  UserCheck,
  Phone,
  Mail,
  Menu,
  X,
  Plus,
  QrCode,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AgentCustomersPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, mutate } = useSWR(
    searchQuery.length >= 2 ? `/api/agent/customer?q=${encodeURIComponent(searchQuery)}` : null,
    fetcher
  );

  const customers = data?.customers || [];

  const getKYCBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <UserCheck className="h-3 w-3 mr-1" />
            Verifie
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            En attente
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20">
            Non verifie
          </Badge>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AgentSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center justify-center flex-1">
                <div>
                  <h1 className="text-sm font-black text-white text-center">PIMPAY</h1>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase text-center">Agent Hub</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <AgentSidebar isMobile />
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
          <h1 className="text-sm font-black text-white">PIMPAY</h1>
          <div className="w-9" />
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Clients</h1>
            <p className="text-sm text-slate-500 mt-1">Recherchez et gerez vos clients</p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <QrCode className="h-4 w-4 mr-2" />
              Scanner QR
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Rechercher par nom, telephone ou username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-white/10 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              Resultats de recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchQuery.length < 2 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Entrez au moins 2 caracteres pour rechercher</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full bg-slate-800" />
                ))}
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Aucun client trouve</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customers.map((customer: any) => (
                  <div
                    key={customer.id}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-emerald-500/20 text-emerald-500 font-bold">
                        {(customer.name || customer.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-bold truncate">
                          {customer.name || customer.username}
                        </p>
                        {getKYCBadge(customer.kycStatus)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone || "Non renseigne"}
                        </span>
                        {customer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        Cash-In
                      </Button>
                      <Button size="sm" variant="outline" className="border-white/10 text-white">
                        Cash-Out
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
