"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Users, UserCheck, UserX, Search, CheckCircle2, Eye, RefreshCw, ShieldCheck, ArrowLeft, Trash2, Wallet, ChevronLeft, ChevronRight, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AdminUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  avatar: string | null;
  piUserId: string | null;
  phone: string | null;
  country: string | null;
  status: string;
  role: string;
  kycStatus: string;
  autoApprove: boolean;
  lastLoginIp: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  wallets: { balance: number; currency: string }[];
  stakings?: { amount: number; currency: string; apy: number; rewardsEarned: number }[];
  stakedByCurrency?: Record<string, number>;
  totalStaked?: number;
};

const PAGE_SIZE = 100;

const ROLE_OPTIONS = [
  { value: "ALL", label: "Tous roles" },
  { value: "USER", label: "User" },
  { value: "MERCHANT", label: "Merchant" },
  { value: "AGENT", label: "Agent" },
  { value: "ADMIN", label: "Admin" },
  { value: "BANK_ADMIN", label: "Bank admin" },
  { value: "BUSINESS_ADMIN", label: "Business admin" },
];

type UserStats = {
  total: number;
  active: number;
  banned: number;
  kycVerified: number;
  piUsers: number;
  byRole: Record<string, number>;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Requete effectivement envoyee au serveur (anti-rebond sur la saisie)
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination serveur : 100 utilisateurs par page
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<UserStats>({
    total: 0, active: 0, banned: 0, kycVerified: 0, piUsers: 0, byRole: {},
  });

  // Anti-rebond de la recherche : evite une requete par frappe
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(id);
  }, [query]);

  // Tout changement de filtre ramene a la premiere page
  useEffect(() => { setPage(1); }, [debouncedQuery, filterStatus, filterRole]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterRole !== "ALL") params.set("role", filterRole);

      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      if (data.stats) setStats(data.stats);
    } catch {
      toast.error("Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQuery, filterStatus, filterRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCopyId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId);
      toast.success("ID utilisateur copie");
    } catch {
      toast.error("Copie impossible");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmed = confirm(`Supprimer definitivement l'utilisateur ${userName} ?\n\nCette action est IRREVERSIBLE.`);
    if (!confirmed) return;
    
    const doubleConfirm = confirm("DERNIERE CONFIRMATION: Etes-vous vraiment sur ?");
    if (!doubleConfirm) return;
    
    try {
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "DELETE_USER" }),
      });
      
      if (res.ok) {
        toast.success("Utilisateur supprime avec succes");
        fetchUsers(); // Refresh the list
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  };

  const handleResetBalance = async (userId: string, userName: string) => {
    const confirmed = confirm(`Supprimer TOUT le solde de ${userName} ?\n\nCela remettra a 0 l'integralite de ses portefeuilles CRYPTO et FIAT.\nCette action est IRREVERSIBLE.`);
    if (!confirmed) return;

    try {
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "RESET_USER_BALANCE" }),
      });

      if (res.ok) {
        toast.success("Solde (crypto + fiat) reinitialise a 0");
        fetchUsers(); // Refresh the list
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la reinitialisation");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  };

  // Le filtrage, la recherche et la pagination sont faits cote serveur :
  // `users` contient deja exactement la page a afficher.
  const filteredUsers = users;

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-6" />
        <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[5px]">Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 space-y-6">

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button onClick={() => router.push("/admin")} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PIMOBIPAY</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Utilisateurs</h1>
          </div>
          <button onClick={fetchUsers} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="px-6 space-y-6">

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat icon={<Users size={16}/>} label="Total" value={stats.total.toString()} />
        <Stat icon={<UserCheck size={16}/>} label="Actifs" value={stats.active.toString()} color="text-emerald-500" />
        <Stat icon={<UserX size={16}/>} label="Bannis" value={stats.banned.toString()} color="text-red-500" />
        <Stat icon={<CheckCircle2 size={16}/>} label="KYC" value={stats.kycVerified.toString()} color="text-blue-500" />
        <Stat icon={<Shield size={16}/>} label="Pi Network" value={stats.piUsers.toString()} color="text-amber-500" />
      </div>

      {/* FILTERS */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            placeholder="ID utilisateur, nom, email, username, telephone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl pl-11 pr-12 text-sm font-bold text-white outline-none focus:border-blue-500/50 placeholder:text-slate-600"
          />
          {loading && (
            <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
          )}
        </div>
        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filtrer par statut"
            className="flex-1 h-12 bg-slate-900/50 border border-white/5 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-blue-500/50"
          >
            <option value="ALL">Tous statuts</option>
            <option value="ACTIVE">Actifs</option>
            <option value="BANNED">Bannis</option>
            <option value="FROZEN">Geles</option>
            <option value="SUSPENDED">Suspendus</option>
            <option value="PENDING">En attente</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            aria-label="Filtrer par role"
            className="flex-1 h-12 bg-slate-900/50 border border-white/5 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-blue-500/50"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.value === "ALL" ? r.label : `${r.label}${stats.byRole?.[r.value] ? ` (${stats.byRole[r.value]})` : ""}`}
              </option>
            ))}
          </select>
        </div>

        {/* Compteur de resultats filtres */}
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          {total.toLocaleString()} resultat{total > 1 ? "s" : ""}
          {totalPages > 1 ? ` // page ${page}/${totalPages}` : ""}
        </p>
      </div>

      {/* USER LIST */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="p-16 border border-white/5 rounded-[2rem] text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Aucun utilisateur trouve</p>
          </div>
        ) : (
          filteredUsers.map(user => {
            const piBalance = user.wallets?.find(w => w.currency?.toUpperCase() === "PI")?.balance || 0;
            const cnyBalance = user.wallets?.find(w => w.currency?.toUpperCase() === "CNY")?.balance || 0;
            const totalStaked = user.totalStaked || 0;
            const isPiUser = !!user.piUserId;

            return (
              <div key={user.id} className="p-5 bg-slate-900/40 border border-white/5 rounded-[2rem] hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username || user.name || "Avatar"}
                        className="w-12 h-12 rounded-2xl object-cover border border-white/10"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black bg-slate-800 border border-white/5 text-slate-400 uppercase">
                        {user.username?.[0] || user.name?.[0] || "?"}
                      </div>
                    )}
                    {user.status === "ACTIVE" && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-[#020617]" />
                    )}
                    {isPiUser && (
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-[#020617] flex items-center justify-center">
                        <span className="text-[7px] font-black text-white">Pi</span>
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-white tracking-tight uppercase truncate">
                        {user.username || user.name || "Sans nom"}
                      </p>
                      <ShieldCheck
                        size={12}
                        className={user.kycStatus === "APPROVED" || user.kycStatus === "VERIFIED" ? "text-emerald-500" : "text-slate-700"}
                      />
                      {isPiUser && (
                        <span className="text-[7px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 uppercase tracking-wider">
                          Pi Network
                        </span>
                      )}
                      {user.autoApprove && (
                        <span className="text-[7px] font-black px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono truncate">
                      {user.email || user.phone || "Pas de contact"} {user.country ? `// ${user.country}` : ""}
                    </p>
                    {/* ID utilisateur : affiche et copiable pour la recherche */}
                    <button
                      onClick={() => handleCopyId(user.id)}
                      className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono text-slate-600 hover:text-blue-400 transition-colors max-w-full"
                      title="Copier l'ID utilisateur"
                    >
                      <Copy size={9} className="shrink-0" />
                      <span className="truncate">{user.id}</span>
                    </button>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-[9px] font-black font-mono uppercase ${
                        user.role === "BANK_ADMIN" ? "text-emerald-400" :
                        user.role === "BUSINESS_ADMIN" ? "text-amber-400" :
                        user.role === "ADMIN" ? "text-red-400" :
                        "text-blue-400"
                      }`}>
                        {user.role} {`// \u03C0 ${piBalance.toLocaleString()}`}
                      </span>
                      <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                        user.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        user.status === "BANNED" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        user.status === "FROZEN" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                        "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}>
                        {user.status}
                      </span>
                    </div>
                    {/* Soldes Yuan (CNY) et Staking verrouille */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                        {`\u00A5 ${cnyBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CNY`}
                      </span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border ${
                        totalStaked > 0
                          ? "bg-violet-500/10 text-violet-300 border-violet-500/20"
                          : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                      }`}>
                        {`STAKE ${totalStaked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} \u03C0 verrouille`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => window.location.href = `/admin/users/${user.id}`}
                      className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                      title="Voir details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleResetBalance(user.id, user.username || user.name || "Utilisateur")}
                      className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-all"
                      title="Supprimer tout le solde (crypto + fiat)"
                    >
                      <Wallet size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.username || user.name || "Utilisateur")}
                      className="p-2.5 bg-red-500/10 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
                      title="Supprimer l'utilisateur"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PAGINATION SERVEUR */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 bg-slate-900/40 border border-white/5 rounded-2xl p-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="flex items-center gap-2 h-11 px-4 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 disabled:opacity-30"
          >
            <ChevronLeft size={14} /> Precedent
          </button>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-2 h-11 px-4 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 disabled:opacity-30"
          >
            Suivant <ChevronRight size={14} />
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color = "text-blue-400" }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
      <div className={`p-2.5 bg-white/5 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-[8px] uppercase text-slate-500 font-black tracking-widest">{label}</p>
        <p className="text-lg font-black text-white">{value}</p>
      </div>
    </div>
  );
}
