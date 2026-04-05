"use client";

import { Bell, Check, Info, AlertTriangle, X, Loader2, ArrowDownLeft, ArrowUpRight, Repeat, Banknote, DollarSign, TrendingUp, Coins, Gift } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface NotificationMetadata {
  amount?: number;
  currency?: string;
  fromAmount?: number;
  toAmount?: number;
  fromCurrency?: string;
  toCurrency?: string;
  location?: string;
  reference?: string;
  method?: string;
  fee?: number;
  network?: string;
  // Salary specific
  senderName?: string;
  businessId?: string;
  position?: string;
  paymentDate?: string;
  employeeCount?: number;
  successCount?: number;
  pendingCount?: number;
  type?: string;
  status?: string;
  // Staking specific
  stakingAmount?: number;
  rewardAmount?: number;
  apy?: number;
  duration?: string;
  stakingId?: string;
  stakingStatus?: string;
  unlockDate?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  metadata?: NotificationMetadata;
}

// Helper pour afficher un toast enrichi selon le type de notification
function showNotificationToast(notif: Notification) {
  const meta = notif.metadata;
  
  if (notif.type === "SUCCESS" || notif.type === "PAYMENT_RECEIVED") {
    toast.success(notif.title, {
      description: meta?.amount 
        ? `+${Number(meta.amount).toLocaleString()} ${meta.currency || "PI"} credite` 
        : notif.message,
      duration: 6000,
    });
  } else if (notif.type === "PAYMENT_SENT") {
    toast.info(notif.title, {
      description: meta?.amount 
        ? `-${Number(meta.amount).toLocaleString()} ${meta.currency || "PI"} envoye` 
        : notif.message,
      duration: 6000,
    });
  } else if (notif.type === "SWAP") {
    toast.success(notif.title, {
      description: meta?.fromAmount && meta?.toAmount 
        ? `${meta.fromAmount} ${meta.fromCurrency} → ${Number(meta.toAmount).toLocaleString()} ${meta.toCurrency}` 
        : notif.message,
      duration: 6000,
    });
  } else if (notif.type === "SALARY" || meta?.type === "SALARY") {
    // Notification de salaire recu
    toast.success(notif.title, {
      description: meta?.amount && meta?.senderName 
        ? `+${Number(meta.amount).toLocaleString()} ${meta.currency || "USD"} de ${meta.senderName}` 
        : notif.message,
      duration: 8000,
    });
  } else if (meta?.type === "SALARY_BATCH") {
    // Notification de paiement salaires envoye (business)
    toast.success(notif.title, {
      description: meta?.employeeCount 
        ? `${meta.employeeCount} employe(s) payes pour ${Number(meta.amount).toLocaleString()} ${meta.currency || "USD"}` 
        : notif.message,
      duration: 8000,
    });
  } else if (notif.type === "SECURITY" || notif.type === "LOGIN") {
    toast.warning(notif.title, {
      description: meta?.location ? `Connexion depuis ${meta.location}` : notif.message,
      duration: 8000,
    });
  } else if (notif.type === "STAKING" || notif.type === "STAKING_REWARD" || meta?.type === "STAKING") {
    // Notification de staking
    toast.success(notif.title, {
      description: meta?.stakingAmount 
        ? `${Number(meta.stakingAmount).toLocaleString()} ${meta.currency || "PI"} stake a ${meta.apy || 0}% APY` 
        : meta?.rewardAmount 
          ? `+${Number(meta.rewardAmount).toLocaleString()} ${meta.currency || "PI"} de recompense`
          : notif.message,
      duration: 8000,
    });
  } else if (notif.type === "STAKING_UNSTAKE" || meta?.type === "UNSTAKE") {
    // Notification de unstaking
    toast.info(notif.title, {
      description: meta?.amount 
        ? `${Number(meta.amount).toLocaleString()} ${meta.currency || "PI"} debloques` 
        : notif.message,
      duration: 6000,
    });
  } else {
    toast(notif.title, { description: notif.message, duration: 5000 });
  }
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const lastNotifIdRef = useRef<string | null>(null);
  const isFirstFetch = useRef(true);

  // RÉCUPÉRATION RÉELLE DES NOTIFICATIONS avec detection de nouvelles
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      const notifsArray = Array.isArray(data) ? data : [];
      
      // Detecter les nouvelles notifications pour afficher un toast instantane
      if (!isFirstFetch.current && notifsArray.length > 0) {
        const latestNotif = notifsArray[0];
        if (lastNotifIdRef.current && latestNotif.id !== lastNotifIdRef.current && !latestNotif.read) {
          // Nouvelle notification detectee - afficher un toast
          showNotificationToast(latestNotif);
        }
      }
      
      // Mettre a jour la reference de la derniere notification
      if (notifsArray.length > 0) {
        lastNotifIdRef.current = notifsArray[0].id;
      }
      isFirstFetch.current = false;
      
      setNotifications(notifsArray);
    } catch (error) {
      console.error("Erreur notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Polling rapide (5 secondes) pour des notifications quasi temps reel
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id?: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      fetchNotifications();
    } catch (error) {
      toast.error("Erreur de mise à jour");
    }
  };

  const hasUnread = notifications.some(n => !n.read);

  return (
    <div className="relative">
      {/* ICÔNE BELL AVEC BADGE NÉON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
      >
        <Bell size={20} className={`${hasUnread ? 'text-blue-400' : 'text-slate-400'} group-hover:scale-110 transition-transform`} />
        {hasUnread && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#020617] animate-pulse shadow-[0_0_8px_#f43f5e]"></span>
        )}
      </button>

      {/* DROPDOWN GLASSMORPHISM */}
      {isOpen && (
        <div className="absolute right-0 mt-4 w-80 bg-[#0f172a]/95 border border-white/10 backdrop-blur-2xl rounded-[24px] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
              Centre de Commandes
            </h3>
            <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform">
              <X size={14} className="text-slate-500" />
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500/20" /></div>
            ) : notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer relative overflow-hidden ${!n.read ? 'bg-blue-500/[0.03]' : ''}`}
                >
                  {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-lg h-fit ${
                      n.type === 'success' || n.type === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' : 
                      n.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 
                      n.type === 'PAYMENT_RECEIVED' || n.type === 'SALARY' || (n.metadata as NotificationMetadata)?.type === 'SALARY' ? 'bg-emerald-500/10 text-emerald-500' :
                      n.type === 'PAYMENT_SENT' || (n.metadata as NotificationMetadata)?.type === 'SALARY_BATCH' ? 'bg-amber-500/10 text-amber-500' :
                      n.type === 'SWAP' ? 'bg-blue-500/10 text-blue-500' :
                      n.type === 'STAKING' || n.type === 'STAKING_REWARD' || (n.metadata as NotificationMetadata)?.type === 'STAKING' ? 'bg-purple-500/10 text-purple-500' :
                      n.type === 'STAKING_UNSTAKE' || (n.metadata as NotificationMetadata)?.type === 'UNSTAKE' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {n.type === 'success' || n.type === 'SUCCESS' ? <Check size={14} /> : 
                       n.type === 'error' ? <AlertTriangle size={14} /> : 
                       n.type === 'PAYMENT_RECEIVED' || n.type === 'SALARY' || (n.metadata as NotificationMetadata)?.type === 'SALARY' ? <Banknote size={14} /> :
                       n.type === 'PAYMENT_SENT' || (n.metadata as NotificationMetadata)?.type === 'SALARY_BATCH' ? <DollarSign size={14} /> :
                       n.type === 'SWAP' ? <Repeat size={14} /> :
                       n.type === 'STAKING' || n.type === 'STAKING_REWARD' || (n.metadata as NotificationMetadata)?.type === 'STAKING' ? <TrendingUp size={14} /> :
                       n.type === 'STAKING_UNSTAKE' || (n.metadata as NotificationMetadata)?.type === 'UNSTAKE' ? <Coins size={14} /> :
                       <Info size={14} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-black uppercase text-white tracking-tight">{n.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-[8px] text-slate-600 font-bold uppercase mt-2 italic tracking-tighter">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center flex flex-col items-center gap-2 opacity-20">
                <Bell size={24} />
                <p className="text-[10px] font-black uppercase tracking-widest">Fréquence libre</p>
              </div>
            )}
          </div>

          {hasUnread && (
            <button 
              onClick={() => markAsRead()}
              className="w-full py-3 text-[9px] font-black uppercase text-blue-400 hover:bg-blue-400/10 transition-all border-t border-white/5"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
      )}
    </div>
  );
}

