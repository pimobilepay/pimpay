"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import useSWR from "swr";
import { AgentSidebar } from "@/components/hub/AgentSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  PiggyBank,
  Menu,
  X,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AgentFloatPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data, isLoading, mutate } = useSWR("/api/agent/dashboard", fetcher);

  const floatBalance = data?.floatBalance || 0;
  const liquidityHealth = data?.liquidityHealth || 0;
  const dailyVolume = data?.dailyVolume || 0;

  const getHealthStatus = () => {
    if (liquidityHealth >= 80) return { label: "Excellent", color: "text-emerald-500", bg: "bg-emerald-500" };
    if (liquidityHealth >= 50) return { label: "Moyen", color: "text-amber-500", bg: "bg-amber-500" };
    return { label: "Critique", color: "text-red-500", bg: "bg-red-500" };
  };

  const healthStatus = getHealthStatus();

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
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Float & Liquidite</h1>
            <p className="text-sm text-slate-500 mt-1">Gerez votre solde flottant et votre liquidite</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="border-white/10 bg-slate-900/50"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 text-slate-400 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Float Balance */}
          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-500/30 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-300/70 uppercase tracking-wider">Float Balance</p>
                  {isLoading ? (
                    <Skeleton className="h-10 w-40 mt-2 bg-emerald-500/20" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-2">
                      {floatBalance.toLocaleString()} XAF
                    </p>
                  )}
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                  <Wallet className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liquidity Health */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sante Liquidite</p>
                  <div className="flex items-center gap-2 mt-2">
                    {isLoading ? (
                      <Skeleton className="h-8 w-20 bg-slate-700" />
                    ) : (
                      <>
                        <p className={`text-2xl font-black ${healthStatus.color}`}>{liquidityHealth}%</p>
                        <Badge className={`${healthStatus.bg}/10 ${healthStatus.color} border-none`}>
                          {healthStatus.label}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-slate-800 rounded-2xl">
                  {liquidityHealth >= 80 ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : liquidityHealth >= 50 ? (
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  )}
                </div>
              </div>
              <Progress value={liquidityHealth} className="h-2" />
            </CardContent>
          </Card>

          {/* Daily Volume */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Volume Journalier</p>
                  {isLoading ? (
                    <Skeleton className="h-10 w-32 mt-2 bg-slate-700" />
                  ) : (
                    <p className="text-3xl font-black text-white mt-2">
                      {dailyVolume.toLocaleString()} XAF
                    </p>
                  )}
                </div>
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
                Recharger Float
              </CardTitle>
              <CardDescription className="text-slate-500">
                Augmentez votre solde flottant pour continuer les operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                <PiggyBank className="h-4 w-4 mr-2" />
                Demander un rechargement
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-blue-500" />
                Retirer des fonds
              </CardTitle>
              <CardDescription className="text-slate-500">
                Transferez vos commissions vers votre compte bancaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-white/10 text-white">
                <Wallet className="h-4 w-4 mr-2" />
                Retirer vers banque
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white">Conseils de gestion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Maintenez une liquidite superieure a 80%</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Cela vous permettra de traiter toutes les demandes de retrait sans interruption.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Analysez vos patterns de transactions</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Identifiez les heures de pointe pour anticiper vos besoins en liquidite.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
