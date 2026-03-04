"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Search, RefreshCw, Loader2, ArrowUpRight, ArrowDownLeft,
  Hash, Calendar, Smartphone, Banknote, ShieldCheck, Copy,
  TrendingUp, X, Globe, Phone, Clock, Filter, ChevronLeft, ChevronRight,
  ArrowRightLeft, CreditCard, Gift, Repeat, Zap
} from "lucide-react";
import { toast } from "sonner";

const PI_GCV_PRICE = 314159;

// --- TYPES ---
interface TxUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
}

interface Transaction {
  id: string;
  reference: string;
  externalId: string | null;
  blockchainTx: string | null;
  amount: number;
  fee: number;
  netAmount: number | null;
  currency: string;
  destCurrency: string | null;
  type: string;
  status: string;
  description: string | null;
  note: string | null;
  accountNumber: string | null;
  accountName: string | null;
  isBlockchainWithdraw: boolean;
  method: string;
  countryCode: string | null;
  createdAt: string;
  fromUser: TxUser | null;
  toUser: TxUser | null;
  fromUserId: string | null;
  toUserId: string | null;
}

// --- HELPERS ---
const typeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  DEPOSIT: { icon: ArrowDownLeft, color: "text-emerald-400", bgColor: "bg-emerald-500/10", label: "Depot" },
  WITHDRAW: { icon: ArrowUpRight, color: "text-orange-400", bgColor: "bg-orange-500/10", label: "Retrait" },
  TRANSFER: { icon: ArrowRightLeft, color: "text-blue-400", bgColor: "bg-blue-500/10", label: "Transfert" },
  PAYMENT: { icon: CreditCard, color: "text-violet-400", bgColor: "bg-violet-500/10", label: "Paiement" },
  EXCHANGE: { icon: Repeat, color: "text-cyan-400", bgColor: "bg-cyan-500/10", label: "Echange" },
  STAKING_REWARD: { icon: TrendingUp, color: "text-amber-400", bgColor: "bg-amber-500/10", label: "Staking" },
  AIRDROP: { icon: Gift, color: "text-pink-400", bgColor: "bg-pink-500/10", label: "Airdrop" },
  CARD_PURCHASE: { icon: CreditCard, color: "text-indigo-400", bgColor: "bg-indigo-500/10", label: "Achat Carte" },
};

