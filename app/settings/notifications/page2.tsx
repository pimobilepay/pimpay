"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Check, Trash2, ArrowLeft, RefreshCcw,
  CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle,
  Clock, ShieldCheck, ArrowDownLeft, ArrowUpRight, Store, LogIn
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Types mis à jour selon la nouvelle API robuste
type NotificationType = "SECURITY" | "PAYMENT_RECEIVED" | "PAYMENT_SENT" | "MERCHANT" | "LOGIN" | "SYSTEM";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Gestion des onglets de filtrage
  const [activeTab, setActiveTab] = useState<"ALL" | NotificationType>("ALL");

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async (showSilent = false) => {
    if (!showSilent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.status === 401) return;
      
      const data = await res.json();
      if (res.ok) {
        // L'API renvoie maintenant { notifications: [], unreadCount: 0 }
        setNotifications(data.notifications || data); 
      }
    } catch (err) {
      console.error("Erreur polling:", err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(true), 15000);
    return () => clearInterval(interval);
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
        toast.success("Toutes les alertes ont été lues");
      }
    } catch (e) {
      toast.error("Erreur lors de l'opération");
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) {
      toast.error("Impossible de supprimer");
    }
  };

  // Icônes spécifiques par type de notification
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "SECURITY": return <ShieldCheck className="text-rose-500" size={18} />;
      case "PAYMENT_RECEIVED": return <ArrowDownLeft className="text-emerald-400" size={18} />;
      case "PAYMENT_SENT": return <ArrowUpRight className="text-blue-400" size={18} />;
      case "MERCHANT": return <Store className="text-amber-400" size={18} />;
      case "LOGIN": return <LogIn className="text-indigo-400" size={18} />;
      default: return <Info className="text-slate-400" size={18} />;
    }
  };

  // Filtrage des notifications selon l'onglet
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
      <header className="px-6 pt-12 pb-4 sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl font-black uppercase tracking-tighter">Centre d'alertes</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[2px] mt-1">
              {unreadCount > 0 ? `${unreadCount} nouvelles alertes` : "Système protégé"}
            </p>
          </div>
          <button onClick={() => fetchNotifications()} className={`w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
            <RefreshCcw size={18} />
          </button>
        </div>

        {/* SYSTÈME D'ONGLETS (TABS) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-4">
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

        <button onClick={markAllAsRead} className="w-full flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 rounded-2xl border border-white/5 hover:text-blue-400 transition-all mt-2">
          <CheckCheck size={14} /> Tout marquer comme lu
        </button>
      </header>

      <main className="px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-500">Scan sécurisé...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-slate-900/50 rounded-[40px] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
              <Bell size={40} className="text-slate-800" />
            </div>
            <p className="text-base font-bold text-slate-400">Rien à signaler</p>
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-2">Aucune alerte dans cette catégorie</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 50 }}
                  className={`relative p-5 rounded-[30px] border transition-all ${
                    notif.read
                    ? "bg-slate-900/30 border-white/5 opacity-70"
                    : "bg-gradient-to-br from-blue-600/15 to-slate-900/50 border-blue-500/30 shadow-lg shadow-blue-900/10"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                      notif.read ? "bg-slate-800" : "bg-blue-600/20"
                    }`}>
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className={`text-sm font-bold truncate pr-4 ${notif.read ? 'text-slate-400' : 'text-white'}`}>
                          {notif.title}
                        </h3>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]" />
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
