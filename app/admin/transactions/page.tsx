"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle, XCircle, Search, RefreshCw,
  Clock, Hash, Phone, Globe, ArrowLeft,
  Calendar, Smartphone, Banknote, ShieldCheck,
  Copy, TrendingUp, Loader2, X
} from 'lucide-react';
import { toast } from 'sonner';

const PI_GCV_PRICE = 314159;

function resolveUserName(user?: { firstName?: string; lastName?: string; username?: string; email?: string }): { displayName: string; subLabel: string } {
  if (!user) return { displayName: "Utilisateur Inconnu", subLabel: "" };
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  if (fullName) return { displayName: fullName, subLabel: user.username ? `@${user.username}` : (user.email || "") };
  if (user.username) return { displayName: `@${user.username}`, subLabel: user.email || "" };
  if (user.email) return { displayName: user.email, subLabel: "" };
  return { displayName: "Utilisateur PimPay", subLabel: "" };
}

interface TransactionUser {
  firstName: string;
  lastName: string;
  username?: string;
  email?: string;
}

interface Transaction {
  id: string;
  userId: string;
  fromUser?: TransactionUser;
  toUser?: TransactionUser;
  amount: number;
  currency: string;
  type: string;
  status: string;
  createdAt: string;
  description?: string;
  accountNumber?: string;
  isBlockchainWithdraw?: boolean;
  isMobileWithdraw?: boolean;
  isBankWithdraw?: boolean;
  method?: string;
  blockchainTx?: string;
  fee?: number;
}

