"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, Loader2, Search, Eye, Monitor, Smartphone,
  Globe, Clock, Users, ChevronLeft, ChevronRight, Filter, X, Wifi,
  Server, AlertTriangle, AlertCircle, Info, Bug, Trash2, Activity
} from "lucide-react";

// ===== TYPES =====
type Activity = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  userRole: string;
  userStatus: string;
  page: string;
  action: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  ip: string | null;
  createdAt: string;
};

type OnlineUser = {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  currentPage: string;
  device: string | null;
  lastSeen: string;
};

type PageStat = {
  page: string;
  visits: number;
};

type UserLogsData = {
  activities: Activity[];
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
  userAgent: string | null;
  userId: string | null;
  requestId: string | null;
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

// ===== HELPERS =====
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[3px] mb-4">{children}</h2>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getPageLabel(page: string): string {
  const labels: Record<string, string> = {
    "/": "Accueil",
    "/dashboard": "Dashboard",
    "/wallet": "Portefeuille",
    "/cards": "Cartes",
    "/send": "Envoi",
    "/deposit": "Depot",
    "/withdraw": "Retrait",
    "/exchange": "Echange",
    "/chat": "Chat",
    "/profile": "Profil",
    "/settings": "Parametres",
    "/airtime": "Recharge",
    "/notifications": "Notifications",
    "/staking": "Staking",
  };
  return labels[page] || page;
}

