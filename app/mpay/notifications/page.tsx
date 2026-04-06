"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Bell, Check, CheckCheck, Trash2, 
  ArrowDownLeft, ArrowUpRight, Shield, Loader2,
  RefreshCw, Filter, Clock, Zap, AlertCircle,
  ChevronRight, Wallet, X, TrendingUp, Coins, Gift,
  Repeat, Smartphone, Globe, MapPin, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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
  };
}

type FilterType = "all" | "payment" | "security" | "unread" | "staking";

export default function MPayNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/transaction/notifications");
      const data = await res.json();
      
      if (data.notifications) {
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

  // Real-time polling for new notifications
  useEffect(() => {
    fetchNotifications();
    
    // Polling toutes les 10 secondes pour les nouvelles notifications
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Show toast for new payment received
  useEffect(() => {
    const lastNotifId = sessionStorage.getItem("lastNotifId");
    const paymentNotifs = notifications.filter(
      n => (n.type === "PAYMENT_RECEIVED" || n.type === "success") && !n.read
    );
    
    if (paymentNotifs.length > 0 && paymentNotifs[0].id !== lastNotifId) {
      const latest = paymentNotifs[0];
      toast.success(latest.title, {
        description: latest.message,
        duration: 5000,
        style: {
          background: "rgba(16, 185, 129, 0.95)",
          border: "1px solid rgba(52, 211, 153, 0.3)",
          color: "#fff",
        },
      });
      sessionStorage.setItem("lastNotifId", latest.id);
    }
  }, [notifications]);

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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      toast.error("Erreur de suppression");
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === "unread") return !n.read;
    if (activeFilter === "payment") return n.type === "PAYMENT_RECEIVED" || n.type === "PAYMENT_SENT" || n.type === "success";
    if (activeFilter === "security") return n.type === "SECURITY" || n.type === "LOGIN";
    if (activeFilter === "staking") return n.type === "STAKING" || n.type === "STAKING_REWARD" || n.type === "STAKING_UNSTAKE" || n.metadata?.type === "STAKING" || n.metadata?.type === "UNSTAKE";
    return true;
  });

  // Get icon based on notification type
  const getNotificationIcon = (type: string, metadata?: Notification["metadata"]) => {
    switch (type) {
      case "PAYMENT_RECEIVED":
      case "success":
        return <ArrowDownLeft size={18} className="text-emerald-400" />;
      case "PAYMENT_SENT":
        return <ArrowUpRight size={18} className="text-red-400" />;
      case "SECURITY":
      case "LOGIN":
        return <Shield size={18} className="text-amber-400" />;
      case "STAKING":
      case "STAKING_REWARD":
        return <TrendingUp size={18} className="text-purple-400" />;
      case "STAKING_UNSTAKE":
        return <Coins size={18} className="text-orange-400" />;
      default:
        if (metadata?.type === "STAKING") return <TrendingUp size={18} className="text-purple-400" />;
        if (metadata?.type === "UNSTAKE") return <Coins size={18} className="text-orange-400" />;
        return <Bell size={18} className="text-blue-400" />;
    }
  };

  // Get background color based on type
  const getNotificationBg = (type: string, read: boolean, metadata?: Notification["metadata"]) => {
    if (read) return "bg-white/[0.02]";
    switch (type) {
      case "PAYMENT_RECEIVED":
      case "success":
        return "bg-emerald-500/5 border-l-2 border-l-emerald-500";
      case "PAYMENT_SENT":
        return "bg-red-500/5 border-l-2 border-l-red-500";
      case "SECURITY":
      case "LOGIN":
        return "bg-amber-500/5 border-l-2 border-l-amber-500";
      case "STAKING":
      case "STAKING_REWARD":
        return "bg-purple-500/5 border-l-2 border-l-purple-500";
      case "STAKING_UNSTAKE":
        return "bg-orange-500/5 border-l-2 border-l-orange-500";
      default:
        if (metadata?.type === "STAKING") return "bg-purple-500/5 border-l-2 border-l-purple-500";
        if (metadata?.type === "UNSTAKE") return "bg-orange-500/5 border-l-2 border-l-orange-500";
        return "bg-blue-500/5 border-l-2 border-l-blue-500";
    }
  };

  // Notification Detail Modal Component
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
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  notification.type === "PAYMENT_RECEIVED" || notification.type === "success" ? "bg-emerald-500/10" :
                  notification.type === "PAYMENT_SENT" ? "bg-red-500/10" :
                  notification.type === "STAKING" || notification.type === "STAKING_REWARD" ? "bg-purple-500/10" :
                  "bg-blue-500/10"
                }`}>
                  {getNotificationIcon(notification.type, notification.metadata)}
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-tight">{notification.title}</h2>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
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
            {/* Message */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Message</p>
              <p className="text-sm text-white leading-relaxed">{notification.message}</p>
            </div>

            {/* Transaction Details for Payment */}
            {metadata && (notification.type === "PAYMENT_RECEIVED" || notification.type === "success" || notification.type === "PAYMENT_SENT") && (
              <div className="space-y-4">
                {metadata.amount && !metadata.stakingAmount && (
                  <div className={`rounded-2xl p-4 border ${
                    notification.type === "PAYMENT_SENT" 
                      ? "bg-red-500/5 border-red-500/20" 
                      : "bg-emerald-500/5 border-emerald-500/20"
                  }`}>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Montant</p>
                    <p className={`text-2xl font-black ${
                      notification.type === "PAYMENT_SENT" ? "text-red-400" : "text-emerald-400"
                    }`}>
                      {notification.type === "PAYMENT_SENT" ? "-" : "+"}{Number(metadata.amount).toLocaleString()} {metadata.currency || "Pi"}
                    </p>
                  </div>
                )}

                {metadata.from && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Expediteur</p>
                    <p className="text-sm font-bold text-white">{metadata.from}</p>
                  </div>
                )}

                {metadata.to && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Destinataire</p>
                    <p className="text-sm font-bold text-white">{metadata.to}</p>
                  </div>
                )}

                {metadata.txId && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Transaction ID</p>
                    <p className="text-xs font-mono text-slate-300 break-all">{metadata.txId}</p>
                  </div>
                )}
              </div>
            )}

            {/* Staking Details */}
            {metadata && (notification.type === "STAKING" || notification.type === "STAKING_REWARD" || notification.type === "STAKING_UNSTAKE" || metadata.type === "STAKING" || metadata.type === "UNSTAKE") && (
              <div className="space-y-4">
                {metadata.stakingAmount && (
                  <div className="bg-purple-500/5 rounded-2xl p-4 border border-purple-500/20">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Montant Stake</p>
                    <p className="text-2xl font-black text-purple-400">{metadata.stakingAmount} {metadata.currency || "PI"}</p>
                  </div>
                )}

                {metadata.rewardAmount && (
                  <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/20">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Recompense</p>
                    <p className="text-2xl font-black text-emerald-400">+{metadata.rewardAmount} {metadata.currency || "PI"}</p>
                  </div>
                )}

                {metadata.apy && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">APY</p>
                    <p className="text-lg font-black text-blue-400">{metadata.apy}%</p>
                  </div>
                )}

                {metadata.duration && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Duree</p>
                    <p className="text-sm font-bold text-white">{metadata.duration}</p>
                  </div>
                )}

                {metadata.unlockDate && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Date de deblocage</p>
                    <p className="text-sm font-bold text-white">{new Date(metadata.unlockDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}

                {metadata.stakingId && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">ID Staking</p>
                    <p className="text-xs font-mono text-slate-300">{metadata.stakingId}</p>
                  </div>
                )}
              </div>
            )}

            {/* Security Details */}
            {(notification.type === "SECURITY" || notification.type === "LOGIN") && (
              <div className="space-y-4">
                <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <Shield size={20} className="text-amber-400" />
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alerte Securite</p>
                      <p className="text-sm font-bold text-amber-400">{notification.type === "LOGIN" ? "Nouvelle connexion" : "Alerte de securite"}</p>
                    </div>
                  </div>
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
    <div className="min-h-screen bg-[#020617] text-white font-sans">
      {/* Notification Detail Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <NotificationDetailModal 
            notification={selectedNotification} 
            onClose={() => setSelectedNotification(null)} 
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button 
          onClick={() => router.back()} 
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">Notifications</h1>
          <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase">
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
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[
            { id: "all", label: "Tout", icon: Bell },
            { id: "unread", label: "Non lues", icon: AlertCircle },
            { id: "payment", label: "Paiements", icon: Wallet },
            { id: "staking", label: "Staking", icon: TrendingUp },
            { id: "security", label: "Securite", icon: Shield },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as FilterType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border shrink-0 ${
                activeFilter === filter.id
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
                  : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10"
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
        <div className="px-6 py-3">
          <button
            onClick={markAllAsRead}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/10 transition-all"
          >
            <CheckCheck size={16} />
            Tout marquer comme lu
          </button>
        </div>
      )}

      {/* Notifications List */}
      <main className="px-6 pb-32">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Chargement...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10">
              <Bell size={32} className="text-slate-600" />
            </div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {activeFilter === "unread" ? "Aucune notification non lue" : "Aucune notification"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`relative rounded-2xl border border-white/10 overflow-hidden transition-all ${getNotificationBg(notif.type, notif.read, notif.metadata)}`}
              >
                <button
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id);
                    // Open notification detail modal
                    setSelectedNotification(notif);
                  }}
                  className="w-full p-4 flex items-start gap-4 text-left hover:bg-white/[0.03] transition-all"
                >
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    notif.type === "PAYMENT_RECEIVED" || notif.type === "success" ? "bg-emerald-500/10" :
                    notif.type === "PAYMENT_SENT" ? "bg-red-500/10" :
                    notif.type === "SECURITY" || notif.type === "LOGIN" ? "bg-amber-500/10" :
                    notif.type === "STAKING" || notif.type === "STAKING_REWARD" || notif.metadata?.type === "STAKING" ? "bg-purple-500/10" :
                    notif.type === "STAKING_UNSTAKE" || notif.metadata?.type === "UNSTAKE" ? "bg-orange-500/10" :
                    "bg-blue-500/10"
                  }`}>
                    {getNotificationIcon(notif.type, notif.metadata)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-xs font-black uppercase tracking-tight ${notif.read ? "text-slate-400" : "text-white"}`}>
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    
                    {/* Amount if payment */}
                    {notif.metadata?.amount && !notif.metadata?.stakingAmount && !notif.metadata?.rewardAmount && (
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${
                        notif.type === "PAYMENT_RECEIVED" || notif.type === "success" 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : "bg-red-500/10 text-red-400"
                      }`}>
                        <Zap size={10} />
                        {notif.type === "PAYMENT_RECEIVED" || notif.type === "success" ? "+" : "-"}
                        {notif.metadata.amount} {notif.metadata.currency || "Pi"}
                      </div>
                    )}

                    {/* Staking details */}
                    {(notif.metadata?.stakingAmount || notif.metadata?.rewardAmount) && (
                      <div className="mt-2 space-y-1.5">
                        {notif.metadata?.stakingAmount && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-400">
                            <TrendingUp size={10} />
                            {notif.metadata.stakingAmount} {notif.metadata.currency || "PI"} stake
                          </div>
                        )}
                        {notif.metadata?.rewardAmount && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 ml-1">
                            <Gift size={10} />
                            +{notif.metadata.rewardAmount} {notif.metadata.currency || "PI"} recompense
                          </div>
                        )}
                        {notif.metadata?.apy && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-400 ml-1">
                            {notif.metadata.apy}% APY
                          </div>
                        )}
                        {notif.metadata?.duration && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-slate-500/10 text-slate-400 ml-1">
                            <Clock size={10} />
                            {notif.metadata.duration}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Unstake details */}
                    {(notif.type === "STAKING_UNSTAKE" || notif.metadata?.type === "UNSTAKE") && notif.metadata?.amount && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-orange-500/10 text-orange-400">
                        <Coins size={10} />
                        {notif.metadata.amount} {notif.metadata.currency || "PI"} debloques
                      </div>
                    )}

                    {/* Time */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock size={10} className="text-slate-600" />
                      <span className="text-[9px] font-bold text-slate-600">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-slate-600 shrink-0 mt-1" />
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  className="absolute top-3 right-12 p-2 bg-white/5 rounded-xl opacity-0 hover:opacity-100 hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Real-time indicator */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-40">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Zap size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest">Notifications en temps reel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[8px] font-black text-emerald-500 uppercase">Actif</span>
          </div>
        </div>
      </div>
    </div>
  );
}
