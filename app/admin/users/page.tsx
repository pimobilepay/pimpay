"use client";

import { useState, useMemo, useEffect } from "react";
import { Shield, Users, UserCheck, UserX, Search, CheckCircle2, Clock, Eye, CircleDot, RefreshCw, ShieldCheck } from "lucide-react";
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
};

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchQuery =
        (u.name?.toLowerCase().includes(query.toLowerCase())) ||
        (u.email?.toLowerCase().includes(query.toLowerCase())) ||
        (u.username?.toLowerCase().includes(query.toLowerCase()));
      const matchStatus = filterStatus === "ALL" || u.status === filterStatus;
      return matchQuery && matchStatus;
    });
  }, [query, filterStatus, users]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === "ACTIVE").length,
    banned: users.filter(u => u.status === "BANNED" || u.status === "SUSPENDED").length,
    kycVerified: users.filter(u => u.kycStatus === "VERIFIED" || u.kycStatus === "APPROVED").length,
    piUsers: users.filter(u => !!u.piUserId).length,
  }), [users]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-6" />
        <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[5px]">Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-8 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CircleDot size={10} className="text-blue-500 animate-pulse" />
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-[3px]">Gestion Utilisateurs</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-white">
            PIMPAY<span className="text-blue-500">USERS</span>
          </h1>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchUsers} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
            <RefreshCw size={18} className="text-slate-400" />
          </button>
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 text-xs font-black text-white">
            <Users size={14} className="text-blue-500" /> {stats.total}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat icon={<Users size={16}/>} label="Total" value={stats.total.toString()} />
        <Stat icon={<UserCheck size={16}/>} label="Actifs" value={stats.active.toString()} color="text-emerald-500" />
        <Stat icon={<UserX size={16}/>} label="Bannis" value={stats.banned.toString()} color="text-red-500" />
        <Stat icon={<CheckCircle2 size={16}/>} label="KYC" value={stats.kycVerified.toString()} color="text-blue-500" />
        <Stat icon={<Shield size={16}/>} label="Pi Network" value={stats.piUsers.toString()} color="text-amber-500" />
      </div>

      {/* FILTERS */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            placeholder="Rechercher par nom, email ou username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl pl-11 pr-4 text-sm font-bold text-white outline-none focus:border-blue-500/50 placeholder:text-slate-600"
          />
        </div>
        <select
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-900/50 border border-white/5 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest text-white outline-none"
        >
          <option value="ALL">Tous</option>
          <option value="ACTIVE">Actifs</option>
          <option value="BANNED">Bannis</option>
          <option value="FROZEN">Geles</option>
          <option value="SUSPENDED">Suspendus</option>
        </select>
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
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] font-black text-blue-400 font-mono uppercase">
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
                  </div>
                </div>
              </div>
            );
          })
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