function getPageColor(page: string): string {
  if (page === "/" || page === "/dashboard") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (page.includes("wallet") || page.includes("deposit") || page.includes("withdraw")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (page.includes("card")) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (page.includes("send") || page.includes("transfer")) return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  if (page.includes("exchange") || page.includes("swap")) return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
  if (page.includes("chat") || page.includes("support")) return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  if (page.includes("profile") || page.includes("settings")) return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  return "bg-white/5 text-slate-400 border-white/10";
}

function getLogLevelIcon(level: string) {
  switch (level) {
    case "DEBUG": return <Bug size={12} className="text-slate-400" />;
    case "INFO": return <Info size={12} className="text-blue-400" />;
    case "WARN": return <AlertTriangle size={12} className="text-amber-400" />;
    case "ERROR": return <AlertCircle size={12} className="text-red-400" />;
    case "FATAL": return <AlertCircle size={12} className="text-red-600" />;
    default: return <Info size={12} className="text-slate-400" />;
  }
}

function getLogLevelColor(level: string): string {
  switch (level) {
    case "DEBUG": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    case "INFO": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "WARN": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "ERROR": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "FATAL": return "bg-red-600/20 text-red-500 border-red-600/30";
    default: return "bg-white/5 text-slate-400 border-white/10";
  }
}

// ===== MAIN COMPONENT =====
export default function AdminLogsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "system">("users");
  
  // User logs state
  const [userLoading, setUserLoading] = useState(true);
  const [userData, setUserData] = useState<UserLogsData | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchInput, setUserSearchInput] = useState("");
  const [pageFilter, setPageFilter] = useState("");

  // System logs state
  const [systemLoading, setSystemLoading] = useState(true);
  const [systemData, setSystemData] = useState<SystemLogsData | null>(null);
  const [systemPage, setSystemPage] = useState(1);
  const [systemSearch, setSystemSearch] = useState("");
  const [systemSearchInput, setSystemSearchInput] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Fetch user logs
  const fetchUserLogs = useCallback(async () => {
    try {
      setUserLoading(true);
      const params = new URLSearchParams({
        page: userPage.toString(),
        limit: "30",
      });
      if (userSearch) params.set("search", userSearch);
      if (pageFilter) params.set("pageFilter", pageFilter);

      const res = await fetch(`/api/admin/user-activity?${params}`);
      if (!res.ok) throw new Error("Erreur API");
      const json = await res.json();
      setUserData(json);
    } catch {
      toast.error("Impossible de charger les logs utilisateurs");
    } finally {
      setUserLoading(false);
    }
  }, [userPage, userSearch, pageFilter]);

  // Fetch system logs
  const fetchSystemLogs = useCallback(async () => {
    try {
      setSystemLoading(true);
      const params = new URLSearchParams({
        page: systemPage.toString(),
        limit: "50",
      });
      if (systemSearch) params.set("search", systemSearch);
      if (levelFilter) params.set("level", levelFilter);
      if (sourceFilter) params.set("source", sourceFilter);

      const res = await fetch(`/api/admin/system-logs?${params}`);
      if (!res.ok) throw new Error("Erreur API");
      const json = await res.json();
      setSystemData(json);
    } catch {
      toast.error("Impossible de charger les logs systeme");
    } finally {
      setSystemLoading(false);
    }
  }, [systemPage, systemSearch, levelFilter, sourceFilter]);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUserLogs();
    } else {
      fetchSystemLogs();
    }
  }, [activeTab, fetchUserLogs, fetchSystemLogs]);

  const handleUserSearch = () => {
    setUserPage(1);
    setUserSearch(userSearchInput);
  };

  const handleSystemSearch = () => {
    setSystemPage(1);
    setSystemSearch(systemSearchInput);
  };

  const clearUserFilters = () => {
    setUserSearch("");
    setUserSearchInput("");
    setPageFilter("");
    setUserPage(1);
  };

  const clearSystemFilters = () => {
    setSystemSearch("");
    setSystemSearchInput("");
    setLevelFilter("");
    setSourceFilter("");
    setSystemPage(1);
  };

  const handleClearOldLogs = async () => {
    if (!confirm("Supprimer les logs systeme de plus de 30 jours ?")) return;
    try {
      const res = await fetch("/api/admin/system-logs?days=30", { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");
      const data = await res.json();
      toast.success(`${data.deleted} logs supprimes`);
      fetchSystemLogs();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const loading = activeTab === "users" ? userLoading : systemLoading;

  if (loading && !userData && !systemData) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[5px]">Chargement des Logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32" translate="no">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.push("/admin")}
            className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Logs</h1>
          </div>
          <button
            onClick={activeTab === "users" ? fetchUserLogs : fetchSystemLogs}
            className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-2 px-4 pb-4 max-w-2xl mx-auto">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === "users"
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            <Users size={14} />
            Utilisateurs
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === "system"
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            <Server size={14} />
            Systeme
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-6">
        {/* ===== USER LOGS TAB ===== */}
        {activeTab === "users" && (
          <>
            {/* ONLINE USERS */}
            {userData && userData.onlineUsers.length > 0 && (
              <div>
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Utilisateurs en Ligne ({userData.onlineUsers.length})
                  </span>
                </SectionTitle>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {userData.onlineUsers.map((user) => (
                    <div
                      key={user.userId}
                      className="flex-shrink-0 bg-slate-900/60 border border-emerald-500/10 rounded-2xl p-4 min-w-[160px]"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-[10px]">
                          {user.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-white truncate">{user.userName}</p>
                          <p className="text-[8px] text-slate-500 truncate">{user.userEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye size={10} className="text-emerald-400" />
                        <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider truncate">
                          {getPageLabel(user.currentPage)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {user.device === "Mobile" ? (
                          <Smartphone size={9} className="text-slate-500" />
                        ) : (
                          <Monitor size={9} className="text-slate-500" />
                        )}
                        <span className="text-[8px] text-slate-600">{user.device}</span>
                        <Clock size={9} className="text-slate-500 ml-auto" />
                        <span className="text-[8px] text-slate-600">{formatTimeAgo(user.lastSeen)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TOP PAGES */}
            {userData && userData.pageStats.length > 0 && (
              <div>
                <SectionTitle>Pages les plus Visitees</SectionTitle>
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4">
                  <div className="space-y-2">
                    {userData.pageStats.map((stat, i) => {
                      const maxVisits = userData.pageStats[0]?.visits || 1;
                      const percentage = (stat.visits / maxVisits) * 100;
                      return (
                        <button
                          key={stat.page}
                          onClick={() => {
                            setPageFilter(stat.page);
                            setUserPage(1);
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all group text-left"
                        >
                          <span className="text-[10px] font-black text-slate-600 w-5">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                                {getPageLabel(stat.page)}
                              </span>
                              <span className="text-[10px] font-black text-slate-400 ml-2">
                                {stat.visits.toLocaleString("fr-FR")}
                              </span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500/40 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* USER SEARCH */}
            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={userSearchInput}
                    onChange={(e) => setUserSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUserSearch()}
                    placeholder="Rechercher un utilisateur..."
                    className="w-full bg-slate-900/60 border border-white/[0.06] rounded-xl pl-9 pr-4 py-3 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30 transition-colors"
                  />
                </div>
                <button
                  onClick={handleUserSearch}
                  className="p-3 bg-blue-600 rounded-xl text-white active:scale-95 transition-transform"
                >
                  <Search size={14} />
                </button>
              </div>

              {/* Active filters */}
              {(userSearch || pageFilter) && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {userSearch && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] font-bold text-blue-400 uppercase tracking-wider">
                      <Users size={10} /> {userSearch}
                      <button onClick={() => { setUserSearch(""); setUserSearchInput(""); }} className="ml-1 hover:text-white">
                        <X size={10} />
                      </button>
                    </span>
                  )}
                  {pageFilter && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                      <Globe size={10} /> {getPageLabel(pageFilter)}
                      <button onClick={() => setPageFilter("")} className="ml-1 hover:text-white">
                        <X size={10} />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={clearUserFilters}
                    className="text-[9px] font-bold text-slate-500 uppercase tracking-wider hover:text-white transition-colors"
                  >
                    Tout effacer
                  </button>
                </div>
              )}
            </div>

            {/* USER ACTIVITY LIST */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Activite Recente</SectionTitle>
                {userData && (
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    {userData.total.toLocaleString("fr-FR")} entrees
                  </span>
                )}
              </div>

              {userData && userData.activities.length > 0 ? (
                <div className="space-y-2">
                  {userData.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 hover:bg-white/[0.03] transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white font-black text-[10px] border border-white/5 flex-shrink-0">
                          {activity.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-black text-white truncate">
                              {activity.userName}
                            </span>
                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                              activity.userRole === "ADMIN" ? "bg-red-500/10 text-red-400" :
                              activity.userRole === "MERCHANT" ? "bg-amber-500/10 text-amber-400" :
                              activity.userRole === "AGENT" ? "bg-emerald-500/10 text-emerald-400" :
                              "bg-white/5 text-slate-500"
                            }`}>
                              {activity.userRole}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Eye size={11} className="text-slate-500" />
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getPageColor(activity.page)}`}>
                              {getPageLabel(activity.page)}
                            </span>
                            <span className="text-[8px] text-slate-600 truncate">{activity.page}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[8px] text-slate-600">
                            {activity.device && (
                              <span className="flex items-center gap-1">
                                {activity.device === "Mobile" ? <Smartphone size={9} /> : <Monitor size={9} />}
                                {activity.device}
                              </span>
                            )}
                            {activity.browser && (
                              <span className="flex items-center gap-1">
                                <Globe size={9} />
                                {activity.browser}
                              </span>
                            )}
                            <span className="flex items-center gap-1 ml-auto">
                              <Clock size={9} />
                              {formatDate(activity.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Wifi size={24} className="text-slate-600" />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Aucune activite trouvee
                  </p>
                </div>
              )}

              {/* USER PAGINATION */}
              {userData && userData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                  >
                    <ChevronLeft size={14} />
                    Precedent
                  </button>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    {userPage} / {userData.totalPages}
                  </span>
                  <button
                    onClick={() => setUserPage((p) => Math.min(userData.totalPages, p + 1))}
                    disabled={userPage === userData.totalPages}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                  >
                    Suivant
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== SYSTEM LOGS TAB ===== */}
        {activeTab === "system" && (
          <>
            {/* SYSTEM STATS */}
            {systemData && (
              <div>
                <SectionTitle>Statistiques</SectionTitle>
                <div className="grid grid-cols-5 gap-2">
                  {(["DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setLevelFilter(levelFilter === level ? "" : level);
                        setSystemPage(1);
                      }}
                      className={`p-3 rounded-xl border transition-all ${
                        levelFilter === level 
                          ? getLogLevelColor(level) + " ring-1 ring-current"
                          : "bg-slate-900/60 border-white/[0.06] hover:bg-white/5"
                      }`}
                    >
                      <div className="flex justify-center mb-1">
                        {getLogLevelIcon(level)}
                      </div>
                      <p className="text-[10px] font-black text-center">
                        {systemData.stats[level] || 0}
                      </p>
                      <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider text-center">
                        {level}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* QUICK FILTERS */}
            <div>
              <SectionTitle>Filtres Rapides</SectionTitle>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSourceFilter("MPAY_EXTERNAL_TRANSFER");
                    setSystemPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    sourceFilter === "MPAY_EXTERNAL_TRANSFER"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                  }`}
                >
                  <Globe size={14} />
                  Transferts Externes
                </button>
                <button
                  onClick={() => {
                    setLevelFilter("ERROR");
                    setSystemPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    levelFilter === "ERROR"
                      ? "bg-red-600 text-white"
                      : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  }`}
                >
                  <AlertCircle size={14} />
                  Erreurs
                </button>
                <button
                  onClick={() => {
                    setSourceFilter("PI_API");
                    setSystemPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    sourceFilter === "PI_API"
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20"
                  }`}
                >
                  <Server size={14} />
                  API Pi Network
                </button>
              </div>
            </div>

            {/* SYSTEM SEARCH & FILTERS */}
            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={systemSearchInput}
                    onChange={(e) => setSystemSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSystemSearch()}
                    placeholder="Rechercher dans les logs..."
                    className="w-full bg-slate-900/60 border border-white/[0.06] rounded-xl pl-9 pr-4 py-3 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30 transition-colors"
                  />
                </div>
                <button
                  onClick={handleSystemSearch}
                  className="p-3 bg-blue-600 rounded-xl text-white active:scale-95 transition-transform"
                >
                  <Search size={14} />
                </button>
                <button
                  onClick={handleClearOldLogs}
                  className="p-3 bg-red-600/20 rounded-xl text-red-400 active:scale-95 transition-transform"
                  title="Supprimer les anciens logs"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Source filter */}
              {systemData && systemData.sources.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
                  {systemData.sources.map((source) => (
                    <button
                      key={source}
                      onClick={() => {
                        setSourceFilter(sourceFilter === source ? "" : source);
                        setSystemPage(1);
                      }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                        sourceFilter === source
                          ? "bg-blue-600 text-white"
                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              )}

              {/* Active filters */}
              {(systemSearch || levelFilter || sourceFilter) && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {systemSearch && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] font-bold text-blue-400 uppercase tracking-wider">
                      <Search size={10} /> {systemSearch}
                      <button onClick={() => { setSystemSearch(""); setSystemSearchInput(""); }} className="ml-1 hover:text-white">
                        <X size={10} />
                      </button>
                    </span>
                  )}
                  {levelFilter && (
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider ${getLogLevelColor(levelFilter)}`}>
                      {getLogLevelIcon(levelFilter)} {levelFilter}
                      <button onClick={() => setLevelFilter("")} className="ml-1 hover:text-white">
                        <X size={10} />
                      </button>
                    </span>
                  )}
                  {sourceFilter && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                      <Server size={10} /> {sourceFilter}
                      <button onClick={() => setSourceFilter("")} className="ml-1 hover:text-white">
                        <X size={10} />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={clearSystemFilters}
                    className="text-[9px] font-bold text-slate-500 uppercase tracking-wider hover:text-white transition-colors"
                  >
                    Tout effacer
                  </button>
                </div>
              )}
            </div>

            {/* SYSTEM LOGS LIST */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Logs Systeme</SectionTitle>
                {systemData && (
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    {systemData.total.toLocaleString("fr-FR")} entrees
                  </span>
                )}
              </div>

              {systemData && systemData.logs.length > 0 ? (
                <div className="space-y-2 font-mono">
                  {systemData.logs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className={`bg-slate-900/60 border rounded-xl p-3 hover:bg-white/[0.03] transition-all cursor-pointer ${
                        log.level === "ERROR" || log.level === "FATAL"
                          ? "border-red-500/20"
                          : log.level === "WARN"
                            ? "border-amber-500/20"
                            : "border-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          {getLogLevelIcon(log.level)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${getLogLevelColor(log.level)}`}>
                              {log.level}
                            </span>
                            <span className="text-[8px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                              {log.source}
                            </span>
                            <span className="text-[8px] font-bold text-slate-500">
                              {log.action}
                            </span>
                            {log.duration && (
                              <span className="text-[8px] text-slate-600">
                                {log.duration}ms
                              </span>
                            )}
                            <span className="text-[8px] text-slate-600 ml-auto flex items-center gap-1">
                              <Clock size={9} />
                              {formatDate(log.createdAt)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-300 break-all">
                            {log.message}
                          </p>
                          
                          {/* Expanded details */}
                          {expandedLog === log.id && log.details && (
                            <div className="mt-3 p-3 bg-black/30 rounded-lg border border-white/5">
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-2">
                                Details
                              </p>
                              <pre className="text-[9px] text-slate-400 whitespace-pre-wrap break-all overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Additional info */}
                          {expandedLog === log.id && (
                            <div className="flex items-center gap-3 mt-2 text-[8px] text-slate-600">
                              {log.ip && <span>IP: {log.ip}</span>}
                              {log.userId && <span>User: {log.userId.substring(0, 8)}...</span>}
                              {log.requestId && <span>Req: {log.requestId.substring(0, 12)}...</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Activity size={24} className="text-slate-600" />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Aucun log systeme
                  </p>
                  <p className="text-[9px] text-slate-600 mt-1">
                    Les erreurs et evenements systeme apparaitront ici
                  </p>
                </div>
              )}

              {/* SYSTEM PAGINATION */}
              {systemData && systemData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setSystemPage((p) => Math.max(1, p - 1))}
                    disabled={systemPage === 1}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                  >
                    <ChevronLeft size={14} />
                    Precedent
                  </button>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    {systemPage} / {systemData.totalPages}
                  </span>
                  <button
                    onClick={() => setSystemPage((p) => Math.min(systemData.totalPages, p + 1))}
                    disabled={systemPage === systemData.totalPages}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                  >
                    Suivant
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
