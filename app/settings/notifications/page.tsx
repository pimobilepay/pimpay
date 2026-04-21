"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Check, Trash2, ArrowLeft, RefreshCcw,
  CheckCheck, Info, ShieldCheck, ArrowDownLeft,
  ArrowUpRight, Store, LogIn, Clock, Loader2,
  Smartphone, Globe, MapPin, Repeat, User, Building2, Wifi,
  ChevronRight, TrendingUp, Coins
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NotificationType = "SECURITY" | "PAYMENT_RECEIVED" | "PAYMENT_SENT" | "MERCHANT" | "LOGIN" | "SYSTEM" | "SWAP" | "SUCCESS" | "KYC" | "KYC_APPROVED" | "KYC_REJECTED" | "KYC_PENDING" | "STAKING" | "STAKING_REWARD" | "STAKING_UNSTAKE" | string;

// Helper pour formater les montants PI avec 8 decimales maximum
function formatPiAmount(amount: number | undefined, currency?: string): string {
  if (amount === undefined || amount === null) return "0";
  const curr = (currency || "PI").toUpperCase();
  // Pour PI, afficher jusqu'a 8 decimales significatives
  if (curr === "PI") {
    // Supprimer les zeros de fin
    const formatted = Number(amount).toFixed(8).replace(/\.?0+$/, "");
    return formatted || "0";
  }
  // Pour les autres devises, utiliser toLocaleString classique
  return Number(amount).toLocaleString();
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  metadata?: {
    device?: string;
    ip?: string;
    location?: string;
    os?: string;
    browser?: string;
    fromCurrency?: string;
    toCurrency?: string;
    fromAmount?: number;
    toAmount?: number;
    rate?: number;
    reference?: string;
    // Champs pour les transactions (depot, envoi, reception)
    amount?: number;
    currency?: string;
    senderName?: string;
    senderUsername?: string;
    recipientName?: string;
    recipientUsername?: string;
    method?: string;
    fee?: number;
    status?: string;
    transactionId?: string;
    walletAddress?: string;
    network?: string;
    // Staking specific
    stakingAmount?: number;
    rewardAmount?: number;
    apy?: number;
    duration?: string;
    stakingId?: string;
    stakingStatus?: string;
    unlockDate?: string;
    type?: string;
  };
}

// Couleur de fond et bordure laterale selon le type (style page mpay)
function getNotifCardClass(type: NotificationType, read: boolean): string {
  if (read) return "bg-white/[0.02] border border-white/10";
  switch (type) {
    case "PAYMENT_RECEIVED":
    case "SUCCESS":
      return "bg-emerald-500/5 border border-white/10 border-l-2 border-l-emerald-500";
    case "PAYMENT_SENT":
      return "bg-red-500/5 border border-white/10 border-l-2 border-l-red-500";
    case "SECURITY":
    case "LOGIN":
      return "bg-amber-500/5 border border-white/10 border-l-2 border-l-amber-500";
    case "SWAP":
      return "bg-indigo-500/5 border border-white/10 border-l-2 border-l-indigo-500";
    case "MERCHANT":
      return "bg-amber-500/5 border border-white/10 border-l-2 border-l-amber-400";
    case "KYC":
    case "KYC_APPROVED":
      return "bg-emerald-500/5 border border-white/10 border-l-2 border-l-emerald-500";
    case "KYC_REJECTED":
      return "bg-rose-500/5 border border-white/10 border-l-2 border-l-rose-500";
    case "KYC_PENDING":
      return "bg-amber-500/5 border border-white/10 border-l-2 border-l-amber-500";
    case "STAKING":
    case "STAKING_REWARD":
      return "bg-purple-500/5 border border-white/10 border-l-2 border-l-purple-500";
    case "STAKING_UNSTAKE":
      return "bg-orange-500/5 border border-white/10 border-l-2 border-l-orange-500";
    default:
      return "bg-blue-500/5 border border-white/10 border-l-2 border-l-blue-500";
  }
}

// Bg de l'icone rond selon le type
function getIconBgClass(type: NotificationType, read: boolean): string {
  if (read) return "bg-slate-800";
  switch (type) {
    case "PAYMENT_RECEIVED": case "SUCCESS": case "KYC_APPROVED": return "bg-emerald-500/10";
    case "PAYMENT_SENT": return "bg-red-500/10";
    case "SECURITY": case "LOGIN": return "bg-amber-500/10";
    case "SWAP": return "bg-indigo-500/10";
    case "MERCHANT": return "bg-amber-500/10";
    case "KYC_REJECTED": return "bg-rose-500/10";
    case "KYC_PENDING": return "bg-amber-500/10";
    case "STAKING": case "STAKING_REWARD": return "bg-purple-500/10";
    case "STAKING_UNSTAKE": return "bg-orange-500/10";
    default: return "bg-blue-500/10";
  }
}

