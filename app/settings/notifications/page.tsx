"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Check, Trash2, ArrowLeft, RefreshCcw,
  CheckCheck, Info, ShieldCheck, ArrowDownLeft, 
  ArrowUpRight, Store, LogIn, Clock, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Types alignés sur ton usage et la flexibilité de ton schéma Prisma
type NotificationType = "SECURITY" | "PAYMENT_RECEIVED" | "PAYMENT_SENT" | "MERCHANT" | "LOGIN" | "SYSTEM" | "SWAP";                         
type Notification = {
  id: string;
  title: string;
  message: string;
  type: string; // String dans Prisma
  createdAt: string;
  read: boolean;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);

  // Gestion des onglets de filtrage
  const [activeTab, setActiveTab] = useState<"ALL" | NotificationType>("ALL");

  const fetchNotifications = useCallback(async (showSilent = false) => {
    if (!showSilent) setIsRefreshing(true);
    try {
      // On utilise la route au singulier si tu suis ta logique dossier
      const res = await fetch("/api/transaction/notifications");

      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      const data = await res.json();

      if (res.ok && isMounted.current) {
        const freshNotifs = data.notifications || [];
        setNotifications(freshNotifs);
        setUnreadCount(data.unreadCount ?? freshNotifs.filter((n: Notification) => !n.read).length);
      }
    } catch (err) {
      console.error("Erreur polling:", err);
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

    // Polling toutes les 15 secondes pour les nouvelles alertes
    const interval = setInterval(() => fetchNotifications(true), 15000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/transaction/notifications", {
        method: "POST", // On peut utiliser POST ou PATCH
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_ALL_READ" }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        toast.success("Toutes les alertes ont été lues");
      }
    } catch (e) {
      toast.error("Erreur de mise à jour");
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      const res = await fetch(`/api/transaction/notifications?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      toast.error("Suppression impossible");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "SECURITY": return <ShieldCheck className="text-rose-500" size={18} />;
      case "PAYMENT_RECEIVED": return <ArrowDownLeft className="text-emerald-400" size={18} />;
      case "PAYMENT_SENT": return <ArrowUpRight className="text-blue-400" size={18} />;
      case "MERCHANT": return <Store className="text-amber-400" size={18} />;
      case "LOGIN": return <LogIn className="text-indigo-400" size={18} />;
      default: return <Info className="text-slate-400" size={18} />;
    }
  };

  // Filtrage intelligent
  const filteredNotifications = activeTab === "ALL"
    ? notifications
    : notifications.filter(n => n.type === activeTab);

  const tabs = [
    { id: "ALL", label: "Tout" },
    { id: "PAYMENT_RECEIVED", label: "Reçus" },
    { id: "SECURITY", label: "Sécurité" },
    { id: "MERCHANT", label: "Marchands" }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* HEADER FIXE */}
      <header className="px-6 pt-12 pb-4 sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl font-black uppercase tracking-tighter italic">PimPay<span className="text-blue-500">.Alerts</span></h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[2px] mt-1">
              {unreadCount > 0 ? `${unreadCount} nouveaux messages` : "Système à jour"}
            </p>
          </div>
          <button onClick={() => fetchNotifications()} className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all">
            <RefreshCcw size={18} className={isRefreshing ? 'animate-spin text-blue-500' : ''} />
          </button>
        </div>

        {/* ONGLETS DE FILTRE */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                activeTab === tab.id
                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20"
                : "bg-white/5 border-white/5 text-slate-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button 
          onClick={markAllAsRead} 
          className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 rounded-2xl border border-white/5 hover:text-blue-400 transition-all"
        >
          <CheckCheck size={14} /> Tout marquer comme lu
        </button>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-500">Vérification du flux...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-slate-900/50 rounded-[40px] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
              <Bell size={40} className="text-slate-800" />
            </div>
            <p className="text-base font-bold text-slate-400 italic">Silence radio</p>
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-2">Aucune alerte trouvée ici</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`relative p-5 rounded-[30px] border transition-all ${
                    notif.read
                    ? "bg-slate-900/30 border-white/5 opacity-70"
                    : "bg-gradient-to-br from-blue-600/10 to-slate-900/50 border-blue-500/20 shadow-lg"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                      notif.read ? "bg-slate-800" : "bg-blue-600/20 text-blue-400"
                    }`}>
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className={`text-sm font-bold truncate pr-4 ${notif.read ? 'text-slate-400' : 'text-white'}`}>
                          {notif.title}
                        </h3>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]" />
                        )}
                      </div>

                      <p className={`text-xs mt-1 leading-relaxed ${notif.read ? 'text-slate-500' : 'text-slate-300'}`}>
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock size={10} />
                          <span className="text-[9px] font-black uppercase tracking-tighter">
                            {new Date(notif.createdAt).toLocaleDateString('fr-FR')} • {new Date(notif.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>

                        <button
                          onClick={() => deleteNotif(notif.id)}
                          className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-90 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