const statusConfig: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  SUCCESS: { color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  PENDING: { color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20" },
  FAILED: { color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/20" },
  CANCELLED: { color: "text-slate-400", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/20" },
};

function getTypeInfo(type: string) {
  return typeConfig[type] || { icon: Zap, color: "text-slate-400", bgColor: "bg-slate-500/10", label: type };
}

function getStatusInfo(status: string) {
  return statusConfig[status] || { color: "text-slate-400", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/20" };
}

function getUserName(tx: Transaction): string {
  const user = tx.fromUser || tx.toUser;
  if (!user) return "Utilisateur";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.username || user.email || "Utilisateur";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- DETAIL ROW COMPONENT ---
function DetailRow({ icon, label, value, onCopy, copyable, valueClassName }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy?: () => void;
  copyable?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between items-center group">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-white/5 rounded-xl text-blue-500 group-hover:bg-blue-500/10 transition-colors">
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-center gap-2" onClick={copyable ? onCopy : undefined}>
        <span className={`text-[11px] font-bold ${valueClassName || "text-white"} ${copyable ? "cursor-pointer" : ""}`}>
          {value}
        </span>
        {copyable && <Copy size={12} className="text-slate-600 hover:text-blue-400 transition-colors cursor-pointer" />}
      </div>
    </div>
  );
}

// --- DETAIL MODAL ---
function TransactionDetailModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const isPi = tx.currency === "PI" || !tx.currency;
  const amountPI = isPi ? tx.amount : tx.amount / PI_GCV_PRICE;
  const amountUSD = isPi ? (amountPI * PI_GCV_PRICE) : tx.amount;
  const feeAmount = tx.fee || 0;
  const typeInfo = getTypeInfo(tx.type);
  const statusInfo = getStatusInfo(tx.status);
  const TypeIcon = typeInfo.icon;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copie`);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#020617] rounded-t-[2rem] sm:rounded-[2rem] max-h-[90vh] overflow-y-auto border border-white/10" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${typeInfo.bgColor}`}>
              <TypeIcon size={18} className={typeInfo.color} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-white">{typeInfo.label}</h2>
              <p className="text-[9px] text-slate-500 font-bold mt-0.5">REF-{tx.reference?.slice(0, 10).toUpperCase() || tx.id.slice(0, 10).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all active:scale-90">
            <X size={18} />
          </button>
        </div>

        {/* Status Bar */}
        <div className={`py-3 px-6 flex items-center justify-between ${statusInfo.bgColor}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${tx.status === "PENDING" ? "animate-pulse" : ""} ${
              tx.status === "SUCCESS" ? "bg-emerald-400" : tx.status === "PENDING" ? "bg-amber-400" : tx.status === "FAILED" ? "bg-red-400" : "bg-slate-400"
            }`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${statusInfo.color}`}>
              {tx.status}
            </span>
          </div>
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{formatShortDate(tx.createdAt)}</span>
        </div>

        <div className="p-6 space-y-6">
          {/* Amount */}
          <div className="flex flex-col items-center text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Montant</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">
                {tx.amount < 0.01 && tx.amount > 0
                  ? tx.amount.toFixed(8)
                  : tx.amount.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}
              </span>
              <span className="text-lg font-bold text-blue-500">{tx.currency || "PI"}</span>
            </div>
            {isPi && (
              <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                <TrendingUp size={12} className="text-blue-400" />
                <span className="text-[10px] font-bold text-blue-400">
                  {"\u2248"} ${amountUSD.toLocaleString()} USD (GCV)
                </span>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <DetailRow
              icon={<Hash size={16} />}
              label="ID Transaction"
              value={tx.id.length > 18 ? tx.id.slice(0, 18) + "..." : tx.id}
              onCopy={() => copyToClipboard(tx.id, "ID")}
              copyable
            />
            <DetailRow
              icon={<Hash size={16} />}
              label="Reference"
              value={tx.reference?.length > 18 ? tx.reference.slice(0, 18) + "..." : tx.reference || "N/A"}
              onCopy={() => copyToClipboard(tx.reference || "", "Reference")}
              copyable
            />
            <DetailRow
              icon={<Calendar size={16} />}
              label="Date"
              value={new Date(tx.createdAt).toLocaleString("fr-FR")}
            />
            <DetailRow
              icon={<Smartphone size={16} />}
              label="Methode"
              value={tx.method || tx.description || "Pi Wallet"}
            />
            {feeAmount > 0 && (
              <DetailRow
                icon={<Banknote size={16} />}
                label="Frais"
                value={`${feeAmount.toFixed(4)} ${tx.currency || "PI"}`}
                valueClassName="text-red-400"
              />
            )}
            {tx.netAmount && (
              <DetailRow
                icon={<Banknote size={16} />}
                label="Montant Net"
                value={`${tx.netAmount.toFixed(4)} ${tx.currency || "PI"}`}
                valueClassName="text-emerald-400"
              />
            )}
            {tx.accountNumber && (
              <DetailRow
                icon={tx.isBlockchainWithdraw ? <Globe size={16} /> : <Phone size={16} />}
                label="Compte / Adresse"
                value={tx.accountNumber.length > 20 ? tx.accountNumber.slice(0, 20) + "..." : tx.accountNumber}
                onCopy={() => copyToClipboard(tx.accountNumber || "", "Adresse")}
                copyable
              />
            )}
            {tx.blockchainTx && (
              <DetailRow
                icon={<ShieldCheck size={16} />}
                label="Blockchain Hash"
                value={tx.blockchainTx.slice(0, 12) + "..."}
                onCopy={() => copyToClipboard(tx.blockchainTx || "", "Hash")}
                copyable
                valueClassName="text-blue-400 font-mono"
              />
            )}
            {tx.description && (
              <DetailRow
                icon={<Smartphone size={16} />}
                label="Description"
                value={tx.description.length > 30 ? tx.description.slice(0, 30) + "..." : tx.description}
              />
            )}
          </div>

          {/* Users */}
          <div className="border-t border-white/5 pt-6 space-y-4">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[3px]">Participants</p>
            {tx.fromUser && (
              <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 text-[10px] font-black uppercase">
                  {tx.fromUser.firstName?.[0] || tx.fromUser.username?.[0] || "?"}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expediteur</p>
                  <p className="text-xs font-black text-white">
                    {`${tx.fromUser.firstName || ""} ${tx.fromUser.lastName || ""}`.trim() || tx.fromUser.username || "N/A"}
                  </p>
                  <p className="text-[9px] text-slate-600 font-mono">{tx.fromUser.email || tx.fromUser.phone || ""}</p>
                </div>
              </div>
            )}
            {tx.toUser && (
              <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-[10px] font-black uppercase">
                  {tx.toUser.firstName?.[0] || tx.toUser.username?.[0] || "?"}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Destinataire</p>
                  <p className="text-xs font-black text-white">
                    {`${tx.toUser.firstName || ""} ${tx.toUser.lastName || ""}`.trim() || tx.toUser.username || "N/A"}
                  </p>
                  <p className="text-[9px] text-slate-600 font-mono">{tx.toUser.email || tx.toUser.phone || ""}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/[0.02] py-4 text-center border-t border-white/5">
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em]">PimPay Admin Console</p>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function AdminHistoriquePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "30");
      if (search) params.set("search", search);
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/admin/history?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur API");
      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error("Impossible de charger l'historique");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterType, filterStatus]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  const transactionTypes = [
    { value: "", label: "Tous types" },
    { value: "DEPOSIT", label: "Depot" },
    { value: "WITHDRAW", label: "Retrait" },
    { value: "TRANSFER", label: "Transfert" },
    { value: "PAYMENT", label: "Paiement" },
    { value: "EXCHANGE", label: "Echange" },
    { value: "AIRDROP", label: "Airdrop" },
    { value: "STAKING_REWARD", label: "Staking" },
  ];

  const transactionStatuses = [
    { value: "", label: "Tous statuts" },
    { value: "SUCCESS", label: "Succes" },
    { value: "PENDING", label: "En attente" },
    { value: "FAILED", label: "Echoue" },
    { value: "CANCELLED", label: "Annule" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button onClick={() => router.push("/admin")} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Historique</h1>
          </div>
          <button onClick={fetchHistory} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-4 space-y-4">

        {/* Total counter */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {total.toLocaleString("fr-FR")} transactions
          </p>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              showFilters || filterType || filterStatus
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-slate-400"
            }`}
          >
            <Filter size={12} />
            Filtres
            {(filterType || filterStatus) && (
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, reference..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full h-12 bg-slate-900/50 border border-white/5 rounded-2xl pl-11 pr-4 text-sm font-bold text-white outline-none focus:border-blue-500/50 placeholder:text-slate-600 transition-all"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Type</p>
              <div className="flex flex-wrap gap-2">
                {transactionTypes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setFilterType(t.value); setPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                      filterType === t.value
                        ? "bg-blue-600 text-white"
                        : "bg-white/5 text-slate-500 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Statut</p>
              <div className="flex flex-wrap gap-2">
                {transactionStatuses.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { setFilterStatus(s.value); setPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                      filterStatus === s.value
                        ? "bg-blue-600 text-white"
                        : "bg-white/5 text-slate-500 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {(filterType || filterStatus) && (
              <button
                onClick={() => { setFilterType(""); setFilterStatus(""); setPage(1); }}
                className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-300 transition-colors"
              >
                Reinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {/* Transaction List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[5px]">Chargement...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-[2rem]">
            <Clock size={32} className="text-slate-700 mb-4" />
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Aucune transaction trouvee</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const typeInfo = getTypeInfo(tx.type);
              const statusInfo = getStatusInfo(tx.status);
              const TypeIcon = typeInfo.icon;
              const userName = getUserName(tx);

              return (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="w-full flex items-center gap-4 p-4 bg-slate-900/40 border border-white/5 rounded-2xl hover:bg-white/5 transition-all active:scale-[0.98] text-left"
                >
                  <div className={`p-2.5 rounded-xl ${typeInfo.bgColor} shrink-0`}>
                    <TypeIcon size={16} className={typeInfo.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-black text-white uppercase tracking-tight truncate">{userName}</p>
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}>
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 font-bold mt-0.5">
                      {typeInfo.label} - {formatShortDate(tx.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[12px] font-black ${
                      tx.type === "DEPOSIT" || tx.type === "AIRDROP" || tx.type === "STAKING_REWARD"
                        ? "text-emerald-400"
                        : tx.type === "WITHDRAW"
                          ? "text-orange-400"
                          : "text-white"
                    }`}>
                      {tx.type === "DEPOSIT" || tx.type === "AIRDROP" || tx.type === "STAKING_REWARD" ? "+" : tx.type === "WITHDRAW" ? "-" : ""}
                      {tx.amount < 0.01 && tx.amount > 0
                        ? tx.amount.toFixed(8)
                        : tx.amount.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}
                    </p>
                    <p className="text-[9px] font-bold text-slate-600">{tx.currency || "PI"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-white">{page}</span>
              <span className="text-[10px] font-black text-slate-600">/</span>
              <span className="text-[10px] font-black text-slate-500">{totalPages}</span>
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-90"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>
  );
}
