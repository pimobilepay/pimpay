"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, Check, Trash2, ArrowLeft, RefreshCcw, 
  CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle 
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  // Calcul du nombre de notifications non lues pour le sous-titre
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/notifications`);
      const data = await res.json();
      if (res.ok) setNotifications(data);
    } catch (err) {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await fetch('/api/notifications/read-all', { method: 'POST' });
      toast.success("Toutes les notifications sont lues");
    } catch (e) {
      toast.error("Échec de l'opération");
    }
  };

  const deleteNotif = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
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
      
      {/* HEADER SANS ITALIQUE AVEC SOUS-TITRE */}
      <header className="px-6 pt-12 pb-6 sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-90 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black uppercase tracking-tighter">Alertes & News</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">
              {unreadCount > 0 ? `${unreadCount} nouveaux messages` : "Aucun nouveau message"}
            </p>
          </div>

          <button 
            onClick={fetchNotifications}
            className={`w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-90 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between bg-white/5 p-2 rounded-2xl border border-white/5 mt-4">
          <button 
            onClick={markAllAsRead}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-white/5 rounded-xl transition-all"
          >
            <CheckCheck size={14} /> Tout lire
          </button>
          <div className="w-[1px] h-4 bg-white/10" />
          <button className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Filtres
          </button>
        </div>
      </header>

      <main className="px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Synchronisation...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-900 rounded-[32px] flex items-center justify-center mb-4 border border-white/5">
              <Bell size={32} className="text-slate-700" />
            </div>
            <p className="text-sm font-bold text-slate-400">Rien à signaler pour le moment</p>
            <p className="text-[10px] text-slate-600 uppercase mt-2">Revenez plus tard</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative p-5 rounded-[28px] border transition-all ${
                    notif.read 
                    ? "bg-slate-900/20 border-white/5 opacity-70" 
                    : "bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/20"
                  }`}
                >
                  {!notif.read && (
                    <div className="absolute top-5 right-5 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  )}

                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      notif.read ? "bg-slate-900" : "bg-blue-600/20"
                    }`}>
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`text-sm font-bold ${notif.read ? 'text-slate-300' : 'text-white'}`}>
                          {notif.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                          {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => deleteNotif(notif.id)}
                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
