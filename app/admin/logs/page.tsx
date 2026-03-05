"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, Loader2, Search, Eye, Monitor, Smartphone,
  Globe, Clock, Users, ChevronLeft, ChevronRight, Filter, X, Wifi
} from "lucide-react";

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

type LogsData = {
  activities: Activity[];
  total: number;
  page: number;
  totalPages: number;
  onlineUsers: OnlineUser[];
  pageStats: PageStat[];
};

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

export default function AdminLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LogsData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pageFilter, setPageFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "30",
      });
      if (search) params.set("search", search);
      if (pageFilter) params.set("pageFilter", pageFilter);

      const res = await fetch(`/api/admin/user-activity?${params}`);
      if (!res.ok) throw new Error("Erreur API");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Impossible de charger les logs d'activite");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, pageFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = () => {
    setCurrentPage(1);
    setSearch(searchInput);
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setPageFilter("");
    setCurrentPage(1);
  };

  if (loading && !data) {
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
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Logs Utilisateurs</h1>
          </div>
          <button
            onClick={fetchLogs}
            className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-6">

        {/* ONLINE USERS */}
        {data && data.onlineUsers.length > 0 && (
          <div>
            <SectionTitle>
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Utilisateurs en Ligne ({data.onlineUsers.length})
              </span>
            </SectionTitle>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {data.onlineUsers.map((user) => (
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
        {data && data.pageStats.length > 0 && (
          <div>
            <SectionTitle>Pages les plus Visitees</SectionTitle>
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4">
              <div className="space-y-2">
                {data.pageStats.map((stat, i) => {
                  const maxVisits = data.pageStats[0]?.visits || 1;
                  const percentage = (stat.visits / maxVisits) * 100;
                  return (
                    <button
                      key={stat.page}
                      onClick={() => {
                        setPageFilter(stat.page);
                        setCurrentPage(1);
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

        {/* SEARCH & FILTERS */}
        <div>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Rechercher un utilisateur..."
                className="w-full bg-slate-900/60 border border-white/[0.06] rounded-xl pl-9 pr-4 py-3 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30 transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              className="p-3 bg-blue-600 rounded-xl text-white active:scale-95 transition-transform"
            >
              <Search size={14} />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl text-white active:scale-95 transition-all ${
                showFilters || pageFilter ? "bg-blue-600" : "bg-white/5"
              }`}
            >
              <Filter size={14} />
            </button>
          </div>

          {/* Active filters */}
          {(search || pageFilter) && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {search && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] font-bold text-blue-400 uppercase tracking-wider">
                  <Users size={10} /> {search}
                  <button onClick={() => { setSearch(""); setSearchInput(""); }} className="ml-1 hover:text-white">
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
                onClick={clearFilters}
                className="text-[9px] font-bold text-slate-500 uppercase tracking-wider hover:text-white transition-colors"
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>

        {/* ACTIVITY LIST */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Activite Recente</SectionTitle>
            {data && (
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                {data.total.toLocaleString("fr-FR")} entrees
              </span>
            )}
          </div>

          {data && data.activities.length > 0 ? (
            <div className="space-y-2">
              {data.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 hover:bg-white/[0.03] transition-all group"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white font-black text-[10px] border border-white/5 flex-shrink-0">
                      {activity.userName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
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

                      {/* Page visited */}
                      <div className="flex items-center gap-2 mb-2">
                        <Eye size={11} className="text-slate-500" />
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getPageColor(activity.page)}`}>
                          {getPageLabel(activity.page)}
                        </span>
                        <span className="text-[8px] text-slate-600 truncate">{activity.page}</span>
                      </div>

                      {/* Device & Time */}
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
                        {activity.os && (
                          <span>{activity.os}</span>
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
              <p className="text-[9px] text-slate-600 mt-1">
                Les activites des utilisateurs apparaitront ici
              </p>
            </div>
          )}

          {/* PAGINATION */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                <ChevronLeft size={14} />
                Precedent
              </button>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                {currentPage} / {data.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={currentPage === data.totalPages}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                Suivant
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
