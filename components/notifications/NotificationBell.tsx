"use client";

import { Bell, Check, Info, AlertTriangle, X, Loader2, Repeat, Banknote, DollarSign, TrendingUp, Coins } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown> & { type?: string };
}

interface NotificationBellProps {
  /** Tailwind classes for the bell trigger button (keeps each page's existing look) */
  buttonClassName?: string;
  /** Tailwind classes for the unread badge */
  badgeClassName?: string;
  /** lucide icon size for the bell */
  iconSize?: number;
}

function getIcon(type: string, metaType?: string) {
  if (type === "success" || type === "SUCCESS") return <Check size={14} />;
  if (type === "error") return <AlertTriangle size={14} />;
  if (type === "PAYMENT_RECEIVED" || type === "SALARY" || metaType === "SALARY") return <Banknote size={14} />;
  if (type === "PAYMENT_SENT" || metaType === "SALARY_BATCH") return <DollarSign size={14} />;
  if (type === "SWAP") return <Repeat size={14} />;
  if (type === "STAKING" || type === "STAKING_REWARD" || metaType === "STAKING" || metaType === "STAKING_REWARD") return <TrendingUp size={14} />;
  if (type === "STAKING_UNSTAKE" || metaType === "UNSTAKE") return <Coins size={14} />;
  return <Info size={14} />;
}

function getIconColor(type: string, metaType?: string) {
  if (type === "success" || type === "SUCCESS") return "bg-emerald-500/10 text-emerald-500";
  if (type === "error") return "bg-rose-500/10 text-rose-500";
  if (type === "PAYMENT_RECEIVED" || type === "SALARY" || metaType === "SALARY") return "bg-emerald-500/10 text-emerald-500";
  if (type === "PAYMENT_SENT" || metaType === "SALARY_BATCH") return "bg-amber-500/10 text-amber-500";
  if (type === "SWAP") return "bg-blue-500/10 text-blue-500";
  if (type === "STAKING" || type === "STAKING_REWARD" || metaType === "STAKING" || metaType === "STAKING_REWARD") return "bg-purple-500/10 text-purple-500";
  if (type === "STAKING_UNSTAKE" || metaType === "UNSTAKE") return "bg-orange-500/10 text-orange-500";
  return "bg-blue-500/10 text-blue-500";
}

export function NotificationBell({
  buttonClassName = "p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all relative",
  badgeClassName = "absolute -top-1 -right-1 min-w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-black text-white px-1",
  iconSize = 20,
}: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      const notifsArray: NotificationItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.notifications)
        ? data.notifications
        : [];
      setNotifications(notifsArray);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { all: true }),
      });
      fetchNotifications();
    } catch {
      toast.error("Erreur de mise a jour");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnread = unreadCount > 0;
  const preview = notifications.slice(0, 5);

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className={buttonClassName} aria-label="Notifications">
        <Bell size={iconSize} />
        {hasUnread && (
          <span className={badgeClassName}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown menu */}
          <div className="fixed top-16 right-4 left-4 z-[70] max-w-md mx-auto bg-[#0a0f1a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">Notifications</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {hasUnread && (
                  <button
                    onClick={() => markAsRead()}
                    className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[8px] font-black uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    Tout lu
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  aria-label="Fermer"
                >
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[320px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-10 flex justify-center">
                  <Loader2 className="animate-spin text-blue-500/30" />
                </div>
              ) : preview.length > 0 ? (
                preview.map((n) => {
                  const metaType = n.metadata?.type as string | undefined;
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.read) markAsRead(n.id);
                        setIsOpen(false);
                        router.push("/notifications");
                      }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/[0.03] cursor-pointer ${n.read ? "opacity-60" : ""}`}
                    >
                      <div className={`p-2 rounded-xl h-fit ${getIconColor(n.type, metaType)}`}>
                        {getIcon(n.type, metaType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">{n.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2">{n.message}</p>
                        <p className="text-[8px] text-slate-600 mt-1">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <Bell size={24} className="mb-2 opacity-30" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">Aucune notification</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/notifications");
                }}
                className="w-full py-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-600 hover:text-white transition-all"
              >
                Voir toutes les notifications
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