// Map devise → nom du réseau blockchain source
const BLOCKCHAIN_NAMES: Record<string, string> = {
  PI:   "Pi Network",
  SDA:  "Sidra Chain",
  BTC:  "Bitcoin Network",
  ETH:  "Ethereum Network",
  BNB:  "BNB Chain",
  SOL:  "Solana Network",
  TRX:  "TRON Network",
  TON:  "TON Blockchain",
  XRP:  "XRP Ledger",
  XLM:  "Stellar Network",
  ADA:  "Cardano Network",
  DOGE: "Dogecoin Network",
  USDT: "USDT Network",
  USDC: "USDC Network",
  DAI:  "DAI Network",
};

// Inférer l'expéditeur et le destinataire depuis le contexte d'une notification
function inferTxParties(notif: Notification): { sender: string; recipient: string } {
  const meta     = notif.metadata;
  const currency = (meta?.currency || "PI").toUpperCase();
  const text     = `${notif.title} ${notif.message}`.toLowerCase();

  // Si les metadata fournissent des noms explicites, on les privilégie
  const explicitSender    = meta?.senderName    || meta?.senderUsername    || null;
  const explicitRecipient = meta?.recipientName || meta?.recipientUsername || null;

  // Adresse wallet externe → nom de réseau
  const networkName = BLOCKCHAIN_NAMES[currency] || `${currency} Network`;

  // Catégories de services détectés dans le texte
  const isCard    = text.includes("carte") || text.includes("card") || text.includes("visa") || text.includes("mastercard");
  const isAirtel  = text.includes("airtel");
  const isMtn     = text.includes("mtn");
  const isMoMo    = text.includes("mobile money") || text.includes("momo");
  const isWave    = text.includes("wave");
  const isPaypal  = text.includes("paypal");
  const isSwap    = text.includes("swap") || text.includes("exchange") || text.includes("conversion");
  const isDeposit = text.includes("depot") || text.includes("deposit") || text.includes("dépôt") || text.includes("recharge") || text.includes("réception");
  const isWithdraw= text.includes("retrait") || text.includes("withdraw") || text.includes("cashout");
  const isRecharge= text.includes("recharge") || text.includes("top-up");
  const isPayment = text.includes("paiement") || text.includes("payment") || text.includes("achat");

  const serviceName = isCard   ? "Recharge Carte"
    : isAirtel  ? "Airtel Money"
    : isMtn     ? "MTN Mobile Money"
    : isMoMo    ? "Mobile Money"
    : isWave    ? "Wave"
    : isPaypal  ? "PayPal"
    : isSwap    ? "PimPay Exchange"
    : isRecharge? "Operateur Telecom"
    : isPayment ? "Marchand"
    : null;

  if (notif.type === "PAYMENT_RECEIVED" || notif.type === "SUCCESS") {
    // Argent recu : expediteur = source externe ou utilisateur
    const sender    = explicitSender    || serviceName || (isDeposit ? networkName : "PimPay");
    const recipient = explicitRecipient || "Vous";
    return { sender, recipient };
  }

  if (notif.type === "PAYMENT_SENT") {
    // Argent envoye : destinataire = cible externe ou utilisateur
    const sender    = explicitSender    || "Vous";
    const recipient = explicitRecipient || serviceName || (isWithdraw ? networkName : "Destinataire");
    return { sender, recipient };
  }

  // Types generiques avec montant (MERCHANT, SYSTEM, etc.)
  return {
    sender:    explicitSender    || "PimPay",
    recipient: explicitRecipient || "Vous",
  };
}

