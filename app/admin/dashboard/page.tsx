"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import {
  LogOut, Shield, Users, Zap, Search,
  Ban, TrendingUp, CreditCard, CircleDot, Power, CheckCircle2
} from "lucide-react";

// --- TYPES CORRIGÉS ---
type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type LedgerUser = {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  balance: number;
  lastActive?: string;
};

type AuditLog = {
  id: string;
  adminName: string;
  action: string;
  targetEmail: string;
  createdAt: string;
};

// --- COMPOSANTS INTERNES ---

const StatCard = ({ label, value, subText, icon }: { label: string; value: string; subText: string; icon: React.ReactNode }) => (
  <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-5 space-y-3">
    <div className="flex justify-between items-start">
      <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">{icon}</div>
      <TrendingUp size={14} className="text-slate-600" />
    </div>
    <div>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{label}</p>
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-[9px] text-blue-400 font-bold mt-1 uppercase tracking-tighter">{subText}</p>
    </div>
  </Card>
);

const UserRow = ({ user, onBan, onVerify, onUpdateBalance }: {
  user: LedgerUser,
  onBan: () => void,
  onVerify: () => void,
  onUpdateBalance: (amount: number) => void
}) => {
  const handleBalancePrompt = () => {
    const amountInput = prompt(`Ajuster le solde de ${user.name} (ex: 10 pour ajouter, -10 pour retirer) :`);
    if (amountInput && !isNaN(parseFloat(amountInput))) {
      onUpdateBalance(parseFloat(amountInput));
    }
  };

  return (
    <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold border border-white/5 uppercase">
          {user.name?.[0] || 'U'}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{user.name || "Utilisateur"}</p>
          <p className="text-[10px] text-slate-500 font-mono">π {(user.balance || 0).toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={handleBalancePrompt} className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-all">
          <CreditCard size={14} />
        </button>
        {(user.status !== "Verified" && user.status !== "ACTIVE") && (
          <button onClick={onVerify} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all">
            <CheckCircle2 size={14} />
          </button>
        )}
        <button onClick={onBan} className={`p-2 transition-colors ${user.status === 'BANNED' ? 'text-red-500' : 'text-slate-700 hover:text-red-500'}`}>
          <Ban size={14} />
        </button>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [searchQuery, setSearchQuery] = useState("");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [users, setUsers] = useState<LedgerUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const fetchData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();

      if (!authRes.ok || authData.user?.role !== "ADMIN") {
        router.replace("/auth/login");
        return;
      }
      setAdmin(authData.user);

      // Chargement parallèle des données
      const [usersRes, logsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/logs")
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());

    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Erreur de synchronisation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalPiVolume = useMemo(() => {
    return users.reduce((acc, user) => acc + (user.balance || 0), 0);
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, users]);

  const handleAction = async (userId: string, action: string, amount?: number) => {
    try {
      const res = await fetch(`/api/admin/users/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, amount })
      });

      if (res.ok) {
        toast.success(`Action ${action} effectuée`);
        fetchData();
      } else {
        toast.error("Action impossible");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans overflow-x-hidden" suppressHydrationWarning>
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CircleDot size={12} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Core Engine</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white italic">PIMPAY ADMIN</h1>
          </div>
          <button onClick={handleLogout} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
            <LogOut size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Volume Total" value={`π ${totalPiVolume.toLocaleString()}`} subText="Ledger Balance" icon={<Zap size={16} />} />
          <StatCard label="Wallets" value={users.length.toString()} subText="Total Users" icon={<Users size={16} />} />
        </div>
      </div>

      <div className="px-6 space-y-8">
        <div className="flex gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl">
          {["overview", "users", "kyc"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                activeTab === tab ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card onClick={() => setIsMaintenanceMode(!isMaintenanceMode)} className={`border-white/5 rounded-[2rem] p-6 flex justify-between items-center transition-all cursor-pointer ${isMaintenanceMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-slate-900/40'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isMaintenanceMode ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Power size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold">Mode Maintenance</p>
                  <p className="text-[10px] text-slate-500">{isMaintenanceMode ? 'Système Verrouillé' : 'Système Opérationnel'}</p>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
               <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Audit Logs</h3>
               <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] p-4 space-y-3">
                  {logs.length > 0 ? logs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-[10px] font-bold text-blue-400 uppercase">{log.action}</p>
                        <p className="text-[9px] text-slate-400">{log.adminName} → {log.targetEmail}</p>
                      </div>
                      <span className="text-[8px] text-slate-600 font-mono">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                  )) : (
                    <p className="text-[10px] text-slate-600 text-center py-4">Aucun log disponible</p>
                  )}
               </Card>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 text-xs font-bold outline-none text-white focus:border-blue-500/50" placeholder="Rechercher un portefeuille..." />
            </div>
            <div className="space-y-3">
              {filteredUsers.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  onBan={() => handleAction(user.id, 'BAN')}
                  onVerify={() => handleAction(user.id, 'VERIFY')}
                  onUpdateBalance={(amount) => handleAction(user.id, 'UPDATE_BALANCE', amount)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "kyc" && (
          <div className="space-y-4">
            <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2rem] text-center">
              <Shield size={32} className="text-blue-500 mx-auto mb-4" />
              <h3 className="font-bold text-white">Files d'attente KYC</h3>
              <p className="text-xs text-slate-500 mt-2">
                {users.filter(u => u.status === 'PENDING').length} vérifications d'identité en attente.
              </p>
            </div>
            <Button className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black italic rounded-2xl">
              APPROUVER TOUT
            </Button>
          </div>
        )}
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