function TransactionDetailView({ tx, onClose, onApprove, onReject, isProcessing }: { 
  tx: Transaction; 
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
}) {
  const isPi = tx.currency === "PI" || !tx.currency;
  const amountPI = isPi ? tx.amount : tx.amount / PI_GCV_PRICE;
  const amountUSD = isPi ? (amountPI * PI_GCV_PRICE) : tx.amount;
  const feePI = tx.fee || (amountPI * 0.01);

  const isSuccess = tx.status === "SUCCESS";
  const isPending = tx.status === "PENDING";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copie`);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#020617] rounded-t-[2rem] sm:rounded-[2rem] max-h-[90vh] overflow-y-auto border border-white/10 animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-sm font-black uppercase tracking-tight text-white">Details Transaction</h2>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Header */}
        <div className={`py-4 px-6 flex items-center justify-between ${
          isSuccess ? "bg-emerald-500/10" : isPending ? "bg-amber-500/10" : "bg-red-500/10"
        }`}>
          <div className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle size={16} className="text-emerald-500" />
            ) : isPending ? (
              <Clock size={16} className="text-amber-500" />
            ) : (
              <XCircle size={16} className="text-red-500" />
            )}
            <span className={`text-[10px] font-black uppercase tracking-widest ${
              isSuccess ? "text-emerald-500" : isPending ? "text-amber-500" : "text-red-500"
            }`}>
              {tx.status}
            </span>
          </div>
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{tx.type}</span>
        </div>

        <div className="p-6 space-y-6">
          {/* Amount */}
          <div className="flex flex-col items-center text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Valeur Transactionnelle</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">
                {amountPI < 0.0001 && amountPI > 0 
                  ? amountPI.toFixed(8) 
                  : amountPI.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}
              </span>
              <span className="text-lg font-bold text-blue-500">PI</span>
            </div>
            <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
              <TrendingUp size={12} className="text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400">
                {'\u2248'} ${amountUSD.toLocaleString()} USD (GCV)
              </span>
            </div>
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
              icon={<Calendar size={16} />} 
              label="Date" 
              value={new Date(tx.createdAt).toLocaleString("fr-FR")}
            />
            <DetailRow 
              icon={<Smartphone size={16} />} 
              label="Methode" 
              value={tx.description || tx.method || "Pi Wallet"}
            />
            <DetailRow 
              icon={<Banknote size={16} />} 
              label="Frais Reseau" 
              value={`${feePI.toFixed(4)} PI`}
              valueClassName="text-red-400"
            />
            {tx.accountNumber && (
              <DetailRow 
                icon={tx.isBlockchainWithdraw ? <Globe size={16} /> : tx.isBankWithdraw ? <Hash size={16} /> : <Phone size={16} />} 
                label={tx.isBlockchainWithdraw ? "Adresse Blockchain" : tx.isBankWithdraw ? "IBAN / Compte" : "Telephone Beneficiaire"}
                value={tx.accountNumber.length > 20 ? tx.accountNumber.slice(0, 20) + "..." : tx.accountNumber}
                onCopy={() => copyToClipboard(tx.accountNumber || "", tx.isBlockchainWithdraw ? "Adresse" : "Compte")}
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
            {/* Client Info */}
            {(() => {
              const { displayName, subLabel } = resolveUserName(tx.fromUser || tx.toUser);
              return (
                <>
                  <DetailRow 
                    icon={<Smartphone size={16} />} 
                    label="Client" 
                    value={displayName}
                  />
                  {subLabel && (
                    <DetailRow
                      icon={<Hash size={16} />}
                      label="Identifiant"
                      value={subLabel}
                    />
                  )}
                </>
              );
            })()}
          </div>

          {/* Action Buttons */}
          {tx.status === "PENDING" && (
            <div className="flex gap-3 pt-6 border-t border-white/5">
              <button
                onClick={() => onReject(tx.id)}
                disabled={isProcessing}
                className="flex-1 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={18} />}
                Rejeter
              </button>
              <button
                onClick={() => onApprove(tx.id)}
                disabled={isProcessing}
                className="flex-1 h-14 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={18} />}
                Approuver
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white/[0.02] py-4 text-center border-t border-white/5">
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em]">PimPay Admin Console</p>
        </div>
      </div>
    </div>
  );
}

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

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/transactions');
      if (!response.ok) throw new Error("Erreur de connexion");
      
      const data = await response.json();
      const transactionsArray = Array.isArray(data) ? data : (data.transactions || []);

      setTransactions(transactionsArray.filter((t: Transaction) => t.status === 'PENDING'));
    } catch (error) {
      toast.error("PimPay : Impossible de charger les flux");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`Confirmer la ${action === 'approve' ? 'validation' : 'rejection'} ?`)) return;

    setIsProcessing(id);
    try {
      const response = await fetch(`/api/admin/transactions/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id, action }),
      });

      const result = await response.json();

      if (response.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        setSelectedTx(null);
        toast.success(`Flux ${action === 'approve' ? 'valide' : 'rejete'} avec succes`);
      } else {
        toast.error(result.error || "Echec de l'operation");
      }
    } catch (error) {
      toast.error("Erreur de communication avec le serveur PimPay");
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const searchLower = filter.toLowerCase();
    const user = t.fromUser || t.toUser;
    const { displayName, subLabel } = resolveUserName(user);
    return (
      displayName.toLowerCase().includes(searchLower) ||
      subLabel.toLowerCase().includes(searchLower) ||
      t.id.toLowerCase().includes(searchLower) ||
      (t.accountNumber && t.accountNumber.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
            <button onClick={() => router.push("/admin")} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
              <ArrowLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
              <h1 className="text-sm font-black text-white uppercase tracking-wider">Transactions</h1>
            </div>
            <button onClick={fetchTransactions} disabled={loading} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="p-6">

        {/* SEARCH */}
        <div className="mb-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input
            type="text"
            placeholder="Rechercher un flux critique..."
            className="w-full bg-white/5 border border-white/10 rounded-[20px] py-4 pl-12 pr-6 text-sm outline-none focus:border-blue-500/50 transition-all"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* TABLE */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500">Reference</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500">Client</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500">Montant</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500">Type / Compte</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500">Date</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500 text-center">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={6} className="p-20 text-center font-black uppercase text-[10px] text-slate-600">Initialisation du scan...</td></tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr><td colSpan={6} className="p-20 text-center font-black uppercase text-[10px] text-slate-600">Aucune anomalie detectee</td></tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-blue-600/[0.03] transition-colors cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <Hash size={14} className="text-blue-500" />
                          <span className="font-black text-xs uppercase">{tx.id.slice(-8)}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        {(() => {
                          const { displayName, subLabel } = resolveUserName(tx.fromUser || tx.toUser);
                          return (
                            <>
                              <div className="font-bold text-sm">{displayName}</div>
                              <div className="text-[9px] text-slate-500 font-mono italic">{subLabel || tx.userId.slice(-10)}</div>
                            </>
                          );
                        })()}
                      </td>
                      <td className="p-6">
                        <span className="font-black text-blue-400">{typeof tx.amount === 'number' ? (tx.amount < 0.01 && tx.amount > 0 ? tx.amount.toFixed(8) : tx.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 8 })) : tx.amount}</span>
                        <span className="ml-1 text-[10px] text-slate-500">{tx.currency}</span>
                      </td>
                      <td className="p-6">
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${
                          tx.isBlockchainWithdraw 
                            ? 'text-blue-400' 
                            : tx.isBankWithdraw 
                              ? 'text-indigo-400'
                              : 'text-amber-500'
                        }`}>
                          {tx.isBlockchainWithdraw ? (
                            <Globe size={12} />
                          ) : tx.isBankWithdraw ? (
                            <Hash size={12} />
                          ) : (
                            <Phone size={12} />
                          )}
                          {tx.type} {tx.isBlockchainWithdraw ? `(${tx.method || tx.currency})` : tx.method ? `(${tx.method})` : ''}
                        </div>
                        <p className={`text-[9px] mt-1 font-mono ${
                          tx.isBlockchainWithdraw 
                            ? 'text-blue-300/70' 
                            : tx.isBankWithdraw 
                              ? 'text-indigo-300/70'
                              : 'text-amber-400/70'
                        } break-all max-w-[200px]`}>
                          {tx.isBlockchainWithdraw 
                            ? (tx.accountNumber?.startsWith('G') || tx.accountNumber?.startsWith('0x') 
                                ? `${tx.accountNumber.slice(0, 8)}...${tx.accountNumber.slice(-6)}` 
                                : tx.accountNumber || 'Adresse Blockchain')
                            : tx.accountNumber || 'Non spécifié'}
                        </p>
                      </td>
                      <td className="p-6">
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </div>
                        <div className="text-[9px] text-slate-600 font-mono">
                          {new Date(tx.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleAction(tx.id, 'reject')}
                            disabled={!!isProcessing}
                            className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <XCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleAction(tx.id, 'approve')}
                            disabled={!!isProcessing}
                            className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            <CheckCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <TransactionDetailView 
          tx={selectedTx} 
          onClose={() => setSelectedTx(null)}
          onApprove={(id) => handleAction(id, 'approve')}
          onReject={(id) => handleAction(id, 'reject')}
          isProcessing={!!isProcessing}
        />
      )}
    </div>
  );
}