// Icone et couleur selon qu'il s'agit d'un service externe ou d'un utilisateur
function PartyPill({ label, name, isYou }: { label: string; name: string; isYou?: boolean }) {
  const isExternal = ["network","chain","blockchain","money","wave","paypal","carte","card","marchand","exchange","operateur","airtel","mtn","pimpay"]
    .some(k => name.toLowerCase().includes(k));

  return (
    <div className={`flex-1 rounded-2xl p-3 border ${
      isYou     ? "bg-blue-600/10 border-blue-500/20"
      : isExternal ? "bg-cyan-600/10 border-cyan-500/15"
      : "bg-white/5 border-white/5"
    }`}>
      <p className={`text-[8px] font-black uppercase tracking-widest mb-2 ${
        isYou ? "text-blue-400" : isExternal ? "text-cyan-600" : "text-slate-500"
      }`}>{label}</p>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isYou     ? "bg-blue-600/20"
          : isExternal ? "bg-cyan-600/20"
          : "bg-slate-800"
        }`}>
          {isExternal ? <Building2 size={12} className="text-cyan-400" /> : <User size={12} className={isYou ? "text-blue-400" : "text-slate-400"} />}
        </div>
        <p className={`text-[11px] font-bold truncate leading-tight ${
          isYou ? "text-blue-200" : isExternal ? "text-cyan-200" : "text-white"
        }`}>{name}</p>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async (showSilent = false) => {
    if (!showSilent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      
      const data = await res.json();
      
      if (res.ok && isMounted.current) {
        // CORRECTION : Ton API renvoie directement le tableau de notifications
        const notifsArray = Array.isArray(data) ? data : (data.notifications || []);
        setNotifications(notifsArray);
        
        // Calcul manuel du compteur pour être sûr de l'exactitude
        const unread = notifsArray.filter((n: Notification) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Erreur Notifications:", err);
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
        setLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    isMounted.current = true;
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(true), 15000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        toast.success("Tout est lu");
      }
    } catch (e) {
      toast.error("Erreur de synchronisation");
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error("Erreur marquage comme lu:", e);
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      toast.error("Suppression échouée");
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "SECURITY": return <ShieldCheck className="text-rose-500" size={18} />;
      case "PAYMENT_RECEIVED": 
      case "SUCCESS": return <ArrowDownLeft className="text-emerald-400" size={18} />;
      case "PAYMENT_SENT": return <ArrowUpRight className="text-blue-400" size={18} />;
      case "SWAP": return <Repeat className="text-indigo-400" size={18} />;
      case "MERCHANT": return <Store className="text-amber-400" size={18} />;
      case "LOGIN": return <LogIn className="text-indigo-400" size={18} />;
      case "STAKING":
      case "STAKING_REWARD": return <TrendingUp className="text-purple-400" size={18} />;
      case "STAKING_UNSTAKE": return <Coins className="text-orange-400" size={18} />;
      case "SYSTEM": return <Info className="text-blue-500" size={18} />;
      case "KYC":
      case "KYC_APPROVED": return <ShieldCheck className="text-emerald-400" size={18} />;
      case "KYC_REJECTED": return <ShieldCheck className="text-rose-500" size={18} />;
      case "KYC_PENDING": return <ShieldCheck className="text-amber-400" size={18} />;
      default: return <Bell className="text-slate-400" size={18} />;
    }
  };

  const tabs = [
    { id: "ALL", label: "Tout" },
    { id: "SUCCESS", label: "Reçus" },
    { id: "SWAP", label: "Swaps" },
    { id: "STAKING", label: "Staking" },
    { id: "LOGIN", label: "Sessions" },
    { id: "SECURITY", label: "Sécurité" },
    { id: "KYC", label: "KYC" },
  ];

  const filteredNotifications = activeTab === "ALL"
    ? notifications
    : notifications.filter(n => {
        if (activeTab === "SUCCESS") return n.type === "SUCCESS" || n.type === "PAYMENT_RECEIVED";
        if (activeTab === "KYC") return n.type === "KYC" || n.type === "KYC_APPROVED" || n.type === "KYC_REJECTED" || n.type === "KYC_PENDING";
        if (activeTab === "STAKING") return n.type === "STAKING" || n.type === "STAKING_REWARD" || n.type === "STAKING_UNSTAKE" || n.metadata?.type === "STAKING" || n.metadata?.type === "UNSTAKE";
        return n.type === activeTab;
      });

  // Notification Detail Modal
  const NotificationDetailModal = ({ notification, onClose }: { notification: Notification; onClose: () => void }) => {
    const metadata = notification.metadata;
    
    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  notification.read ? "bg-slate-800" : "bg-blue-600/20"
                )}>
                  {getIcon(notification.type)}
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-tight">{notification.title}</h2>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    {new Date(notification.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                <ArrowLeft size={18} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Message */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Message</p>
              <p className="text-sm text-white leading-relaxed">{notification.message}</p>
            </div>

            {/* Transaction Details for Payment */}
            {(notification.type === "PAYMENT_RECEIVED" || notification.type === "SUCCESS" || notification.type === "PAYMENT_SENT") && (() => {
              const { sender, recipient } = inferTxParties(notification);
              const isSent = notification.type === "PAYMENT_SENT";
              return (
                <div className="space-y-4">
                  {/* Montant */}
                  {metadata?.amount && (
                    <div className={`rounded-2xl p-4 border ${isSent ? "bg-blue-500/5 border-blue-500/20" : "bg-emerald-500/5 border-emerald-500/20"}`}>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Montant</p>
                      <p className={`text-2xl font-black ${isSent ? "text-blue-400" : "text-emerald-400"}`}>
                        {isSent ? "-" : "+"}{formatPiAmount(metadata.amount, metadata.currency)} {metadata.currency || "PI"}
                      </p>
                    </div>
                  )}

                  {/* Expediteur & Destinataire cote a cote */}
                  <div className="flex gap-3">
                    <PartyPill label="Expediteur" name={sender} isYou={isSent} />
                    <PartyPill label="Destinataire" name={recipient} isYou={!isSent} />
                  </div>

                  {/* Réseau / Méthode */}
                  {(metadata?.network || metadata?.method) && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                      <Wifi size={16} className="text-slate-500 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{metadata?.network ? "Reseau" : "Methode"}</p>
                        <p className="text-sm font-bold text-white">{metadata?.network || metadata?.method}</p>
                      </div>
                    </div>
                  )}

                  {/* Adresse Wallet */}
                  {metadata?.walletAddress && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Adresse Wallet</p>
                      <p className="text-xs font-mono text-slate-300 break-all">{metadata.walletAddress}</p>
                    </div>
                  )}

                  {/* Frais + Statut en ligne */}
                  <div className="flex gap-3">
                    {metadata?.fee && metadata.fee > 0 && (
                      <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Frais</p>
                        <p className="text-sm font-bold text-amber-400">{formatPiAmount(metadata.fee, metadata.currency)} {metadata.currency || "PI"}</p>
                      </div>
                    )}
                    {metadata?.status && (
                      <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Statut</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          metadata.status === "SUCCESS" ? "bg-emerald-500/20 text-emerald-400" :
                          metadata.status === "PENDING" ? "bg-amber-500/20 text-amber-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>{metadata.status}</span>
                      </div>
                    )}
                  </div>

                  {/* Reference */}
                  {(metadata?.reference || metadata?.transactionId) && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Reference</p>
                      <p className="text-xs font-mono text-slate-300">{metadata?.reference || metadata?.transactionId}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Staking Details */}
            {(notification.type === "STAKING" || notification.type === "STAKING_REWARD" || notification.type === "STAKING_UNSTAKE" || metadata?.type === "STAKING" || metadata?.type === "UNSTAKE") && (
              <div className="space-y-3">
                {metadata?.stakingAmount && (
                  <div className="bg-purple-500/5 rounded-2xl p-4 border border-purple-500/20">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Montant Stake</p>
                    <p className="text-2xl font-black text-purple-400">
                      {Number(metadata.stakingAmount).toFixed(8).replace(/\.?0+$/, "")} {metadata.currency || "PI"}
                    </p>
                  </div>
                )}
                {metadata?.rewardAmount && (
                  <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/20">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Recompense</p>
                    <p className="text-2xl font-black text-emerald-400">
                      +{Number(metadata.rewardAmount).toFixed(8).replace(/\.?0+$/, "")} {metadata.currency || "PI"}
                    </p>
                  </div>
                )}
                {metadata?.apy && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">APY</p>
                    <p className="text-lg font-black text-blue-400">{metadata.apy}%</p>
                  </div>
                )}
                {metadata?.duration && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Duree</p>
                    <p className="text-sm font-bold text-white">{metadata.duration}</p>
                  </div>
                )}
                {metadata?.unlockDate && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Date de deblocage</p>
                    <p className="text-sm font-bold text-white">{new Date(metadata.unlockDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
                {metadata?.stakingId && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">ID Staking</p>
                    <p className="text-xs font-mono text-slate-300">{metadata.stakingId}</p>
                  </div>
                )}
              </div>
            )}

            {/* Swap Details */}
            {metadata && notification.type === "SWAP" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-rose-500/10 to-emerald-500/10 rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Envoye</p>
                      <p className="text-lg font-black text-rose-400">{metadata.fromAmount} {metadata.fromCurrency}</p>
                    </div>
                    <Repeat size={20} className="text-slate-600" />
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recu</p>
                      <p className="text-lg font-black text-emerald-400">{metadata.toAmount} {metadata.toCurrency}</p>
                    </div>
                  </div>
                </div>

                {metadata.rate && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Taux de change</p>
                    <p className="text-sm font-bold text-white">1 {metadata.fromCurrency} = {Number(metadata.rate).toFixed(4)} {metadata.toCurrency}</p>
                  </div>
                )}

                {metadata.reference && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Reference</p>
                    <p className="text-xs font-mono text-slate-300">{metadata.reference}</p>
                  </div>
                )}
              </div>
            )}

            {/* Session/Security Details */}
            {metadata && (notification.type === "LOGIN" || notification.type === "SECURITY") && (
              <div className="space-y-4">
                {metadata.device && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Appareil</p>
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-slate-400" />
                      <p className="text-sm font-bold text-white">{metadata.device}</p>
                    </div>
                  </div>
                )}

                {metadata.ip && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Adresse IP</p>
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-slate-400" />
                      <p className="text-sm font-bold text-white">{metadata.ip}</p>
                    </div>
                  </div>
                )}

                {metadata.location && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Localisation</p>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-slate-400" />
                      <p className="text-sm font-bold text-white">{metadata.location}</p>
                    </div>
                  </div>
                )}

                {metadata.os && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Systeme</p>
                    <p className="text-sm font-bold text-white">{metadata.os} {metadata.browser ? `- ${metadata.browser}` : ''}</p>
                  </div>
                )}
              </div>
            )}

            {/* Delete Button */}
            <button 
              onClick={() => { deleteNotif(notification.id); onClose(); }}
              className="w-full py-4 bg-red-500/10 text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Supprimer cette notification
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* Notification Detail Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <NotificationDetailModal 
            notification={selectedNotification} 
            onClose={() => setSelectedNotification(null)} 
          />
        )}
      </AnimatePresence>

      <header className="px-6 pt-12 pb-4 sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-lg font-black uppercase tracking-tight">Notifications</h1>
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-[3px] mt-1">
              {unreadCount > 0 ? `${unreadCount} non lues` : "Tout est lu"}
            </p>
          </div>
          <button onClick={() => fetchNotifications()} className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all">
            <RefreshCcw size={18} className={isRefreshing ? 'animate-spin text-blue-500' : ''} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                activeTab === tab.id
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20"
                  : "bg-white/5 border-white/5 text-slate-500"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button onClick={markAllAsRead} className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 rounded-2xl border border-white/5 hover:text-blue-400 transition-all">
          <CheckCheck size={14} /> Tout marquer comme lu
        </button>
      </header>

      <main className="px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-500">Chargement...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Bell size={40} className="text-slate-800 mb-6" />
            <p className="text-base font-bold text-slate-400 italic">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn("relative rounded-2xl overflow-hidden transition-all", getNotifCardClass(notif.type, notif.read))}
                >
                  <button
                    onClick={() => {
                      if (!notif.read) markAsRead(notif.id);
                      setSelectedNotification(notif);
                    }}
                    className="w-full p-4 flex items-start gap-4 text-left hover:bg-white/[0.03] transition-all"
                  >
                    {/* Icone */}
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", getIconBgClass(notif.type, notif.read))}>
                      {getIcon(notif.type)}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn("text-xs font-black uppercase tracking-tight", notif.read ? "text-slate-400" : "text-white")}>
                          {notif.title}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          {!notif.read && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                          <ChevronRight size={14} className="text-slate-600" />
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Badges inline — Session */}
                      {notif.metadata && (notif.type === "LOGIN" || notif.type === "SECURITY") && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {notif.metadata.device && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-[9px] font-bold uppercase tracking-wide border border-amber-500/15">
                              <Smartphone size={9} /> {notif.metadata.device}
                            </span>
                          )}
                          {notif.metadata.location && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 text-slate-400 rounded-lg text-[9px] font-bold uppercase tracking-wide border border-white/5">
                              <MapPin size={9} /> {notif.metadata.location}
                            </span>
                          )}
                          {notif.metadata.ip && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 text-slate-500 rounded-lg text-[9px] font-mono border border-white/5">
                              <Globe size={9} /> {notif.metadata.ip}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Badges inline — Paiement recu / envoye */}
                      {(notif.type === "PAYMENT_RECEIVED" || notif.type === "SUCCESS" || notif.type === "PAYMENT_SENT") && (() => {
                        const { sender, recipient } = inferTxParties(notif);
                        const isSent = notif.type === "PAYMENT_SENT";
                        return (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {notif.metadata?.amount && (
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black border",
                                isSent ? "bg-red-500/10 text-red-400 border-red-500/15" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                              )}>
                                {isSent ? <ArrowUpRight size={9} /> : <ArrowDownLeft size={9} />}
                                {isSent ? "-" : "+"}{formatPiAmount(notif.metadata.amount, notif.metadata.currency)} {notif.metadata.currency || "PI"}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 text-slate-400 rounded-lg text-[9px] font-bold border border-white/5 uppercase tracking-wide">
                              {isSent ? sender : recipient}
                            </span>
                            {notif.metadata?.method && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[9px] font-bold border border-blue-500/15 uppercase tracking-wide">
                                {notif.metadata.method}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Badges inline — Swap */}
                      {notif.metadata && notif.type === "SWAP" && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-[9px] font-black border border-rose-500/15">
                            <ArrowUpRight size={9} /> {notif.metadata.fromAmount} {notif.metadata.fromCurrency}
                          </span>
                          <Repeat size={12} className="text-slate-600 self-center" />
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] font-black border border-emerald-500/15">
                            <ArrowDownLeft size={9} /> {notif.metadata.toAmount} {notif.metadata.toCurrency}
                          </span>
                        </div>
                      )}

                      {/* Badges inline — KYC */}
                      {(notif.type === "KYC" || notif.type === "KYC_APPROVED" || notif.type === "KYC_REJECTED" || notif.type === "KYC_PENDING") && (() => {
                        const isApproved = notif.type === "KYC_APPROVED" || notif.metadata?.status === "APPROVED";
                        const isRejected = notif.type === "KYC_REJECTED" || notif.metadata?.status === "REJECTED";
                        return (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black border uppercase tracking-wide",
                              isApproved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                              : isRejected ? "bg-rose-500/10 text-rose-400 border-rose-500/15"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/15"
                            )}>
                              <ShieldCheck size={9} />
                              {isApproved ? "KYC Verifie" : isRejected ? "KYC Rejete" : "KYC En attente"}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Badges inline — Staking */}
                      {(notif.type === "STAKING" || notif.type === "STAKING_REWARD" || notif.type === "STAKING_UNSTAKE" || notif.metadata?.type === "STAKING" || notif.metadata?.type === "UNSTAKE") && (notif.metadata?.stakingAmount || notif.metadata?.rewardAmount) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {notif.metadata?.stakingAmount && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-[9px] font-black border border-purple-500/15">
                              <TrendingUp size={9} />
                              {Number(notif.metadata.stakingAmount).toFixed(8).replace(/\.?0+$/, "")} {notif.metadata.currency || "PI"} stake
                            </span>
                          )}
                          {notif.metadata?.rewardAmount && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] font-black border border-emerald-500/15">
                              +{Number(notif.metadata.rewardAmount).toFixed(8).replace(/\.?0+$/, "")} {notif.metadata.currency || "PI"} recompense
                            </span>
                          )}
                          {notif.metadata?.apy && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[9px] font-black border border-blue-500/15">
                              {notif.metadata.apy}% APY
                            </span>
                          )}
                          {notif.metadata?.duration && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/10 text-slate-400 rounded-lg text-[9px] font-bold border border-slate-500/15">
                              <Clock size={9} /> {notif.metadata.duration}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Badges inline — Generique avec montant */}
                      {notif.metadata && !["LOGIN", "SECURITY", "SWAP", "PAYMENT_RECEIVED", "SUCCESS", "PAYMENT_SENT", "KYC", "KYC_APPROVED", "KYC_REJECTED", "KYC_PENDING", "STAKING", "STAKING_REWARD", "STAKING_UNSTAKE"].includes(notif.type) && !notif.metadata.stakingAmount && !notif.metadata.rewardAmount && notif.metadata.amount && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 text-white rounded-lg text-[9px] font-black border border-white/10">
                            {Number(notif.metadata.amount).toLocaleString()} {notif.metadata.currency || "PI"}
                          </span>
                          {notif.metadata.status && (
                            <span className={cn(
                              "inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black border uppercase",
                              notif.metadata.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                              : notif.metadata.status === "PENDING" ? "bg-amber-500/10 text-amber-400 border-amber-500/15"
                              : "bg-red-500/10 text-red-400 border-red-500/15"
                            )}>
                              {notif.metadata.status}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Heure relative */}
                      <div className="flex items-center gap-1.5 mt-3">
                        <Clock size={10} className="text-slate-600" />
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
