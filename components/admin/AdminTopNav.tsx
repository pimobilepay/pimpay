"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, ArrowLeft, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

interface NotificationCounts {
  kyc: number;
  transactions: number;
  users: number;
  tickets: number;
  messages: number;
}

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  read: boolean;
  timeAgo: string;
}

interface AdminTopNavProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  showBack?: boolean;
  backPath?: string;
}

export function AdminTopNav({ 
  title = "Administration", 
  subtitle = "PimPay",
  onRefresh,
  showBack = true,
  backPath = "/"
}: AdminTopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({ kyc: 0, transactions: 0, users: 0, tickets: 0, messages: 0 });

  // FIX: Use refs instead of state for tracking values used inside useCallback.
  // Putting isFirstLoad and lastNotifIds in useState caused the useCallback to
  // rebuild on every fetch (because setLastNotifIds triggered a re-render),
  // which rebuilt the interval, causing an infinite polling loop and stale
  // closures where new notifications were never detected correctly.
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
        setUrgentCount(data.urgentCount || 0);
        setNotifications(data.notifications?.slice(0, 5) || []);
        setCounts(data.counts || { kyc: 0, transactions: 0, users: 0, tickets: 0, messages: 0 });

        // Detect new notifications and show toast (skip first load)
        if (!isFirstLoadRef.current && data.notifications?.length > 0) {
          data.notifications.forEach((notif: AdminNotification) => {
            if (!knownIdsRef.current.has(notif.id) && knownIdsRef.current.size > 0) {
              // New notification detected
              const priorityColors: Record<string, string> = {
                urgent: "rgba(239, 68, 68, 0.95)",
                high: "rgba(245, 158, 11, 0.95)",
                medium: "rgba(59, 130, 246, 0.95)",
                low: "rgba(16, 185, 129, 0.95)",
              };

              toast(notif.title, {
                description: notif.message,
                duration: 5000,
                style: {
                  background: priorityColors[notif.priority] || priorityColors.medium,
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#fff",
                },
              });
            }
          });
        }

        // Update refs — no state update, no re-render, no dep loop
        if (data.notifications?.length > 0) {
          knownIdsRef.current = new Set(data.notifications.map((n: AdminNotification) => n.id));
        }
        if (isFirstLoadRef.current) {
          isFirstLoadRef.current = false;
        }
      }
    } catch {
      // Silent fail
    }
  }, []); // FIX: stable — no state dependencies, uses refs only

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "medium": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "KYC_PENDING": return "ID";
      case "TRANSACTION_PENDING": return "TX";
      case "NEW_USER": return "U+";
      case "SUPPORT_TICKET": return "TK";
      case "MESSAGE": return "MS";
      default: return "!";
    }
  };

  return (
    <>
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06] -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          {showBack ? (
            <button 
              onClick={() => router.push(backPath)} 
              className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <div className="w-11" />
          )}
          
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">{subtitle}</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">{title}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Notifications Button */}
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className="relative p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-black rounded-full ${
                  urgentCount > 0 ? "bg-red-500 animate-pulse" : "bg-blue-500"
                }`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            
            {/* Refresh Button */}
            {onRefresh && (
              <button 
                onClick={onRefresh} 
                className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Preview Dropdown */}
      {showPreview && (
        <>
          <div 
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          />
          <div className="fixed top-16 right-4 left-4 z-[70] max-w-md mx-auto bg-[#0a0f1a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">Notifications</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </p>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-5 gap-1 p-3 border-b border-white/5 bg-white/[0.02]">
              {[
                { label: "KYC", count: counts.kyc, color: "amber" },
                { label: "TX", count: counts.transactions, color: "blue" },
                { label: "Users", count: counts.users, color: "emerald" },
                { label: "Tickets", count: counts.tickets, color: "purple" },
                { label: "Msgs", count: counts.messages, color: "cyan" },
              ].map((stat) => (
                <div key={stat.label} className="text-center py-2">
                  <p className={`text-sm font-black text-${stat.color}-400`}>{stat.count}</p>
                  <p className="text-[7px] font-bold text-slate-600 uppercase">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Notifications List */}
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/[0.03] cursor-pointer"
                    onClick={() => {
                      setShowPreview(false);
                      if (notif.type === "KYC_PENDING") router.push("/admin/kyc");
                      else if (notif.type === "TRANSACTION_PENDING") router.push("/admin/transactions");
                      else if (notif.type === "NEW_USER") router.push("/admin/users");
                      else if (notif.type === "SUPPORT_TICKET") router.push("/admin/support");
                      else router.push("/admin/notifications");
                    }}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[9px] font-black border ${getPriorityColor(notif.priority)}`}>
                      {getTypeIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">{notif.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{notif.message}</p>
                      <p className="text-[8px] text-slate-600 mt-1">{notif.timeAgo}</p>
                    </div>
                  </div>
                ))
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
                  setShowPreview(false);
                  router.push("/admin/notifications");
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
