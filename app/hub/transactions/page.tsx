"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import useSWR from "swr";
import { AgentSidebar } from "@/components/hub/AgentSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Menu,
  X,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AgentTransactionsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data, error, isLoading, mutate } = useSWR(
    "/api/agent/dashboard",
    fetcher
  );

  const transactions = data?.recentTransactions || [];

  const filteredTransactions = transactions.filter((tx: any) => {
    const matchesSearch = tx.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || tx.type === filterType;
    const matchesStatus = filterStatus === "all" || tx.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Reussi
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case "issue":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-bold">
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
      <main className="flex-1 lg:ml-64 p-3 sm:p-4 lg:p-8 min-w-0 overflow-x-hidden">
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
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Transactions</h1>
            <p className="text-sm text-slate-500 mt-1">Historique de toutes vos operations cash-in et cash-out</p>
          </div>
          <div className="flex items-center gap-3">
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

        {/* Filters */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Rechercher par client ou reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-white/10 text-white"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full lg:w-40 bg-slate-800/50 border-white/10 text-white">
                  <Filter className="h-4 w-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="cash-in">Cash-In</SelectItem>
                  <SelectItem value="cash-out">Cash-Out</SelectItem>
                  <SelectItem value="transfer">Transfert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-40 bg-slate-800/50 border-white/10 text-white">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="success">Reussi</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="issue">Probleme</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white">
              Historique des transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full bg-slate-800" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <ArrowRightLeft className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Aucune transaction trouvee</p>
              </div>
            ) : (
              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <div className="min-w-[580px] px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-slate-400 font-bold text-xs whitespace-nowrap">Type</TableHead>
                        <TableHead className="text-slate-400 font-bold text-xs whitespace-nowrap">Client</TableHead>
                        <TableHead className="text-slate-400 font-bold text-xs whitespace-nowrap">Reference</TableHead>
                        <TableHead className="text-slate-400 font-bold text-xs whitespace-nowrap">Montant</TableHead>
                        <TableHead className="text-slate-400 font-bold text-xs whitespace-nowrap">Statut</TableHead>
                        <TableHead className="text-slate-400 font-bold text-xs whitespace-nowrap">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((tx: any) => (
                        <TableRow key={tx.id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-xl bg-slate-800 shrink-0">
                                {getTypeIcon(tx.type)}
                              </div>
                              <span className="text-white text-xs font-medium capitalize whitespace-nowrap">
                                {tx.type.replace("-", " ")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-white font-medium text-xs whitespace-nowrap py-3">{tx.customer}</TableCell>
                          <TableCell className="text-slate-400 font-mono text-[11px] py-3">{tx.reference}</TableCell>
                          <TableCell className={`font-bold text-xs whitespace-nowrap py-3 ${tx.type === "cash-in" ? "text-emerald-500" : "text-white"}`}>
                            {tx.type === "cash-in" ? "+" : "-"}{tx.amount.toLocaleString()} {tx.currency}
                          </TableCell>
                          <TableCell className="py-3">{getStatusBadge(tx.status)}</TableCell>
                          <TableCell className="text-slate-400 text-xs whitespace-nowrap py-3">{tx.timestamp}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
