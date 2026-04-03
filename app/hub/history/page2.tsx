"use client";

import { useState } from "react";
import useSWR from "swr";
import { AgentSidebar } from "@/components/hub/AgentSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Calendar,
  RefreshCw,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Menu,
  X,
  User,
  Hash,
  Banknote,
  CalendarDays,
  FileText,
  Copy,
  CheckCheck,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Transaction {
  id: string;
  type: "cash-in" | "cash-out" | "transfer";
  amount: number;
  currency: string;
  status: "success" | "pending" | "issue";
  customer: string;
  timestamp: string;
  reference: string;
  source?: string;
}

export default function AgentHistoryPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [period, setPeriod] = useState("7d");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, mutate } = useSWR("/api/agent/dashboard", fetcher);

  // Filter to only show hub transactions (transactions initiated by the agent)
  const allTransactions = data?.recentTransactions || [];
  const transactions = allTransactions.filter((tx: Transaction) => 
    tx.source === "hub" || tx.type === "cash-in" || tx.type === "cash-out"
  );

  const handleCopyReference = (reference: string) => {
    navigator.clipboard.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Reussi
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case "issue":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Probleme
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "cash-in":
        return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />;
      case "cash-out":
        return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
      default:
        return <ArrowRightLeft className="h-4 w-4 text-slate-500" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "cash-in":
        return "Depot";
      case "cash-out":
        return "Retrait";
      default:
        return "Transfert";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "cash-in":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "cash-out":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
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

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white w-[calc(100%-2rem)] max-w-md mx-auto rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              Details de la transaction
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 mt-4">
              {/* Type Badge */}
              <div className="flex justify-center">
                <Badge className={`${getTypeColor(selectedTransaction.type)} text-sm font-bold px-4 py-2`}>
                  {getTypeIcon(selectedTransaction.type)}
                  <span className="ml-2">{getTypeName(selectedTransaction.type)}</span>
                </Badge>
              </div>

              {/* Amount */}
              <div className="text-center py-4 bg-slate-800/50 rounded-2xl mx-1">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Montant</p>
                <p className={`text-2xl sm:text-3xl font-black ${selectedTransaction.type === "cash-in" ? "text-emerald-500" : "text-white"}`}>
                  {selectedTransaction.type === "cash-in" ? "+" : "-"}
                  {selectedTransaction.amount.toLocaleString()} {selectedTransaction.currency}
                </p>
              </div>

              {/* Details Grid */}
              <div className="space-y-2 sm:space-y-3">
                {/* Client */}
                <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl mx-1">
                  <div className="flex items-center gap-2 text-slate-400 min-w-0">
                    <User className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold uppercase">Client</span>
                  </div>
                  <span className="text-white font-bold text-sm">{selectedTransaction.customer}</span>
                </div>

                {/* Reference */}
                <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl mx-1">
                  <div className="flex items-center gap-2 text-slate-400 min-w-0">
                    <Hash className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold uppercase">Reference</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-white font-mono text-xs sm:text-sm">{selectedTransaction.reference}</span>
                    <button 
                      onClick={() => handleCopyReference(selectedTransaction.reference)}
                      className="p-1 hover:bg-white/10 rounded shrink-0"
                    >
                      {copied ? (
                        <CheckCheck className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Date/Time */}
                <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl mx-1">
                  <div className="flex items-center gap-2 text-slate-400 min-w-0">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold uppercase">Date & Heure</span>
                  </div>
                  <span className="text-white font-bold text-sm">{selectedTransaction.timestamp}</span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl mx-1">
                  <div className="flex items-center gap-2 text-slate-400 min-w-0">
                    <Banknote className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold uppercase">Statut</span>
                  </div>
                  {getStatusBadge(selectedTransaction.status)}
                </div>

                {/* Source */}
                <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl mx-1">
                  <div className="flex items-center gap-2 text-slate-400 min-w-0">
                    <History className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold uppercase">Source</span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs font-bold">
                    PimPay Hub
                  </Badge>
                </div>
              </div>

              {/* Close Button */}
              <Button 
                onClick={() => setSelectedTransaction(null)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold mt-4 mx-1"
                style={{ width: 'calc(100% - 0.5rem)' }}
              >
                Fermer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 px-4 py-3 sm:p-4 lg:p-8 min-w-0 overflow-x-hidden">
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
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Historique Hub</h1>
            <p className="text-sm text-slate-500 mt-1">Historique des transactions effectuees via le Hub</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-white/10 text-white text-xs font-bold">
                <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
                <SelectItem value="90d">90 jours</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-slate-900/50 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
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

        {/* Info Badge */}
        <div className="mb-5">
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs font-bold">
            <History className="h-3 w-3 mr-1" />
            Affichage: Transactions Hub uniquement (Cash-In/Cash-Out)
          </Badge>
        </div>

        {/* Activity Timeline */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-500" />
              Activites recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full bg-slate-800" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Aucune activite Hub recente</p>
                <p className="text-slate-600 text-sm mt-1">Les transactions effectuees via le Hub apparaitront ici</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-white/10" />
                <div className="space-y-4 sm:space-y-6">
                  {transactions.map((tx: Transaction) => (
                    <div 
                      key={tx.id} 
                      className="relative flex gap-3 sm:gap-4 pl-8 sm:pl-12 cursor-pointer group"
                      onClick={() => setSelectedTransaction(tx)}
                    >
                      <div className="absolute left-2 sm:left-4 top-2 w-4 h-4 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="flex-1 p-3 sm:p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-colors border border-transparent hover:border-emerald-500/20">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="p-1.5 sm:p-2 rounded-xl bg-slate-700 group-hover:bg-slate-600 transition-colors shrink-0">
                              {getTypeIcon(tx.type)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-bold text-sm sm:text-base">
                                {getTypeName(tx.type)}
                              </p>
                              <p className="text-xs sm:text-sm text-slate-400 truncate">{tx.customer}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-bold text-sm sm:text-base ${tx.type === "cash-in" ? "text-emerald-500" : "text-white"}`}>
                              {tx.type === "cash-in" ? "+" : "-"}{tx.amount.toLocaleString()} {tx.currency}
                            </p>
                            <p className="text-[10px] sm:text-xs text-slate-500">{tx.timestamp}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/5 gap-2">
                          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <span className="text-[10px] sm:text-xs text-slate-500 font-mono truncate">{tx.reference}</span>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] sm:text-[9px] font-bold shrink-0">
                              HUB
                            </Badge>
                          </div>
                          <div className="shrink-0">
                            {getStatusBadge(tx.status)}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          Cliquez pour voir les details
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
