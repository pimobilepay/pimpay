"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Loader2, ShieldAlert, Lock, Unlock, AlertTriangle, Search, X,
  Clock, MapPin, ChevronLeft, ChevronRight, ShieldX, Activity, Radio,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";
import { UserSecurityDetailModal } from "@/components/admin/UserSecurityDetailModal";

type Attempt = {
  id: string;
  level: string;
  action: string;
  message: string;
  details: any;
  ip: string | null;
  userAgent: string | null;
  userId: string | null;
  createdAt: string;
};

type LockedUser = {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  avatar: string | null;
  role: string;
  failedLoginAttempts: number;
  lockedUntil: string;
  lastLoginIp: string | null;
  lastLoginAt: string | null;
};

type AtRiskUser = {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  avatar: string | null;
  role: string;
  failedLoginAttempts: number;
  lastLoginIp: string | null;
  lastLoginAt: string | null;
};

type Data = {
  attempts: Attempt[];
  total: number;
  page: number;
  totalPages: number;
  lockedUsers: LockedUser[];
  atRiskUsers: AtRiskUser[];
  maxAttempts: number;
  stats: { failed24h: number; locked24h: number; lockedNow: number; atRisk: number };
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

function timeUntil(dateStr: string): string {
  const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 1000);
  if (diff <= 0) return "expire";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

function displayName(u: { name: string | null; username: string | null; email: string | null }): string {
  return u.name || u.username || u.email || "Utilisateur";
}

export default function LoginAttemptsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Data | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [live, setLive] = useState(true);

  // Suivi des IDs déjà connus pour signaler les nouvelles tentatives en temps réel
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: "30" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/login-attempts?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Erreur API");
      const json: Data = await res.json();

      // Détection des nouvelles tentatives (uniquement sur la 1re page, sans recherche)
      if (!isFirstLoadRef.current && page === 1 && !search) {
        (json.attempts || []).forEach((a) => {
          if (!knownIdsRef.current.has(a.id)) {
            const locked = a.action === "ACCOUNT_LOCKED";
            toast(locked ? "Compte verrouille" : "Nouvelle tentative echouee", {
              description: a.message,
              duration: 5000,
              style: {
                background: locked ? "rgba(239, 68, 68, 0.95)" : "rgba(245, 158, 11, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#fff",
              },
            });
          }
        });
      }
      knownIdsRef.current = new Set((json.attempts || []).map((a) => a.id));
      isFirstLoadRef.current = false;

      setData(json);
    } catch {
      if (!silent) toast.error("Impossible de charger les tentatives de connexion");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Rafraîchissement automatique en temps réel (sans recharger la page)
  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => fetchData(true), 7000);
    return () => clearInterval(interval);
  }, [live, fetchData]);

  const handleUnlock = async (userId: string, label: string) => {
    if (!confirm(`Deverrouiller le compte de ${label} ?`)) return;
    try {
      setUnlocking(userId);
      const res = await fetch("/api/admin/login-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Compte deverrouille");
      fetchData();
    } catch {
      toast.error("Echec du deverrouillage");
    } finally {
      setUnlocking(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[5px]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32" translate="no">
      <AdminTopNav
        title="Tentatives Connexion"
        subtitle="Securite"
        onRefresh={fetchData}
        backPath="/admin"
      />

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-8">
        {/* LIVE STATUS */}
        <button
          onClick={() => setLive((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border w-full justify-center transition-all active:scale-[0.98] ${
            live
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
              : "bg-white/5 border-white/10 text-slate-500"
          }`}
        >
          <Radio size={13} className={live ? "animate-pulse" : ""} />
          <span className="text-[10px] font-black uppercase tracking-[2px]">
            {live ? "Suivi en temps reel actif" : "Suivi en temps reel en pause"}
          </span>
          {live && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
        </button>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Echecs (24h)" value={data?.stats.failed24h ?? 0} icon={<ShieldAlert size={18} />} color="amber" />
          <StatCard label="Blocages (24h)" value={data?.stats.locked24h ?? 0} icon={<ShieldX size={18} />} color="rose" />
          <StatCard label="Comptes bloques" value={data?.stats.lockedNow ?? 0} icon={<Lock size={18} />} color="red" />
          <StatCard label="A risque" value={data?.stats.atRisk ?? 0} icon={<AlertTriangle size={18} />} color="blue" />
        </div>

        {/* COMPTES VERROUILLÉS */}
        <section>
          <SectionTitle>Comptes verrouilles ({data?.lockedUsers.length ?? 0})</SectionTitle>
          {data && data.lockedUsers.length > 0 ? (
            <div className="space-y-3">
              {data.lockedUsers.map((u) => (
                <div key={u.id} className="bg-red-500/[0.06] border border-red-500/20 rounded-3xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-red-500/15 flex items-center justify-center text-red-400 font-black text-xs flex-shrink-0">
                        {displayName(u).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-black text-white truncate">{displayName(u)}</p>
                        <p className="text-[9px] text-slate-500 truncate">{u.email || u.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnlock(u.id, displayName(u))}
                      disabled={unlocking === u.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-[9px] font-black uppercase tracking-wider text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                    >
                      {unlocking === u.id ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
                      Debloquer
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-red-500/10">
                    <Meta icon={<Clock size={10} />} text={`Debloque dans ${timeUntil(u.lockedUntil)}`} />
                    <Meta icon={<Activity size={10} />} text={`${u.failedLoginAttempts || data.maxAttempts}/${data.maxAttempts} tentatives`} />
                    {u.lastLoginIp && <Meta icon={<MapPin size={10} />} text={u.lastLoginIp} />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Aucun compte verrouille actuellement" />
          )}
        </section>

        {/* COMPTES À RISQUE */}
        {data && data.atRiskUsers.length > 0 && (
          <section>
            <SectionTitle>Comptes a risque ({data.atRiskUsers.length})</SectionTitle>
            <div className="space-y-2">
              {data.atRiskUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 bg-amber-500/[0.05] border border-amber-500/15 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 font-black text-[10px] flex-shrink-0">
                      {displayName(u).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-white truncate">{displayName(u)}</p>
                      <p className="text-[9px] text-slate-500 truncate">{u.email || u.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 rounded-xl flex-shrink-0">
                    <AlertTriangle size={11} className="text-amber-400" />
                    <span className="text-[10px] font-black text-amber-400">{u.failedLoginAttempts}/{data.maxAttempts}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* HISTORIQUE DES TENTATIVES */}
        <section>
          <SectionTitle>Historique des tentatives</SectionTitle>

          {/* SEARCH */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setSearch(searchInput);
                  }
                }}
                placeholder="Rechercher (email, identifiant)..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-9 py-3 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {data && data.attempts.length > 0 ? (
            <div className="space-y-2">
              {data.attempts.map((a) => {
                const locked = a.action === "ACCOUNT_LOCKED";
                return (
                  <div
                    key={a.id}
                    className={`rounded-2xl px-4 py-3 border ${
                      locked ? "bg-red-500/[0.06] border-red-500/20" : "bg-white/[0.03] border-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${locked ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                        {locked ? <Lock size={12} /> : <ShieldAlert size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white leading-snug">{a.message}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          {a.ip && <Meta icon={<MapPin size={9} />} text={a.ip} />}
                          {a.details?.location && <Meta icon={<MapPin size={9} />} text={a.details.location} />}
                          <Meta icon={<Clock size={9} />} text={timeAgo(a.createdAt)} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState text="Aucune tentative enregistree" />
          )}

          {/* PAGINATION */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-4 py-2.5 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-300 disabled:opacity-30 active:scale-95 transition-all"
              >
                <ChevronLeft size={14} /> Prec
              </button>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                {page} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="flex items-center gap-1 px-4 py-2.5 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-300 disabled:opacity-30 active:scale-95 transition-all"
              >
                Suiv <ChevronRight size={14} />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[3px] mb-4">{children}</h2>;
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
      <span className="text-slate-600">{icon}</span>
      {text}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 bg-white/[0.02] border border-white/5 rounded-3xl">
      <ShieldAlert size={28} className="text-slate-700 mb-3" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">{text}</p>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  };
  return (
    <div className={`border rounded-3xl p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-xl bg-white/5">{icon}</div>
        <span className="text-2xl font-black tracking-tighter text-white">{value}</span>
      </div>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</p>
    </div>
  );
}
