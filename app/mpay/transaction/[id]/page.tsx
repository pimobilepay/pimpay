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
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { getBlockchainTxUrl, getExplorerName, hasBlockchainExplorer } from "@/lib/blockchain-explorer";

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
    const currency = transaction.currency?.toUpperCase() || "PI";
    const desc = transaction.description?.toLowerCase() || "";
    
    // Handle CARD_PURCHASE transactions
    if (txType === "CARD_PURCHASE" || ref.startsWith("CARD-BUY") || ref.includes("CARD_PURCHASE")) {
      return "Achat Carte PimPay";
    }
    // Handle card recharge/withdraw
    if (txType === "CARD_RECHARGE" || txType === "CARD_WITHDRAW") {
      return transaction.description || (txType === "CARD_RECHARGE" ? "Recharge Carte" : "Retrait Carte");
    }
    // Handle external withdrawals
    if (txType === "WITHDRAWAL" || txType === "WITHDRAW" || ref.startsWith("WD-") || ref.includes("EXTERNAL")) {
      if (currency === "SDA" || desc.includes("sidra")) return "Retrait Sidra Chain";
      if (currency === "PI" || desc.includes("pi network")) return "Retrait Pi Network";
      if (currency === "XRP") return "Retrait XRP Ledger";
      if (currency === "BTC") return "Retrait Bitcoin";
      if (currency === "ETH") return "Retrait Ethereum";
      return "Retrait Externe";
    }
    // Handle deposits - detect blockchain based on currency
    if (txType === "DEPOSIT" && !transaction.fromUserId) {
      if (currency === "SDA" || desc.includes("sidra")) return "Depot Sidra Chain";
      if (currency === "PI" || desc.includes("pi network")) return "Depot Pi Network";
      if (currency === "XRP") return "Depot XRP Ledger";
      if (currency === "BTC") return "Depot Bitcoin";
      if (currency === "ETH") return "Depot Ethereum";
      if (["USDT", "USDC", "DAI", "BUSD"].includes(currency)) return "Depot Stablecoin";
      return "Depot Blockchain";
    }
    // Default: use user display name
    return otherUser?.displayName || otherUser?.name || otherUser?.username || "Utilisateur";
  };
  
  // Check if this is a blockchain transaction (deposit/withdrawal without user)
  const isBlockchainDeposit = txType === "DEPOSIT" && !transaction.fromUserId;
  const isBlockchainWithdraw = (txType === "WITHDRAWAL" || txType === "WITHDRAW") && !transaction.toUserId;
  
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
  
  // Format amount with proper decimals (8 decimals for crypto like SDA, PI)
  const formatAmount = (amount: number, currency: string = "Pi"): string => {
    const isFiat = ["XAF", "EUR", "USD", "XOF", "GHS", "NGN"].includes(currency.toUpperCase());
    const maxDecimals = isFiat ? 2 : 8;
    
    if (Math.abs(amount) < 0.00000001 && amount !== 0) {
      return amount.toFixed(maxDecimals);
    }
    
    return amount.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    });
  };
  
  // Currency to USD conversion rates
  const CURRENCY_RATES: Record<string, number> = {
    PI: 314159,
    SDA: 1.2,
    USDT: 1.0,
    USDC: 1.0,
    DAI: 1.0,
    BUSD: 1.0,
    XAF: 1 / 615,
    XOF: 1 / 615,
    BTC: 65000,
    ETH: 3500,
    BNB: 600,
    SOL: 150,
    XRP: 0.5,
    XLM: 0.1,
    TRX: 0.12,
    ADA: 0.45,
    DOGE: 0.15,
    TON: 6.5,
  };
  
  const rateToUSD = CURRENCY_RATES[transaction.currency?.toUpperCase()] || 1;
  const amountUSD = transaction.amount * rateToUSD;
  
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
    <div className="min-h-screen bg-[#020617] text-white pb-10 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.18),transparent_70%)]" />

      {/* Header */}
      <header className="relative px-5 pt-12 pb-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="h-11 w-11 grid place-items-center bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-base font-black uppercase tracking-tight">Reçu de transaction</h1>
          <p className="text-[9px] font-bold text-blue-400/80 tracking-[3px] uppercase mt-0.5">PimPay Network</p>
        </div>
        <button
          onClick={shareTransaction}
          className="h-11 w-11 grid place-items-center bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
          aria-label="Partager"
        >
          <Share2 size={18} />
        </button>
      </header>

      <main className="relative px-5 space-y-4">
        {/* ===== Hero Receipt Card ===== */}
        <section className="relative rounded-[1.75rem] bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-white/10 shadow-[0_20px_60px_-20px_rgba(37,99,235,0.45)] overflow-hidden">
          {/* Top accent line */}
          <div className={`h-1 w-full ${statusLower === "success" ? "bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0" : statusLower === "pending" ? "bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0" : "bg-gradient-to-r from-red-500/0 via-red-400 to-red-500/0"}`} />

          <div className="p-7 pt-8 flex flex-col items-center text-center">
            {/* Status pill */}
            <div className={`inline-flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full border ${statusInfo.bg} ${statusLower === "success" ? "border-emerald-500/30" : statusLower === "pending" ? "border-amber-500/30" : "border-red-500/30"}`}>
              <div className={`h-5 w-5 grid place-items-center rounded-full ${statusLower === "success" ? "bg-emerald-500/20" : statusLower === "pending" ? "bg-amber-500/20" : "bg-red-500/20"}`}>
                <StatusIcon size={12} className={statusInfo.color} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${statusInfo.color}`}>{statusInfo.label}</span>
            </div>

            {/* Type label */}
            <p className="mt-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.35em]">{getTypeLabel()}</p>

            {/* Amount */}
            <div className="mt-2 flex items-end justify-center gap-2">
              <span className="text-6xl font-black tracking-tight leading-none">
                {transaction.amount < 0.0001 && transaction.amount > 0
                  ? transaction.amount.toFixed(8)
                  : transaction.amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}
              </span>
              <span className="text-xl font-black text-blue-400 mb-1.5">{transaction.currency}</span>
            </div>

            {/* USD badge */}
            <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
              <TrendingUp size={13} className="text-blue-400" />
              <span className="text-[11px] font-bold text-blue-300">≈ ${amountUSD.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} USD</span>
            </div>

            {/* Fee */}
            {transaction.fee > 0 && (
              <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <span>Frais de réseau</span>
                <span className="text-slate-600">·</span>
                <span className="text-red-400">{formatAmount(transaction.fee, transaction.currency)} {transaction.currency}</span>
              </div>
            )}
          </div>

          {/* Perforated divider (receipt notch) */}
          <div className="relative">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#020617]" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#020617]" />
            <div className="border-t border-dashed border-white/10 mx-6" />
          </div>

          {/* Authenticity footer */}
          <div className="flex items-center justify-center gap-2 py-4 bg-white/[0.02]">
            <ShieldCheck size={13} className="text-emerald-400/70" />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Authentifié par PimPay</p>
          </div>
        </section>

        {/* ===== Parties (From → To) ===== */}
        <section className="rounded-[1.5rem] bg-white/[0.03] border border-white/10 p-2">
          {/* Sender */}
          <div className="flex items-center gap-3.5 p-3.5">
            <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isBlockchainDeposit ? "bg-purple-500/10" : "bg-red-500/10"}`}>
              {transaction.fromUser?.avatar && !isBlockchainDeposit ? (
                <img src={transaction.fromUser.avatar || "/placeholder.svg"} alt="Expediteur" className="w-full h-full rounded-2xl object-cover" />
              ) : isBlockchainDeposit ? (
                <Wallet size={20} className="text-purple-400" />
              ) : (
                <User size={20} className="text-red-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                {isBlockchainDeposit ? "Source" : "Expéditeur"}
              </p>
              <p className="text-sm font-black text-white truncate">
                {isBlockchainDeposit ? displayName : (transaction.fromUser?.displayName || transaction.fromUser?.name || transaction.fromUser?.username || "Utilisateur")}
              </p>
              {!isBlockchainDeposit && transaction.fromUser?.username && (
                <p className="text-[10px] text-blue-400 truncate">@{transaction.fromUser.username}</p>
              )}
              {isBlockchainDeposit && (
                <p className="text-[10px] text-purple-400 truncate">Blockchain {transaction.currency}</p>
              )}
            </div>
            {isSent && !isBlockchainDeposit && (
              <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg uppercase">Vous</span>
            )}
            {isBlockchainDeposit && (
              <span className="text-[8px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-lg uppercase">Externe</span>
            )}
          </div>

          {/* Flow connector */}
          <div className="flex items-center gap-3 px-3.5">
            <div className="w-12 flex justify-center">
              <div className="h-8 w-px bg-gradient-to-b from-red-500/30 via-white/10 to-emerald-500/30" />
            </div>
            <div className="flex-1 flex items-center">
              <div className="h-7 w-7 -ml-3.5 grid place-items-center rounded-full bg-slate-800 border border-white/10">
                <ArrowDownLeft size={13} className="text-slate-400" />
              </div>
            </div>
          </div>

          {/* Recipient */}
          <div className="flex items-center gap-3.5 p-3.5">
            <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isBlockchainWithdraw ? "bg-orange-500/10" : "bg-emerald-500/10"}`}>
              {transaction.toUser?.avatar && !isBlockchainWithdraw ? (
                <img src={transaction.toUser.avatar || "/placeholder.svg"} alt="Destinataire" className="w-full h-full rounded-2xl object-cover" />
              ) : isBlockchainWithdraw ? (
                <Wallet size={20} className="text-orange-400" />
              ) : (
                <User size={20} className="text-emerald-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                {isBlockchainWithdraw ? "Destination" : "Destinataire"}
              </p>
              <p className="text-sm font-black text-white truncate">
                {isBlockchainWithdraw ? displayName : (transaction.toUser?.displayName || transaction.toUser?.name || transaction.toUser?.username || "Utilisateur")}
              </p>
              {!isBlockchainWithdraw && transaction.toUser?.username && (
                <p className="text-[10px] text-emerald-400 truncate">@{transaction.toUser.username}</p>
              )}
              {isBlockchainWithdraw && (
                <p className="text-[10px] text-orange-400 truncate">Blockchain {transaction.currency}</p>
              )}
            </div>
            {!isSent && !isBlockchainWithdraw && (
              <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg uppercase">Vous</span>
            )}
            {isBlockchainWithdraw && (
              <span className="text-[8px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg uppercase">Externe</span>
            )}
          </div>
        </section>

        {/* ===== Details ===== */}
        <section className="rounded-[1.5rem] bg-white/[0.03] border border-white/10 overflow-hidden divide-y divide-white/5">
          {/* Reference */}
          <button
            onClick={() => copyToClipboard(transaction.reference, "Reference")}
            className="w-full flex items-center gap-3.5 p-4 hover:bg-white/[0.03] transition-all group"
          >
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Hash size={17} className="text-blue-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Référence</p>
              <p className="text-xs font-bold text-white truncate">{transaction.reference}</p>
            </div>
            <Copy size={15} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
          </button>

          {/* Date */}
          <div className="flex items-center gap-3.5 p-4">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Calendar size={17} className="text-purple-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date</p>
              <p className="text-xs font-bold text-white capitalize">{formattedDate}</p>
            </div>
          </div>

          {/* Description */}
          {transaction.description && (
            <div className="flex items-center gap-3.5 p-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center shrink-0">
                <FileText size={17} className="text-cyan-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Description</p>
                <p className="text-xs font-bold text-white">{transaction.description}</p>
              </div>
            </div>
          )}

          {/* Memo from metadata */}
          {transaction.metadata?.memo && (
            <div className="flex items-center gap-3.5 p-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                <FileText size={17} className="text-amber-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Mémo</p>
                <p className="text-xs font-bold text-white">{transaction.metadata.memo}</p>
              </div>
            </div>
          )}

          {/* Blockchain Hash */}
          {transaction.metadata?.blockchainTxHash && (
            <button
              onClick={() => copyToClipboard(transaction.metadata!.blockchainTxHash!, "Hash blockchain")}
              className="w-full flex items-center gap-3.5 p-4 hover:bg-white/[0.03] transition-all group"
            >
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                <ExternalLink size={17} className="text-indigo-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Hash Blockchain</p>
                <p className="text-xs font-bold text-white truncate">{transaction.metadata.blockchainTxHash}</p>
              </div>
              <Copy size={15} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
            </button>
          )}

          {/* Blockchain Explorer Link */}
          {transaction.metadata?.blockchainTxHash && hasBlockchainExplorer(transaction.currency) && (
            <a
              href={getBlockchainTxUrl(transaction.currency, transaction.metadata.blockchainTxHash) || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3.5 p-4 hover:bg-white/[0.03] transition-all group"
            >
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center shrink-0">
                <ExternalLink size={17} className="text-cyan-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Vérifier sur la Blockchain</p>
                <p className="text-xs font-bold text-cyan-400 group-hover:underline">{getExplorerName(transaction.currency)}</p>
              </div>
              <ChevronRight size={16} className="text-cyan-400 shrink-0" />
            </a>
          )}

          {/* Transaction ID */}
          <button
            onClick={() => copyToClipboard(transaction.id, "ID Transaction")}
            className="w-full flex items-center gap-3.5 p-4 hover:bg-white/[0.03] transition-all group"
          >
            <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Hash size={17} className="text-slate-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">ID Transaction</p>
              <p className="text-[10px] font-mono text-slate-400 truncate">{transaction.id}</p>
            </div>
            <Copy size={15} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
          </button>
        </section>

        {/* ===== Actions ===== */}
        <div className="flex gap-3 pt-1">
          {isSent && otherUser && (
            <button
              onClick={() => router.push(`/mpay/send?to=${otherUser.username || otherUser.id}`)}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
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
