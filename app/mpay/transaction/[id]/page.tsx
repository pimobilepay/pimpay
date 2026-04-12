"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Share2,
  User,
  Wallet,
  Calendar,
  Hash,
  FileText,
  Loader2,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface TransactionDetails {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  currency: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  fromUserId: string;
  toUserId: string;
  fromUser?: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    displayName: string;
  };
  toUser?: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    displayName: string;
  };
  metadata?: {
    type?: string;
    businessName?: string;
    employeeName?: string;
    recipientName?: string;
    senderName?: string;
    blockchainTxHash?: string;
    memo?: string;
    [key: string]: any;
  };
}

export default function TransactionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const fetchTransaction = async () => {
      setLoading(true);
      try {
        // Fetch user profile to get userId
        const profileRes = await fetch("/api/user/profile");
        const profileData = await profileRes.json();
        if (profileData.success && profileData.user) {
          setUserId(profileData.user.id);
        }

        // Fetch transaction details
        const res = await fetch(`/api/transaction/details/${params.id}`);
        const data = await res.json();
        
        if (data.success && data.transaction) {
          setTransaction(data.transaction);
        } else if (data.error) {
          toast.error(data.error);
        }
      } catch (error) {
        console.error("Error fetching transaction:", error);
        toast.error("Erreur lors du chargement de la transaction");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchTransaction();
    }
  }, [params.id]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copie !`);
  };

  const shareTransaction = async () => {
    if (!transaction) return;
    
    const shareText = `Transaction PimPay\nReference: ${transaction.reference}\nMontant: ${transaction.amount} ${transaction.currency}\nStatut: ${transaction.status}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Transaction PimPay",
          text: shareText,
        });
      } catch {
        copyToClipboard(shareText, "Details de la transaction");
      }
    } else {
      copyToClipboard(shareText, "Details de la transaction");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-[#020617] text-white">
        <header className="px-6 pt-12 pb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-black uppercase tracking-tight">Transaction</h1>
          <div className="w-11" />
        </header>
        <div className="flex flex-col items-center justify-center py-20">
          <XCircle size={48} className="text-red-500 mb-4" />
          <p className="text-sm font-bold text-slate-400">Transaction introuvable</p>
          <button
            onClick={() => router.push("/mpay")}
            className="mt-6 px-6 py-3 bg-blue-600 rounded-2xl text-sm font-bold"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  const isSent = transaction.fromUserId === userId;
  const otherUser = isSent ? transaction.toUser : transaction.fromUser;
  const txType = transaction.type?.toUpperCase() || "";
  const ref = transaction.reference?.toUpperCase() || "";
  
  // Handle special transaction types for display name
  const getDisplayName = (): string => {
    // Handle CARD_PURCHASE transactions
    if (txType === "CARD_PURCHASE" || ref.startsWith("CARD-BUY") || ref.includes("CARD_PURCHASE")) {
      return "Achat Carte PimPay";
    }
    // Handle external withdrawals
    if (txType === "WITHDRAWAL" || ref.startsWith("WD-") || ref.includes("EXTERNAL")) {
      return "Retrait Externe";
    }
    // Handle deposits
    if (txType === "DEPOSIT") {
      return "Depot";
    }
    // Default: use user display name
    return otherUser?.displayName || otherUser?.name || otherUser?.username || "Utilisateur";
  };
  
  const displayName = getDisplayName();
  const statusLower = transaction.status.toLowerCase();

  const getStatusInfo = () => {
    switch (statusLower) {
      case "success":
        return { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Confirme" };
      case "pending":
        return { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", label: "En cours" };
      case "failed":
        return { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Echoue" };
      default:
        return { icon: Clock, color: "text-slate-400", bg: "bg-slate-500/10", label: transaction.status };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const getTypeLabel = () => {
    const type = transaction.type.toUpperCase();
    switch (type) {
      case "TRANSFER": return "Transfert";
      case "DEPOSIT": return "Depot";
      case "WITHDRAWAL": return "Retrait";
      case "PAYMENT": return "Paiement";
      case "SALARY": return "Salaire";
      case "CARD_PURCHASE": return "Achat Carte";
      default: return type;
    }
  };
  
  // Format amount with proper decimals
  const formatAmount = (amount: number, currency: string = "Pi"): string => {
    const isFiat = ["XAF", "EUR", "USD", "XOF", "GHS", "NGN"].includes(currency.toUpperCase());
    const maxDecimals = isFiat ? 2 : 6;
    
    if (Math.abs(amount) < 0.000001 && amount !== 0) {
      return amount.toFixed(maxDecimals);
    }
    
    return amount.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    });
  };
  
  const formattedAmount = formatAmount(transaction.amount, transaction.currency);

  const formattedDate = new Date(transaction.createdAt).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-8">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">Details</h1>
          <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase">Transaction</p>
        </div>
        <button
          onClick={shareTransaction}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <Share2 size={20} />
        </button>
      </header>

      <main className="px-6 space-y-6">
        {/* Amount Card */}
        <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 text-center relative overflow-hidden">
          {/* Background gradient */}
          <div className={`absolute inset-0 ${isSent ? "bg-gradient-to-br from-red-500/5 to-transparent" : "bg-gradient-to-br from-emerald-500/5 to-transparent"}`} />
          
          <div className="relative">
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${statusInfo.bg} mb-6`}>
              <StatusIcon size={16} className={statusInfo.color} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSent ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                {isSent ? (
                  <ArrowUpRight size={24} className="text-red-400" />
                ) : (
                  <ArrowDownLeft size={24} className="text-emerald-400" />
                )}
              </div>
            </div>
            
            <p className={`text-4xl font-black ${isSent ? "text-red-400" : "text-emerald-400"}`}>
              {isSent ? "-" : "+"}{formattedAmount} {transaction.currency}
            </p>
            
            {transaction.fee > 0 && (
              <p className="text-[10px] font-bold text-slate-500 mt-2">
                Frais: {transaction.fee} {transaction.currency}
              </p>
            )}

            {/* Transaction Type */}
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
              <Wallet size={12} className="text-blue-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase">{getTypeLabel()}</span>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isSent ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
              {otherUser?.avatar ? (
                <img src={otherUser.avatar} alt={displayName} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <User size={24} className={isSent ? "text-red-400" : "text-emerald-400"} />
              )}
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {isSent ? "Envoye a" : "Recu de"}
              </p>
              <p className="text-base font-black uppercase tracking-tight">{displayName}</p>
              {otherUser?.username && (
                <p className="text-[10px] text-blue-400">@{otherUser.username}</p>
              )}
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
          {/* Reference */}
          <button
            onClick={() => copyToClipboard(transaction.reference, "Reference")}
            className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-all"
          >
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Hash size={18} className="text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Reference</p>
              <p className="text-xs font-bold text-white truncate">{transaction.reference}</p>
            </div>
            <Copy size={16} className="text-slate-500" />
          </button>

          {/* Date */}
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Calendar size={18} className="text-purple-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date</p>
              <p className="text-xs font-bold text-white capitalize">{formattedDate}</p>
            </div>
          </div>

          {/* Description */}
          {transaction.description && (
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                <FileText size={18} className="text-cyan-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Description</p>
                <p className="text-xs font-bold text-white">{transaction.description}</p>
              </div>
            </div>
          )}

          {/* Memo from metadata */}
          {transaction.metadata?.memo && (
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <FileText size={18} className="text-amber-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Memo</p>
                <p className="text-xs font-bold text-white">{transaction.metadata.memo}</p>
              </div>
            </div>
          )}

          {/* Blockchain Hash */}
          {transaction.metadata?.blockchainTxHash && (
            <button
              onClick={() => copyToClipboard(transaction.metadata!.blockchainTxHash!, "Hash blockchain")}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-all"
            >
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                <ExternalLink size={18} className="text-indigo-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Hash Blockchain</p>
                <p className="text-xs font-bold text-white truncate">{transaction.metadata.blockchainTxHash}</p>
              </div>
              <Copy size={16} className="text-slate-500" />
            </button>
          )}

          {/* Transaction ID */}
          <button
            onClick={() => copyToClipboard(transaction.id, "ID Transaction")}
            className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-all"
          >
            <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center">
              <Hash size={18} className="text-slate-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">ID Transaction</p>
              <p className="text-[10px] font-mono text-slate-400 truncate">{transaction.id}</p>
            </div>
            <Copy size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {isSent && otherUser && (
            <button
              onClick={() => router.push(`/mpay/send?to=${otherUser.username || otherUser.id}`)}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Renvoyer
            </button>
          )}
          <button
            onClick={() => router.push("/mpay")}
            className={`${isSent && otherUser ? "flex-1" : "w-full"} py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-sm font-black uppercase tracking-wider transition-all`}
          >
            Retour
          </button>
        </div>
      </main>
    </div>
  );
}
