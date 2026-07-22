"use client";

import { useState } from "react";
import useSWR from "swr";
import { AgentSidebar } from "@/components/hub/AgentSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Users,
  UserCheck,
  ShieldCheck,
  Wallet,
  Activity,
  Menu,
  X,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  TrendingUp,
  Loader2,
  AlertCircle,
  Lock,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type KycUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  kycFrontUrl?: string | null;
  kycBackUrl?: string | null;
  kycSelfieUrl?: string | null;
  kycSubmittedAt?: string | null;
};

function initials(name?: string | null) {
  if (!name) return "AG";
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Actif</Badge>
  ) : (
    <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">Inactif</Badge>
  );
}

export default function SupervisorPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"team" | "kyc">("team");

  // KYC validation state
  const [kycReason, setKycReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedKyc, setSelectedKyc] = useState<KycUser | null>(null);

  const { data, error, isLoading, mutate } = useSWR("/api/agent/supervisor", fetcher, {
    refreshInterval: 30000,
  });

  const {
    data: kycData,
    isLoading: kycLoading,
    mutate: mutateKyc,
  } = useSWR(tab === "kyc" ? "/api/agent/kyc" : null, fetcher);

  const stats = data?.stats;
  const team = data?.team || [];
  const kycList: KycUser[] = kycData?.data || [];

  const isForbidden = data?.error && !data?.success;

  const filteredTeam = team.filter((a: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      a.name?.toLowerCase().includes(q) ||
      a.username?.toLowerCase().includes(q) ||
      a.phone?.toLowerCase().includes(q) ||
      a.city?.toLowerCase().includes(q)
    );
  });

  const handleKycDecision = async (userId: string, status: "APPROVED" | "REJECTED") => {
    setProcessingId(userId);
    try {
      const res = await fetch("/api/agent/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status, reason: kycReason || undefined }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Erreur");
      }
      setSelectedKyc(null);
      setKycReason("");
      mutateKyc();
      mutate();
    } catch (e: any) {
      console.error("[Supervisor KYC]", e.message);
    } finally {
      setProcessingId(null);
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight text-balance">Supervision</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">Pilotez votre équipe d&apos;agents et validez les dossiers KYC</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="border-white/10 bg-slate-900/50 self-start"
            onClick={() => {
              mutate();
              mutateKyc();
            }}
            disabled={isLoading}
            aria-label="Rafraichir"
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-400", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Access denied */}
        {isForbidden ? (
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-10 flex flex-col items-center text-center gap-3">
              <div className="p-4 bg-red-500/10 rounded-2xl">
                <Lock className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-lg font-black text-white">Accès réservé aux superviseurs</h2>
              <p className="text-sm text-slate-500 max-w-md">
                Cette page est réservée aux agents disposant du rôle Superviseur. Contactez l&apos;administration si
                vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agents</p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-12 mt-2 bg-slate-700" />
                      ) : (
                        <p className="text-2xl font-black text-white mt-2">{stats?.totalAgents ?? 0}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{stats?.activeAgents ?? 0} actifs</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Float équipe</p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-20 mt-2 bg-slate-700" />
                      ) : (
                        <p className="text-2xl font-black text-white mt-2">
                          {(stats?.totalFloat ?? 0).toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">XAF</p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                      <Wallet className="h-5 w-5 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Volume jour</p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-20 mt-2 bg-slate-700" />
                      ) : (
                        <p className="text-2xl font-black text-white mt-2">
                          {(stats?.networkDailyVolume ?? 0).toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{stats?.networkDailyTransactions ?? 0} transactions</p>
                    </div>
                    <div className="p-3 bg-amber-500/10 rounded-2xl">
                      <TrendingUp className="h-5 w-5 text-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">KYC en attente</p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-12 mt-2 bg-slate-700" />
                      ) : (
                        <p className="text-2xl font-black text-white mt-2">{stats?.pendingKycCount ?? 0}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">à valider</p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-2xl">
                      <ShieldCheck className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setTab("team")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
                  tab === "team"
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "text-slate-500 hover:text-white border border-white/5"
                )}
              >
                <Users className="h-4 w-4" />
                Mon équipe
              </button>
              <button
                onClick={() => setTab("kyc")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
                  tab === "kyc"
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "text-slate-500 hover:text-white border border-white/5"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Validation KYC
                {(stats?.pendingKycCount ?? 0) > 0 && (
                  <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500/20 px-1.5 text-[10px] font-black text-purple-400">
                    {stats?.pendingKycCount}
                  </span>
                )}
              </button>
            </div>

            {/* Team tab */}
            {tab === "team" && (
              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-emerald-500" />
                      Agents supervisés
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                      Agents rattachés à votre réseau
                    </CardDescription>
                  </div>
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher un agent..."
                      className="pl-9 bg-slate-800/50 border-white/10 text-white text-sm"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full bg-slate-800/50 rounded-2xl" />
                      ))}
                    </div>
                  ) : filteredTeam.length === 0 ? (
                    <div className="py-12 flex flex-col items-center text-center gap-2">
                      <Users className="h-10 w-10 text-slate-600" />
                      <p className="text-sm font-bold text-slate-400">Aucun agent dans votre réseau</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Les agents que vous recrutez via votre QR de parrainage apparaîtront ici.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTeam.map((a: any) => (
                        <div
                          key={a.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-slate-800/40 border border-white/5 p-4 hover:border-emerald-500/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-11 w-11 border border-white/10">
                              <AvatarFallback className="bg-slate-800 text-emerald-500 text-xs font-black">
                                {initials(a.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-white truncate">{a.name}</p>
                                <StatusBadge isActive={a.isActive} />
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                                {a.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {a.phone}
                                  </span>
                                )}
                                {(a.city || a.country) && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {[a.city, a.country].filter(Boolean).join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 sm:gap-6 sm:text-right">
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Float</p>
                              <p className="text-sm font-black text-white">{a.floatBalance.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Vol. jour</p>
                              <p className="text-sm font-black text-white">{a.dailyVolume.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total tx</p>
                              <p className="text-sm font-black text-white">{a.transactionsCount}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* KYC tab */}
            {tab === "kyc" && (
              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    Dossiers KYC en attente
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    Approuvez ou rejetez les vérifications d&apos;identité
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {kycLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full bg-slate-800/50 rounded-2xl" />
                      ))}
                    </div>
                  ) : kycList.length === 0 ? (
                    <div className="py-12 flex flex-col items-center text-center gap-2">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                      <p className="text-sm font-bold text-slate-400">Aucun dossier en attente</p>
                      <p className="text-xs text-slate-500">Tous les KYC ont été traités.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {kycList.map((u) => {
                        const displayName =
                          u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || "Utilisateur";
                        const isOpen = selectedKyc?.id === u.id;
                        return (
                          <div
                            key={u.id}
                            className="rounded-2xl bg-slate-800/40 border border-white/5 overflow-hidden"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar className="h-11 w-11 border border-white/10">
                                  <AvatarFallback className="bg-slate-800 text-amber-500 text-xs font-black">
                                    {initials(displayName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-white truncate">{displayName}</p>
                                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                                    {u.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {u.phone}
                                      </span>
                                    )}
                                    {(u.city || u.country) && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {[u.city, u.country].filter(Boolean).join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 ml-auto sm:ml-0">
                                  <Clock className="h-3 w-3 mr-1" />
                                  En attente
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-white/10 text-slate-300 hover:text-white"
                                  onClick={() => setSelectedKyc(isOpen ? null : u)}
                                >
                                  {isOpen ? "Fermer" : "Examiner"}
                                </Button>
                              </div>
                            </div>

                            {isOpen && (
                              <div className="border-t border-white/5 p-4 bg-slate-900/40">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-xs">
                                  <div>
                                    <p className="text-slate-500 uppercase font-bold text-[9px]">Type de pièce</p>
                                    <p className="text-white font-semibold">{u.idType || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 uppercase font-bold text-[9px]">N° pièce</p>
                                    <p className="text-white font-semibold">{u.idNumber || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 uppercase font-bold text-[9px]">Email</p>
                                    <p className="text-white font-semibold truncate">{u.email || "-"}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                                  {[
                                    { label: "Recto", url: u.kycFrontUrl },
                                    { label: "Verso", url: u.kycBackUrl },
                                    { label: "Selfie", url: u.kycSelfieUrl },
                                  ].map((doc) => (
                                    <div key={doc.label} className="rounded-xl bg-slate-800/50 border border-white/5 overflow-hidden">
                                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-3 pt-2">
                                        {doc.label}
                                      </p>
                                      {doc.url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={doc.url || "/placeholder.svg"}
                                          alt={`Document ${doc.label}`}
                                          className="w-full h-32 object-cover mt-1"
                                        />
                                      ) : (
                                        <div className="w-full h-32 flex items-center justify-center text-slate-600">
                                          <AlertCircle className="h-6 w-6" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                <Input
                                  value={kycReason}
                                  onChange={(e) => setKycReason(e.target.value)}
                                  placeholder="Motif (obligatoire en cas de rejet)"
                                  className="bg-slate-800/50 border-white/10 text-white text-sm mb-3"
                                />

                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
                                    disabled={processingId === u.id}
                                    onClick={() => handleKycDecision(u.id, "APPROVED")}
                                  >
                                    {processingId === u.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                    )}
                                    Approuver
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex-1"
                                    disabled={processingId === u.id || !kycReason.trim()}
                                    onClick={() => handleKycDecision(u.id, "REJECTED")}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Rejeter
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
