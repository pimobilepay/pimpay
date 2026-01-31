"use client";

import { Bell, Check, Info, AlertTriangle, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // RÉCUPÉRATION RÉELLE DES NOTIFICATIONS
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data);
    } catch (error) {
      console.error("Erreur notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Optionnel : Polling toutes les 30 secondes pour les nouvelles alertes
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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
                      n.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
                      n.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {n.type === 'success' ? <Check size={14} /> : n.type === 'error' ? <AlertTriangle size={14} /> : <Info size={14} />}
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

