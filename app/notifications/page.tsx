"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Bell, CheckCheck, Trash2, 
  ArrowDownLeft, ArrowUpRight, Shield, Loader2,
  RefreshCw, Filter, AlertCircle,
  Wallet, X, TrendingUp, Coins, CreditCard,
  Info
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
  };
}

type FilterType = "all" | "payment" | "security" | "unread" | "card";

export default function NotificationsPage() {
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
      case "CARD":
      case "CARD_ORDER":
      case "CARD_ACTIVATED":
        return <CreditCard size={18} className="text-cyan-400" />;
      default:
        return <Bell size={18} className="text-blue-400" />;
    }
  };

  // Get background color based on type
  const getNotificationBg = (type: string, read: boolean) => {
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
      case "CARD":
      case "CARD_ORDER":
      case "CARD_ACTIVATED":
        return "bg-cyan-500/5 border-l-2 border-l-cyan-500";
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

            {/* Transaction Details */}
            {metadata && metadata.amount && (
              <div className={`rounded-2xl p-4 border ${
                notification.type === "PAYMENT_SENT" 
                  ? "bg-red-500/5 border-red-500/20" 
                  : "bg-emerald-500/5 border-emerald-500/20"
              }`}>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Montant</p>
                <p className={`text-2xl font-black ${
                  notification.type === "PAYMENT_SENT" ? "text-red-400" : "text-emerald-400"
                }`}>
                  {notification.type === "PAYMENT_SENT" ? "-" : "+"}{Number(metadata.amount).toLocaleString()} {metadata.currency || "Pi"}
                </p>
              </div>
            )}

            {metadata?.cardLast4 && (
              <div className="bg-cyan-500/5 rounded-2xl p-4 border border-cyan-500/20">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Carte</p>
                <p className="text-lg font-mono font-bold text-cyan-400">**** **** **** {metadata.cardLast4}</p>
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
                className={`p-4 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/5 transition-all ${getNotificationBg(notification.type, notification.read)}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    notification.read ? "bg-white/5" : "bg-white/10"
                  }`}>
                    {getNotificationIcon(notification.type, notification.metadata)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm font-bold truncate ${notification.read ? "text-white/60" : "text-white"}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full shrink-0 mt-1.5 animate-pulse"></div>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 line-clamp-2 ${notification.read ? "text-white/30" : "text-white/50"}`}>
                      {notification.message}
                    </p>
                    <p className="text-[9px] text-white/30 mt-2 font-medium">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}
                    </p>
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
