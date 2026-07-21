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
import { cn } from "@/lib/utils";
import {
  Search,
  Users,
  UserCheck,
  Phone,
  Mail,
  Menu,
  X,
  QrCode,
  Clock,
  Zap,
  UserPlus,
  Activity,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function KYCBadge({ status }: { status: string }) {
  const verified = status === "VERIFIED" || status === "APPROVED";
  if (verified) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
        <UserCheck className="h-3 w-3 mr-1" />
        Valide
      </Badge>
    );
  }
  if (status === "PENDING") {
    return (
      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
        <Clock className="h-3 w-3 mr-1" />
        En attente
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">Non verifie</Badge>
  );
}

export default function AgentCustomersPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tab, setTab] = useState<"referrals" | "search">("referrals");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchData, isLoading: searchLoading } = useSWR(
    tab === "search" && searchQuery.length >= 2
      ? `/api/agent/customer?q=${encodeURIComponent(searchQuery)}`
      : null,
    fetcher
  );

  const { data: referralData, isLoading: referralLoading } = useSWR(
    "/api/agent/referral",
    fetcher
  );

  const customers = searchData?.customers || [];
  const referredClients = referralData?.clients || [];
  const stats = referralData?.stats || { totalReferred: 0, activatedCount: 0, pendingKyc: 0 };

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
                  <h1 className="text-sm font-black text-white text-center">PIMOBIPAY</h1>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase text-center">Agent Hub</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400" aria-label="Fermer le menu">
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
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl bg-white/5 text-slate-400" aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-black text-white">PIMOBIPAY</h1>
          <div className="w-9" />
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Clients</h1>
            <p className="text-sm text-slate-500 mt-1">Suivez vos filleuls et recherchez des clients</p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <QrCode className="h-4 w-4 mr-2" />
            Scanner QR
          </Button>
        </div>

        {/* Referral Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <UserPlus className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Recrutes</span>
              </div>
              {referralLoading ? (
                <Skeleton className="h-7 w-12 bg-slate-700" />
              ) : (
                <p className="text-2xl font-black text-white">{stats.totalReferred}</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-emerald-500 mb-2">
                <Activity className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Actifs</span>
              </div>
              {referralLoading ? (
                <Skeleton className="h-7 w-12 bg-slate-700" />
              ) : (
                <p className="text-2xl font-black text-emerald-500">{stats.activatedCount}</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">KYC</span>
              </div>
              {referralLoading ? (
                <Skeleton className="h-7 w-12 bg-slate-700" />
              ) : (
                <p className="text-2xl font-black text-amber-500">{stats.pendingKyc}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="inline-flex items-center gap-1 rounded-2xl bg-slate-900/50 border border-white/5 p-1 mb-6">
          <button
            onClick={() => setTab("referrals")}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-bold transition-colors",
              tab === "referrals" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            Mes filleuls
          </button>
          <button
            onClick={() => setTab("search")}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-bold transition-colors",
              tab === "search" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            Recherche
          </button>
        </div>

        {/* Referrals tab */}
        {tab === "referrals" && (
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
                Clients recrutes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referralLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full bg-slate-800" />
                  ))}
                </div>
              ) : referredClients.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Aucun filleul pour le moment</p>
                  <p className="text-slate-600 text-sm mt-1">
                    Partagez votre code parrain depuis la section Parrainage & QR
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referredClients.map((client: any) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-emerald-500/20 text-emerald-500 font-bold">
                          {(client.name || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-white font-bold truncate">{client.name}</p>
                          <KYCBadge status={client.kycStatus} />
                          {client.activated ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              <Zap className="h-3 w-3 mr-1" />
                              Actif
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">
                              Inactif
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </span>
                          )}
                          <span className="text-xs">
                            {client.transactionsCount} transaction{client.transactionsCount > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="hidden sm:block text-right">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Commission</p>
                        <p className={cn("text-sm font-bold", client.activated ? "text-emerald-500" : "text-slate-500")}>
                          {client.activated ? "Debloquee" : "En attente"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Search tab */}
        {tab === "search" && (
          <>
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

            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                  <Search className="h-5 w-5 text-emerald-500" />
                  Resultats de recherche
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchQuery.length < 2 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Entrez au moins 2 caracteres pour rechercher</p>
                  </div>
                ) : searchLoading ? (
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
                            <KYCBadge status={customer.kycStatus} />
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
          </>
        )}
      </main>
    </div>
  );
}
