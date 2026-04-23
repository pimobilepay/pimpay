"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, Loader2, Search, Eye, Monitor, Smartphone,
  Globe, Clock, Users, ChevronLeft, ChevronRight, Filter, X, Wifi,
  Server, AlertTriangle, AlertCircle, Info, Bug, Trash2, Activity,
  MousePointerClick, Timer, ArrowRight, MapPin, Layers,
  Radio, XCircle, LayoutGrid
} from "lucide-react";

// ===== TYPES =====
type ActivityLog = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  page: string;
  action: string;
  device: string | null;
  browser: string | null;
  createdAt: string;
};

type OnlineUser = {
  userId: string;
  userName: string;
  userEmail: string;
  currentPage: string;
  device: string | null;
  lastSeen: string;
};

type PageStat = {
  page: string;
  visits: number;
};

type UserLogsData = {
  activities: ActivityLog[];
  total: number;
  page: number;
  totalPages: number;
  onlineUsers: OnlineUser[];
  pageStats: PageStat[];
};

type SystemLog = {
  id: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
  source: string;
  action: string;
  message: string;
  details: any;
  ip: string | null;
  duration: number | null;
  createdAt: string;
};

type SystemLogsData = {
  logs: SystemLog[];
  total: number;
  page: number;
  totalPages: number;
  stats: Record<string, number>;
  sources: string[];
};

type UserSessionData = {
  user: { name: string | null; email: string };
  isOnline: boolean;
  currentPage: string | null;
  currentDevice: string | null;
  currentBrowser: string | null;
  totalDuration: number;
  totalPageViews: number;
  totalClicks: number;
  pageJourney: { page: string; duration: number }[];
  recentActivities: { id: string; page: string; action: string; createdAt: string }[];
  pageVisits: { page: string; count: number }[];
};

// ===== HELPERS =====
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[3px] mb-4">{children}</h2>
);

