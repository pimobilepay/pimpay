"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Bell, CheckCheck, Trash2, 
  ArrowDownLeft, ArrowUpRight, Shield, Loader2,
  RefreshCw, AlertCircle,
  Wallet, X, TrendingUp, Coins, CreditCard,
  Info, Repeat, Clock, Smartphone, MapPin, Globe,
  ShieldCheck, Store, LogIn, ChevronRight, Gift, Mail, MessageCircle, Headphones
} from "lucide-react";
import TransactionConfirmModal from "@/components/TransactionConfirmModal";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// Helper pour formater les montants PI avec 8 decimales max
function formatPiAmount(amount: number | undefined, currency?: string): string {
  if (amount === undefined || amount === null) return "0";
  const curr = (currency || "PI").toUpperCase();
  if (curr === "PI") {
    return Number(amount).toFixed(8).replace(/\.?0+$/, "") || "0";
  }
  return Number(amount).toLocaleString();
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  metadata?: {
    amount?: number;
    currency?: string;
    from?: string;
    to?: string;
    txId?: string;
    // Staking specific
    stakingAmount?: number;
    rewardAmount?: number;
    apy?: number;
    duration?: string;
    stakingId?: string;
    stakingStatus?: string;
    unlockDate?: string;
    type?: string;
    cardId?: string;
    cardLast4?: string;
    // Payment / transaction
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
    // Swap
    fromCurrency?: string;
    toCurrency?: string;
    fromAmount?: number;
    toAmount?: number;
    rate?: number;
    reference?: string;
    // Session
    device?: string;
    ip?: string;
    location?: string;
    os?: string;
    browser?: string;
    // Support Message
    fromAdmin?: boolean;
    adminId?: string;
    adminName?: string;
    canReply?: boolean;
    sentAt?: string;
  };
}

type FilterType = "all" | "payment" | "security" | "unread" | "card" | "support";

