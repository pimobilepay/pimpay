"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, Check, Trash2, ArrowLeft, RefreshCcw, 
  CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle,
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  createdAt: string;
  read: boolean;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calcul dynamique du sous-titre
  const unreadCount = notifications.filter(n => !n.read).length;

  // Fonction de récupération (useCallback pour le polling)
  const fetchNotifications = useCallback(async (showSilent = false) => {
    if (!showSilent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/notifications");
      
      if (res.status === 401) {
        // Redirection si session expirée
        return; 
      }

      const data = await res.json();
      if (res.ok) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Erreur polling:", err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, []);

  // Effet pour le chargement initial et le temps réel (Polling)
  useEffect(() => {
    fetchNotifications();

    // Mise à jour automatique toutes les 15 secondes
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);

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

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="text-emerald-400" size={18} />;
      case "warning": return <AlertTriangle className="text-amber-400" size={18} />;
      case "error": return <XCircle className="text-red-400" size={18} />;
      default: return <Info className="text-blue-400" size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      
      {/* HEADER FIXE */}
      <header className="px-6 pt-12 pb-6 sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl font-black uppercase tracking-tighter">Centre d'alertes</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[2px] mt-1">
              {unreadCount > 0 ? `${unreadCount} notifications non lues` : "Système à jour"}
            </p>
          </div>

          <button 
            onClick={() => fetchNotifications()}
            className={`w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between bg-white/5 p-1.5 rounded-2xl border border-white/5 mt-4">
          <button 
            onClick={markAllAsRead}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-white/5 rounded-xl transition-all"
          >
            <CheckCheck size={14} /> Tout marquer comme lu
          </button>
        </div>
      </header>

      <main className="px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-500">Chargement sécurisé</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-slate-900/50 rounded-[40px] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
              <Bell size={40} className="text-slate-800" />
            </div>
            <p className="text-base font-bold text-slate-400">Aucune activité</p>
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-2">Votre historique est vide</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 50 }}
                  className={`relative p-5 rounded-[30px] border transition-all ${
                    notif.read 
                    ? "bg-slate-900/30 border-white/5 grayscale-[0.5]" 
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
                            {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
