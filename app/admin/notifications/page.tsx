"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, FileCheck, ArrowRightLeft, Users, Headphones, MessageSquare,
  AlertTriangle, CheckCircle, Clock, RefreshCw, ChevronRight,
  Shield, Loader2, X, Search
} from "lucide-react";
import { toast } from "sonner";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

interface AdminNotification {
  id: string;
  type: "KYC_PENDING" | "TRANSACTION_PENDING" | "NEW_USER" | "SUPPORT_TICKET" | "WITHDRAWAL_PENDING" | "MESSAGE" | "ALERT";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  read: boolean;
  timeAgo: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface NotificationCounts {
  kyc: number;
  transactions: number;
  users: number;
  tickets: number;
  messages: number;
}

type FilterType = "all" | "KYC_PENDING" | "TRANSACTION_PENDING" | "NEW_USER" | "SUPPORT_TICKET" | "MESSAGE";

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({ kyc: 0, transactions: 0, users: 0, tickets: 0, messages: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // FIX: Use refs for tracking seen IDs and first-load flag
  // This avoids stale closures and the infinite re-render loop caused by
  // putting lastNotifIds (a Set) in useCallback dependencies.
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      const incoming: AdminNotification[] = data.notifications || [];

      // Detect new notifications after first load
      if (!isFirstLoadRef.current && knownIdsRef.current.size > 0) {
        incoming.forEach((notif) => {
          if (!knownIdsRef.current.has(notif.id)) {
            const priorityColors: Record<string, string> = {
              urgent: "rgba(239, 68, 68, 0.95)",
              high:   "rgba(245, 158, 11, 0.95)",
              medium: "rgba(59, 130, 246, 0.95)",
              low:    "rgba(16, 185, 129, 0.95)",
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

      // Update the ref — no state update for IDs, no dep loop
      knownIdsRef.current = new Set(incoming.map((n) => n.id));
      if (isFirstLoadRef.current) isFirstLoadRef.current = false;

      setNotifications(incoming);
      setCounts(data.counts || { kyc: 0, transactions: 0, users: 0, tickets: 0, messages: 0 });
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []); // stable — uses refs only

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "KYC_PENDING": return <FileCheck size={18} />;
      case "TRANSACTION_PENDING":
      case "WITHDRAWAL_PENDING": return <ArrowRightLeft size={18} />;
      case "NEW_USER": return <Users size={18} />;
      case "SUPPORT_TICKET": return <Headphones size={18} />;
      case "MESSAGE": return <MessageSquare size={18} />;
      case "ALERT": return <AlertTriangle size={18} />;
      default: return <Bell size={18} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "KYC_PENDING": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "TRANSACTION_PENDING":
      case "WITHDRAWAL_PENDING": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "NEW_USER": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "SUPPORT_TICKET": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "MESSAGE": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "ALERT": return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500/20 text-red-400 border border-red-500/30";
      case "high":   return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "medium": return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      default:       return "bg-slate-500/20 text-slate-400 border border-slate-500/30";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "urgent": return "Urgent";
      case "high":   return "Haute";
      case "medium": return "Moyenne";
      default:       return "Basse";
    }
  };

  const handleNotificationClick = (notif: AdminNotification) => {
    switch (notif.type) {
      case "KYC_PENDING":         router.push("/admin/kyc"); break;
      case "TRANSACTION_PENDING":
      case "WITHDRAWAL_PENDING":  router.push("/admin/transactions"); break;
      case "NEW_USER":            router.push("/admin/users"); break;
      case "SUPPORT_TICKET":      router.push("/admin/support"); break;
      case "MESSAGE":             router.push("/admin/messages"); break;
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    const matchesFilter = filter === "all" || notif.type === filter;
    const matchesSearch = searchQuery === "" ||
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filterOptions: { value: FilterType; label: string; icon: React.ReactNode; count: number }[] = [
    { value: "all",                 label: "Tout",         icon: <Bell size={14} />,           count: notifications.length },
    { value: "KYC_PENDING",         label: "KYC",          icon: <FileCheck size={14} />,      count: counts.kyc },
    { value: "TRANSACTION_PENDING", label: "Transactions", icon: <ArrowRightLeft size={14} />, count: counts.transactions },
    { value: "NEW_USER",            label: "Utilisateurs", icon: <Users size={14} />,          count: counts.users },
    { value: "SUPPORT_TICKET",      label: "Support",      icon: <Headphones size={14} />,     count: counts.tickets },
    { value: "MESSAGE",             label: "Messages",     icon: <MessageSquare size={14} />,  count: counts.messages },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Chargement des notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans pb-32">
      <AdminTopNav
        title="Notifications"
        subtitle="Admin"
        onRefresh={() => { setLoading(true); fetchNotifications(); }}
        backPath="/admin"
      />

      {/* Stats Cards */}
      <section className="mb-6">
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "KYC",          count: counts.kyc,          color: "amber",   path: "/admin/kyc" },
            { label: "Transactions", count: counts.transactions, color: "blue",    path: "/admin/transactions" },
            { label: "Nouveaux",     count: counts.users,        color: "emerald", path: "/admin/users" },
            { label: "Tickets",      count: counts.tickets,      color: "purple",  path: "/admin/support" },
            { label: "Messages",     count: counts.messages,     color: "cyan",    path: "/admin/messages" },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => router.push(stat.path)}
              className={`p-3 rounded-2xl bg-${stat.color}-500/10 border border-${stat.color}-500/20 hover:bg-${stat.color}-500/20 transition-all active:scale-95`}
            >
              <p className={`text-lg font-black text-${stat.color}-400`}>{stat.count}</p>
              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Search & Filter */}
      <section className="mb-6 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher une notification..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                filter === opt.value ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {opt.icon}
              {opt.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] ${filter === opt.value ? "bg-white/20" : "bg-white/10"}`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Notifications List */}
      <section>
        <div className="flex items-center gap-2 mb-4 ml-1">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
            {filteredNotifications.length} Notification{filteredNotifications.length > 1 ? "s" : ""}
          </h2>
          <button
            onClick={() => { setLoading(true); fetchNotifications(); }}
            className="ml-auto flex items-center gap-1 text-[9px] text-slate-500 hover:text-blue-400 transition-colors"
          >
            <RefreshCw size={10} />
            <span className="uppercase tracking-wider">Actualiser</span>
          </button>
        </div>

        {filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`relative p-4 bg-white/5 border border-white/10 rounded-[1.5rem] hover:bg-white/[0.08] transition-all cursor-pointer active:scale-[0.98] group ${
                  notif.priority === "urgent" ? "border-red-500/30" : ""
                }`}
              >
                {(notif.priority === "urgent" || notif.priority === "high") && (
                  <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${
                    notif.priority === "urgent" ? "bg-red-500 animate-pulse" : "bg-amber-500"
                  }`} />
                )}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl border ${getTypeColor(notif.type)}`}>
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[12px] font-black text-white uppercase tracking-tight">{notif.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[7px] font-bold uppercase ${getPriorityBadge(notif.priority)}`}>
                        {getPriorityLabel(notif.priority)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{notif.message}</p>
                    <span className="flex items-center gap-1 text-[9px] text-slate-600">
                      <Clock size={10} />
                      {notif.timeAgo}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 group-hover:text-white transition-colors flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 rounded-[2rem]">
            <div className="p-4 bg-white/5 rounded-2xl mb-4">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <p className="text-[11px] font-black text-white uppercase tracking-wider mb-1">Aucune notification</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Tout est a jour</p>
          </div>
        )}
      </section>

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-2 px-4 py-2 bg-[#0a0f1a]/90 backdrop-blur-xl border border-white/10 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ecoute en temps reel</span>
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center gap-2 opacity-15">
        <Shield size={14} />
        <p className="text-[8px] font-black uppercase tracking-[0.4em]">PimPay Admin Notifications v1.1</p>
      </div>
    </div>
  );
}
