"use client";

import { useState } from "react";
import useSWR from "swr";
import { AgentSidebar } from "@/components/hub/AgentSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  RefreshCw,
  Menu,
  X,
  FileBarChart,
  Wallet,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AgentReportsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [period, setPeriod] = useState("30d");

  const { data, isLoading, mutate } = useSWR("/api/agent/dashboard", fetcher);

  const floatBalance = data?.floatBalance || 0;
  const dailyVolume = data?.dailyVolume || 0;
  const weeklyGrowth = data?.weeklyGrowth || 0;
  const dailyEarnings = data?.dailyEarnings || { pi: 0, xaf: 0 };
  const todayTransactionsCount = data?.todayTransactionsCount || 0;

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
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Rapports</h1>
            <p className="text-sm text-slate-500 mt-1">Analysez vos performances et telechargez vos rapports</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-white/10 text-white text-xs font-bold">
                <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
                <SelectItem value="90d">90 jours</SelectItem>
                <SelectItem value="1y">1 an</SelectItem>
              </SelectContent>
            </Select>
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
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transactions</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-2 bg-slate-700" />
                  ) : (
                    <p className="text-2xl font-black text-white mt-2">{todayTransactionsCount}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">Aujourd&apos;hui</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Volume</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-2 bg-slate-700" />
                  ) : (
                    <p className="text-2xl font-black text-white mt-2">{dailyVolume.toLocaleString()}</p>
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
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Commissions</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-2 bg-slate-700" />
                  ) : (
                    <p className="text-2xl font-black text-white mt-2">{dailyEarnings.xaf.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">XAF aujourd&apos;hui</p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-2xl">
                  <PieChart className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Croissance</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-2 bg-slate-700" />
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      <p className={`text-2xl font-black ${weeklyGrowth >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {weeklyGrowth >= 0 ? "+" : ""}{weeklyGrowth}%
                      </p>
                      {weeklyGrowth >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1">Cette semaine</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Downloadable Reports */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              Rapports disponibles
            </CardTitle>
            <CardDescription className="text-slate-500">
              Telechargez vos rapports detailles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl">
                    <FileBarChart className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">Rapport de transactions</h3>
                    <p className="text-sm text-slate-500 mt-1">Toutes les transactions avec details</p>
                    <Button size="sm" variant="outline" className="mt-3 border-white/10 text-white">
                      <Download className="h-4 w-4 mr-2" />
                      Telecharger PDF
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-blue-500/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <PieChart className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">Rapport de commissions</h3>
                    <p className="text-sm text-slate-500 mt-1">Details de vos gains et commissions</p>
                    <Button size="sm" variant="outline" className="mt-3 border-white/10 text-white">
                      <Download className="h-4 w-4 mr-2" />
                      Telecharger PDF
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-amber-500/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">Rapport de performance</h3>
                    <p className="text-sm text-slate-500 mt-1">Analyse de vos performances</p>
                    <Button size="sm" variant="outline" className="mt-3 border-white/10 text-white">
                      <Download className="h-4 w-4 mr-2" />
                      Telecharger PDF
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-purple-500/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <FileText className="h-6 w-6 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">Releve de compte</h3>
                    <p className="text-sm text-slate-500 mt-1">Releve detaille de votre compte</p>
                    <Button size="sm" variant="outline" className="mt-3 border-white/10 text-white">
                      <Download className="h-4 w-4 mr-2" />
                      Telecharger PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