const formatTimeAgo = (dateStr: string) => {
  const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const getPageLabel = (page: string) => {
  const labels: Record<string, string> = {
    "/": "Accueil", "/dashboard": "Dash", "/wallet": "Portefeuille", "/cards": "Cartes",
    "/send": "Envoi", "/deposit": "Dépôt", "/exchange": "Échange"
  };
  return labels[page] || page.split("/").pop() || page;
};

const getPageColor = (page: string) => {
  if (page === "/dashboard") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (page.includes("wallet") || page.includes("deposit")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  return "bg-white/5 text-slate-400 border-white/10";
};

const getLogLevelColor = (level: string) => {
  switch (level) {
    case "ERROR": case "FATAL": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "WARN": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "INFO": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
};

// ===== MAIN COMPONENT =====
export default function AdminLogsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "system">("users");
  
  // States
  const [userLoading, setUserLoading] = useState(true);
  const [userData, setUserData] = useState<UserLogsData | null>(null);
  const [systemLoading, setSystemLoading] = useState(true);
  const [systemData, setSystemData] = useState<SystemLogsData | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<UserSessionData | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Filters
  const [userPage, setUserPage] = useState(1);
  const [systemPage, setSystemPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState("");

  const fetchUserLogs = useCallback(async () => {
    try {
      setUserLoading(true);
      const res = await fetch(`/api/admin/user-activity?page=${userPage}&limit=30`);
      const data = await res.json();
      setUserData(data);
    } catch (err) { toast.error("Erreur logs utilisateurs"); }
    finally { setUserLoading(false); }
  }, [userPage]);

  const fetchSystemLogs = useCallback(async () => {
    try {
      setSystemLoading(true);
      const res = await fetch(`/api/admin/system-logs?page=${systemPage}&level=${levelFilter}`);
      const data = await res.json();
      setSystemData(data);
    } catch (err) { toast.error("Erreur logs système"); }
    finally { setSystemLoading(false); }
  }, [systemPage, levelFilter]);

  const fetchUserSession = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/user-session/${userId}`);
      const data = await res.json();
      setUserSession(data);
    } catch (err) { toast.error("Session introuvable"); }
  };

  useEffect(() => {
    if (activeTab === "users") fetchUserLogs();
    else fetchSystemLogs();
  }, [activeTab, fetchUserLogs, fetchSystemLogs]);

  useEffect(() => {
    if (selectedUserId) fetchUserSession(selectedUserId);
  }, [selectedUserId]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32" translate="no">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button onClick={() => router.push("/admin")} className="p-2.5 bg-white/5 rounded-2xl"><ArrowLeft size={18} /></button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Logs & Sécurité</h1>
          </div>
          <button onClick={() => activeTab === "users" ? fetchUserLogs() : fetchSystemLogs()} className="p-2.5 bg-white/5 rounded-2xl">
            <RefreshCw size={18} className={(userLoading || systemLoading) ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-4 max-w-2xl mx-auto">
          <button onClick={() => setActiveTab("users")} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === "users" ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400"}`}>
            Utilisateurs
          </button>
          <button onClick={() => setActiveTab("system")} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === "system" ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400"}`}>
            Système
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-6">
        {activeTab === "users" ? (
          <>
            {/* ONLINE USERS */}
            {userData?.onlineUsers && userData.onlineUsers.length > 0 && (
              <div>
                <SectionTitle>En Ligne ({userData.onlineUsers.length})</SectionTitle>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {userData.onlineUsers.map((user) => (
                    <button key={user.userId} onClick={() => setSelectedUserId(user.userId)} className="flex-shrink-0 bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4 min-w-[150px] text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-[10px] font-black">
                          {user.userName.charAt(0)}
                        </div>
                        <span className="text-[10px] font-black text-white truncate">{user.userName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[8px] text-emerald-400 font-bold uppercase">
                        <Eye size={10} /> {getPageLabel(user.currentPage)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SESSION PANEL */}
            {selectedUserId && userSession && (
              <div className="bg-slate-900 border border-blue-500/30 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="p-4 bg-blue-600/10 border-b border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Radio size={16} className="text-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Session Live</span>
                  </div>
                  <button onClick={() => setSelectedUserId(null)} className="p-1.5 bg-white/5 rounded-lg"><X size={14} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
                      <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Page Actuelle</p>
                      <p className="text-[11px] font-black text-blue-400">{getPageLabel(userSession.currentPage || "")}</p>
                    </div>
                    <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
                      <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Temps Total</p>
                      <p className="text-[11px] font-black text-white">{Math.floor(userSession.totalDuration / 60)}m {userSession.totalDuration % 60}s</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Parcours Récent</p>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                      {userSession.pageJourney.slice(-5).map((step, i) => (
                        <React.Fragment key={i}>
                          <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-bold text-slate-300 whitespace-nowrap">
                            {getPageLabel(step.page)}
                          </span>
                          {i < 4 && <ArrowRight size={10} className="text-slate-700 flex-shrink-0" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MAIN ACTIVITY LIST */}
            <div>
              <SectionTitle>Flux d'Activités</SectionTitle>
              <div className="space-y-2">
                {userData?.activities.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-900/60 border border-white/[0.06] rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[12px] font-black text-slate-400">
                      {log.userName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-white">{log.userName}</span>
                        <span className="text-[8px] text-slate-600">{formatTimeAgo(log.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${getPageColor(log.page)}`}>
                          {getPageLabel(log.page)}
                        </span>
                        <span className="text-[9px] text-slate-400 italic">{log.action}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* SYSTEM LOGS TAB CONTENT */
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {["ERROR", "WARN", "INFO"].map((lvl) => (
                <button key={lvl} onClick={() => setLevelFilter(lvl)} className={`p-3 rounded-2xl border text-center transition-all ${levelFilter === lvl ? getLogLevelColor(lvl) : "bg-slate-900/60 border-white/5"}`}>
                  <p className="text-[10px] font-black">{lvl}</p>
                </button>
              ))}
            </div>

            <div className="space-y-2 font-mono">
              {systemData?.logs.map((log) => (
                <div key={log.id} onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)} className={`p-3 bg-slate-900/60 border rounded-xl cursor-pointer ${getLogLevelColor(log.level)} border-opacity-20`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-black uppercase tracking-tighter bg-white/5 px-1 rounded">{log.source}</span>
                    <span className="text-[8px] text-slate-500">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="text-[10px] text-slate-300 break-words">{log.message}</p>
                  
                  {expandedLog === log.id && (
                    <div className="mt-3 p-3 bg-black/50 rounded-lg text-[9px] text-slate-400 overflow-x-auto">
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PAGINATION FIXE EN BAS */}
      <div className="fixed bottom-6 left-0 right-0 px-4 pointer-events-none">
        <div className="max-w-md mx-auto bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 flex items-center justify-between pointer-events-auto shadow-2xl">
          <button 
            disabled={activeTab === "users" ? userPage === 1 : systemPage === 1}
            onClick={() => activeTab === "users" ? setUserPage(p => p - 1) : setSystemPage(p => p - 1)}
            className="p-2 bg-white/5 rounded-xl disabled:opacity-20"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {activeTab === "users" ? userPage : systemPage}
          </span>
          <button 
            onClick={() => activeTab === "users" ? setUserPage(p => p + 1) : setSystemPage(p => p + 1)}
            className="p-2 bg-white/5 rounded-xl"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