interface ConfirmTx {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  currency: string;
  agentName?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  // État pour le modal MFA de confirmation de transaction
  const [confirmTx, setConfirmTx] = useState<ConfirmTx | null>(null);
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/user/notifications");
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      } else if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Erreur notifications:", error);
      toast.error("Erreur de chargement des notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Récupérer les infos utilisateur (id + 2FA) pour le modal MFA
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.id) {
          setCurrentUserId(data.user.id);
          setTwoFactorEnabled(data.user.twoFactorEnabled || false);
        }
      })
      .catch(() => {});
  }, []);

  // Ouvrir le modal MFA depuis la page notifications
  const openConfirmModal = useCallback(
    (notification: Notification) => {
      const meta = notification.metadata;
      console.log("[v0] openConfirmModal - meta:", meta, "currentUserId:", currentUserId);
      if (!meta?.transactionId) {
        console.log("[v0] No transactionId in metadata");
        return;
      }
      if (!currentUserId) {
        toast.error("Erreur: Utilisateur non identifie. Veuillez rafraichir la page.");
        return;
      }
      setConfirmTx({
        id: meta.transactionId,
        type: (meta.type as "DEPOSIT" | "WITHDRAWAL") || "DEPOSIT",
        amount: meta.amount || 0,
        currency: meta.currency || "USD",
        agentName: meta.senderName,
        createdAt: notification.createdAt,
      });
      setIsMfaModalOpen(true);
    },
    [currentUserId]
  );

  // Refus direct depuis la page notifications (sans modal MFA)
  const rejectTransaction = useCallback(
    async (notification: Notification) => {
      const meta = notification.metadata;
      if (!meta?.transactionId) return;
      try {
        const res = await fetch("/api/transaction/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: meta.transactionId,
            userId: currentUserId,
            action: "reject",
          }),
        });
        if (res.ok) {
          toast.success("Transaction refusée");
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, read: true } : n
            )
          );
        } else {
          toast.error("Erreur lors du refus");
        }
      } catch {
        toast.error("Erreur réseau");
      }
    },
    [currentUserId]
  );

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error("Erreur de mise a jour");
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch("/api/user/notifications", {
        method: "PUT",
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("Toutes les notifications marquees comme lues");
    } catch {
      toast.error("Erreur de mise a jour");
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification supprimee");
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === "unread") return !n.read;
    if (activeFilter === "payment") return n.type === "PAYMENT_RECEIVED" || n.type === "PAYMENT_SENT" || n.type === "success";
    if (activeFilter === "security") return n.type === "SECURITY" || n.type === "LOGIN";
    if (activeFilter === "card") return n.type === "CARD" || n.type === "CARD_ORDER" || n.type === "CARD_ACTIVATED";
    if (activeFilter === "support") return n.type === "SUPPORT_MESSAGE";
    return true;
  });

  // Get icon based on notification type
  const getNotificationIcon = (type: string, metadata?: Notification["metadata"]) => {
    switch (type) {
      case "PAYMENT_RECEIVED":
      case "SUCCESS":
      case "success":
        return <ArrowDownLeft size={18} className="text-emerald-400" />;
      case "PAYMENT_SENT":
        return <ArrowUpRight size={18} className="text-red-400" />;
      case "SECURITY":
        return <ShieldCheck size={18} className="text-rose-400" />;
      case "LOGIN":
        return <LogIn size={18} className="text-amber-400" />;
      case "STAKING":
      case "STAKING_REWARD":
        return <TrendingUp size={18} className="text-purple-400" />;
      case "STAKING_UNSTAKE":
        return <Coins size={18} className="text-orange-400" />;
      case "CARD":
      case "CARD_ORDER":
      case "CARD_ACTIVATED":
        return <CreditCard size={18} className="text-cyan-400" />;
      case "SWAP":
        return <Repeat size={18} className="text-indigo-400" />;
      case "MERCHANT":
        return <Store size={18} className="text-amber-400" />;
      case "SUPPORT_MESSAGE":
        return <Mail size={18} className="text-blue-400" />;
      case "TRANSACTION_CONFIRM":
        return <ShieldCheck size={18} className="text-amber-400" />;
      default:
        if (metadata?.type === "STAKING") return <TrendingUp size={18} className="text-purple-400" />;
        if (metadata?.type === "UNSTAKE") return <Coins size={18} className="text-orange-400" />;
        return <Bell size={18} className="text-blue-400" />;
    }
  };

  // Get background color based on type
  const getNotificationBg = (type: string, read: boolean) => {
    if (read) return "bg-white/[0.02]";
    switch (type) {
      case "PAYMENT_RECEIVED":
      case "SUCCESS":
      case "success":
        return "bg-emerald-500/5 border-l-2 border-l-emerald-500";
      case "PAYMENT_SENT":
        return "bg-red-500/5 border-l-2 border-l-red-500";
      case "SECURITY":
      case "LOGIN":
        return "bg-amber-500/5 border-l-2 border-l-amber-500";
      case "CARD":
      case "CARD_ORDER":
      case "CARD_ACTIVATED":
        return "bg-cyan-500/5 border-l-2 border-l-cyan-500";
      case "STAKING":
      case "STAKING_REWARD":
        return "bg-purple-500/5 border-l-2 border-l-purple-500";
      case "STAKING_UNSTAKE":
        return "bg-orange-500/5 border-l-2 border-l-orange-500";
      case "SWAP":
        return "bg-indigo-500/5 border-l-2 border-l-indigo-500";
      case "SUPPORT_MESSAGE":
        return "bg-blue-500/5 border-l-2 border-l-blue-500";
      case "TRANSACTION_CONFIRM":
        return "bg-amber-500/5 border-l-2 border-l-amber-500";
      default:
        return "bg-blue-500/5 border-l-2 border-l-blue-500";
    }
  };

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
          className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-[#0f0a1f] border border-white/10 rounded-[2rem] overflow-hidden max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#0f0a1f]/95 backdrop-blur-xl border-b border-white/5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  notification.type === "PAYMENT_RECEIVED" || notification.type === "success" ? "bg-emerald-500/10" :
                  notification.type === "PAYMENT_SENT" ? "bg-red-500/10" :
                  notification.type === "CARD" ? "bg-cyan-500/10" :
                  "bg-blue-500/10"
                }`}>
                  {getNotificationIcon(notification.type, notification.metadata)}
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-tight">{notification.title}</h2>
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Message</p>
              <p className="text-sm text-white leading-relaxed">{notification.message}</p>
            </div>

            {/* Payment Details */}
            {metadata && metadata.amount && !metadata.stakingAmount && !metadata.rewardAmount && (
              <div className={`rounded-2xl p-4 border ${
                notification.type === "PAYMENT_SENT" 
                  ? "bg-red-500/5 border-red-500/20" 
                  : "bg-emerald-500/5 border-emerald-500/20"
              }`}>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Montant</p>
                <p className={`text-2xl font-black ${
                  notification.type === "PAYMENT_SENT" ? "text-red-400" : "text-emerald-400"
                }`}>
                  {notification.type === "PAYMENT_SENT" ? "-" : "+"}{formatPiAmount(metadata.amount, metadata.currency)} {metadata.currency || "PI"}
                </p>
              </div>
            )}

            {/* Staking Details */}
            {(notification.type === "STAKING" || notification.type === "STAKING_REWARD" || notification.type === "STAKING_UNSTAKE" || metadata?.type === "STAKING" || metadata?.type === "UNSTAKE") && (
              <div className="space-y-3">
                {metadata?.stakingAmount && (
                  <div className="bg-purple-500/5 rounded-2xl p-4 border border-purple-500/20">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Montant Stake</p>
                    <p className="text-2xl font-black text-purple-400">
                      {Number(metadata.stakingAmount).toFixed(8).replace(/\.?0+$/, "")} {metadata.currency || "PI"}
                    </p>
                  </div>
                )}
                {metadata?.rewardAmount && (
                  <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/20">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Recompense</p>
                    <p className="text-2xl font-black text-emerald-400">
                      +{Number(metadata.rewardAmount).toFixed(8).replace(/\.?0+$/, "")} {metadata.currency || "PI"}
                    </p>
                  </div>
                )}
                {metadata?.apy && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">APY</p>
                    <p className="text-lg font-black text-blue-400">{metadata.apy}%</p>
                  </div>
                )}
                {metadata?.duration && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Duree</p>
                    <p className="text-sm font-bold text-white">{metadata.duration}</p>
                  </div>
                )}
                {metadata?.unlockDate && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Date de deblocage</p>
                    <p className="text-sm font-bold text-white">{new Date(metadata.unlockDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Swap Details */}
            {notification.type === "SWAP" && metadata?.fromAmount && (
              <div className="bg-gradient-to-r from-rose-500/10 to-emerald-500/10 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Envoye</p>
                    <p className="text-lg font-black text-rose-400">{metadata.fromAmount} {metadata.fromCurrency}</p>
                  </div>
                  <Repeat size={20} className="text-white/20" />
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Recu</p>
                    <p className="text-lg font-black text-emerald-400">{metadata.toAmount} {metadata.toCurrency}</p>
                  </div>
                </div>
              </div>
            )}

            {metadata?.cardLast4 && (
              <div className="bg-cyan-500/5 rounded-2xl p-4 border border-cyan-500/20">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Carte</p>
                <p className="text-lg font-mono font-bold text-cyan-400">**** **** **** {metadata.cardLast4}</p>
              </div>
            )}

            {/* Support Message Details & Reply Button */}
            {notification.type === "SUPPORT_MESSAGE" && (
              <div className="space-y-3">
                <div className="bg-blue-500/5 rounded-2xl p-4 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones size={14} className="text-blue-400" />
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Message du Support</p>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{notification.message}</p>
                  {metadata?.sentAt && (
                    <p className="text-[9px] text-white/30 mt-2 font-mono">
                      Envoye le {new Date(metadata.sentAt as string).toLocaleDateString("fr-FR", { 
                        day: "2-digit", 
                        month: "long", 
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  )}
                </div>
                
                {/* Reply Button */}
                <button 
                  onClick={() => { 
                    onClose(); 
                    router.push("/support"); 
                  }}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <MessageCircle size={16} />
                  Repondre au Support
                </button>
              </div>
            )}

            {/* Transaction Confirmation Buttons */}
            {notification.type === "TRANSACTION_CONFIRM" && metadata?.transactionId && (
              <div className="space-y-3">
                <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                      <ShieldCheck size={24} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">Confirmation requise</p>
                      <p className="text-[10px] text-white/40">Cette transaction attend votre validation</p>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-amber-400">
                      {formatPiAmount(metadata.amount, metadata.currency)} {metadata.currency || "USD"}
                    </p>
                    {(metadata as any).agentName && (
                      <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">
                        Agent: {(metadata as any).agentName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { rejectTransaction(notification); onClose(); }}
                    className="flex-1 py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <X size={16} />
                    Annuler
                  </button>
                  <button
                    onClick={() => { openConfirmModal(notification); onClose(); }}
                    className="flex-1 py-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                  >
                    <ShieldCheck size={16} />
                    Confirmer
                  </button>
                </div>
              </div>
            )}

            {/* Delete Button */}
            <button 
              onClick={() => { deleteNotification(notification.id); onClose(); }}
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
    <div className="min-h-screen bg-[#030014] text-white font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[180px]"></div>
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[180px]"></div>
      </div>

      {/* Notification Detail Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <NotificationDetailModal 
            notification={selectedNotification} 
            onClose={() => setSelectedNotification(null)} 
          />
        )}
      </AnimatePresence>

      {/* Modal MFA pour confirmation de transaction depuis la page notifications */}
      <TransactionConfirmModal
        isOpen={isMfaModalOpen}
        onClose={() => { setIsMfaModalOpen(false); setConfirmTx(null); fetchNotifications(); }}
        transaction={confirmTx}
        userId={currentUserId}
        twoFactorEnabled={twoFactorEnabled}
      />

      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 pt-8 pb-4 flex items-center justify-between bg-[#030014]/80 backdrop-blur-xl sticky top-0 border-b border-white/5">
        <button 
          onClick={() => router.back()} 
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="text-[9px] font-bold text-white/40 tracking-[3px] uppercase">
            {unreadCount > 0 ? `${unreadCount} non lues` : "Tout est lu"}
          </p>
        </div>
        <button 
          onClick={() => fetchNotifications(true)}
          disabled={refreshing}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
        </button>
      </header>

      {/* Filters */}
      <div className="relative z-10 px-4 sm:px-6 py-4 border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: "all", label: "Tout", icon: Bell },
            { id: "unread", label: "Non lues", icon: AlertCircle },
            { id: "payment", label: "Paiements", icon: Wallet },
            { id: "card", label: "Cartes", icon: CreditCard },
            { id: "security", label: "Securite", icon: Shield },
            { id: "support", label: "Support", icon: Mail },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as FilterType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border shrink-0 ${
                activeFilter === filter.id
                  ? "bg-gradient-to-r from-purple-600 to-cyan-500 border-transparent text-white shadow-lg shadow-purple-500/20"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              <filter.icon size={14} />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mark all as read button */}
      {unreadCount > 0 && (
        <div className="relative z-10 px-4 sm:px-6 py-3">
          <button
            onClick={markAllAsRead}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-500/10 transition-all"
          >
            <CheckCheck size={16} />
            Tout marquer comme lu
          </button>
        </div>
      )}

      {/* Notifications List */}
      <main className="relative z-10 px-4 sm:px-6 pb-32">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-purple-500" />
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Chargement...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10">
              <Bell size={32} className="text-white/20" />
            </div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              {activeFilter === "unread" ? "Aucune notification non lue" : "Aucune notification"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 mt-4">
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  if (!notification.read) markAsRead(notification.id);
                  setSelectedNotification(notification);
                }}
                className={`rounded-2xl border border-white/10 cursor-pointer hover:bg-white/5 transition-all overflow-hidden ${getNotificationBg(notification.type, notification.read)}`}
              >
                <div className="p-4 flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    notification.read ? "bg-white/5" :
                    notification.type === "PAYMENT_RECEIVED" || notification.type === "success" || notification.type === "SUCCESS" ? "bg-emerald-500/10" :
                    notification.type === "PAYMENT_SENT" ? "bg-red-500/10" :
                    notification.type === "SECURITY" || notification.type === "LOGIN" ? "bg-amber-500/10" :
                    notification.type === "STAKING" || notification.type === "STAKING_REWARD" ? "bg-purple-500/10" :
                    notification.type === "STAKING_UNSTAKE" ? "bg-orange-500/10" :
                    notification.type === "SWAP" ? "bg-indigo-500/10" :
                    notification.type === "CARD" || notification.type === "CARD_ORDER" || notification.type === "CARD_ACTIVATED" ? "bg-cyan-500/10" :
                    "bg-white/10"
                  }`}>
                    {getNotificationIcon(notification.type, notification.metadata)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-xs font-black uppercase tracking-tight ${notification.read ? "text-white/60" : "text-white"}`}>
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        )}
                        <ChevronRight size={14} className="text-white/20" />
                      </div>
                    </div>
                    <p className={`text-[10px] mt-0.5 line-clamp-2 leading-relaxed ${notification.read ? "text-white/30" : "text-white/50"}`}>
                      {notification.message}
                    </p>

                    {/* Badges inline — Staking */}
                    {(notification.type === "STAKING" || notification.type === "STAKING_REWARD" || notification.type === "STAKING_UNSTAKE" || notification.metadata?.type === "STAKING" || notification.metadata?.type === "UNSTAKE") && (notification.metadata?.stakingAmount || notification.metadata?.rewardAmount) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {notification.metadata?.stakingAmount && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-[9px] font-black border border-purple-500/15">
                            <TrendingUp size={9} />
                            {Number(notification.metadata.stakingAmount).toFixed(8).replace(/\.?0+$/, "")} {notification.metadata.currency || "PI"} stake
                          </span>
                        )}
                        {notification.metadata?.rewardAmount && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] font-black border border-emerald-500/15">
                            <Gift size={9} />
                            +{Number(notification.metadata.rewardAmount).toFixed(8).replace(/\.?0+$/, "")} {notification.metadata.currency || "PI"} recompense
                          </span>
                        )}
                        {notification.metadata?.apy && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[9px] font-black border border-blue-500/15">
                            {notification.metadata.apy}% APY
                          </span>
                        )}
                        {notification.metadata?.duration && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/10 text-slate-400 rounded-lg text-[9px] font-bold border border-slate-500/15">
                            <Clock size={9} /> {notification.metadata.duration}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Badges inline — Payment */}
                    {(notification.type === "PAYMENT_RECEIVED" || notification.type === "SUCCESS" || notification.type === "success" || notification.type === "PAYMENT_SENT") && notification.metadata?.amount && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black border ${
                          notification.type === "PAYMENT_SENT" ? "bg-red-500/10 text-red-400 border-red-500/15" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                        }`}>
                          {notification.type === "PAYMENT_SENT" ? <ArrowUpRight size={9} /> : <ArrowDownLeft size={9} />}
                          {notification.type === "PAYMENT_SENT" ? "-" : "+"}{formatPiAmount(notification.metadata.amount, notification.metadata.currency)} {notification.metadata.currency || "PI"}
                        </span>
                        {notification.metadata?.method && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[9px] font-bold border border-blue-500/15 uppercase">
                            {notification.metadata.method}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Badges inline — Swap */}
                    {notification.type === "SWAP" && notification.metadata?.fromAmount && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-[9px] font-black border border-rose-500/15">
                          <ArrowUpRight size={9} /> {notification.metadata.fromAmount} {notification.metadata.fromCurrency}
                        </span>
                        <Repeat size={10} className="text-white/20" />
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] font-black border border-emerald-500/15">
                          <ArrowDownLeft size={9} /> {notification.metadata.toAmount} {notification.metadata.toCurrency}
                        </span>
                      </div>
                    )}

                    {/* Badges inline — Card */}
                    {(notification.type === "CARD" || notification.type === "CARD_ORDER" || notification.type === "CARD_ACTIVATED") && notification.metadata?.cardLast4 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-[9px] font-black border border-cyan-500/15">
                          <CreditCard size={9} /> **** {notification.metadata.cardLast4}
                        </span>
                      </div>
                    )}

                    {/* Badges inline — Session */}
                    {(notification.type === "LOGIN" || notification.type === "SECURITY") && notification.metadata?.device && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-[9px] font-bold border border-amber-500/15">
                          <Smartphone size={9} /> {notification.metadata.device}
                        </span>
                        {notification.metadata.location && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 text-white/50 rounded-lg text-[9px] font-bold border border-white/5">
                            <MapPin size={9} /> {notification.metadata.location}
                          </span>
                        )}
                        {notification.metadata.ip && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 text-white/40 rounded-lg text-[9px] font-mono border border-white/5">
                            <Globe size={9} /> {notification.metadata.ip}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock size={9} className="text-white/20" />
                      <p className="text-[9px] text-white/30 font-medium">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    </div>

                    {/* Boutons Confirmer / Annuler pour les transactions en attente */}
                    {notification.type === "TRANSACTION_CONFIRM" && notification.metadata?.transactionId && !notification.read && (
                      <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                        {/* Badge montant */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-[10px] font-black border border-amber-500/20">
                            <ShieldCheck size={12} />
                            {formatPiAmount(notification.metadata.amount, notification.metadata.currency)} {notification.metadata.currency || "USD"}
                          </span>
                          {notification.metadata.senderName && (
                            <span className="text-[9px] text-white/40">
                              de {notification.metadata.senderName}
                            </span>
                          )}
                        </div>
                        {/* Boutons d'action */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => rejectTransaction(notification)}
                            className="flex-1 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-1"
                          >
                            <X size={12} />
                            Annuler
                          </button>
                          <button
                            onClick={() => openConfirmModal(notification)}
                            className="flex-1 py-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10"
                          >
                            <ShieldCheck size={12} />
                            Confirmer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
