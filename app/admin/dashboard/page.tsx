"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import {
  LogOut, Shield, Users, Zap, Search,
  Ban, TrendingUp, CreditCard, CircleDot, Power, CheckCircle2
} from "lucide-react";

// --- TYPES ---
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

type GrowthData = {
  date: string;
  count: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [searchQuery, setSearchQuery] = useState("");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [users, setUsers] = useState<LedgerUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);

  const fetchData = async () => {
    try {
      const authRes = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include"
      });
      const authData = await authRes.json();

      if (!authRes.ok || authData.user?.role !== "ADMIN") {
        router.replace("/auth/login");
        return;
      }
      setAdmin(authData.user);

      const [usersRes, logsRes, statsRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/logs", { credentials: "include" }),
        fetch("/api/admin/stats/growth", { credentials: "include" })
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (statsRes.ok) setGrowthData(await statsRes.json());

    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  const totalPiVolume = useMemo(() => {
    return users.reduce((acc, user) => acc + (user.balance || 0), 0);
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, users]);

  const handleAction = async (userId: string, action: 'BAN' | 'VERIFY' | 'UPDATE_BALANCE', amount?: number) => {
    try {
      const res = await fetch(`/api/admin/users/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, action, amount })
      });

      if (res.ok) {
        fetchData();
        toast.success(`Succès : ${action}`);
      } else {
        toast.error("Échec de l'action");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
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
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans">
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CircleDot size={12} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Pimpay Intelligence</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white">CORE ENGINE</h1>
          </div>
          <button onClick={handleLogout} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
            <LogOut size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Volume Pi" value={`π ${totalPiVolume.toLocaleString()}`} subText="Global Ledger Sum" icon={<Zap size={16} className="text-blue-400" />} />
          <StatCard label="Total Users" value={users.length.toString()} subText="Registered Wallets" icon={<Users size={16} className="text-purple-400" />} />
        </div>
      </div>

      <div className="px-6 space-y-8">
        <div className="flex gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl">
          <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} label="Engine" />
          <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")} label="Ledger" />
          <TabButton active={activeTab === "kyc"} onClick={() => setActiveTab("kyc")} label="Verify" />
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card onClick={() => setIsMaintenanceMode(!isMaintenanceMode)} className={`border-white/5 rounded-[2rem] p-6 flex justify-between items-center transition-all cursor-pointer ${isMaintenanceMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-slate-900/40'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isMaintenanceMode ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Power size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold">Maintenance Mode</p>
                  <p className="text-[10px] text-slate-500">{isMaintenanceMode ? 'System Locked' : 'System Live'}</p>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
               <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Recent Activity</h3>
               <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] p-4 space-y-3">
                  {logs.length > 0 ? logs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-[10px] font-bold text-blue-400 uppercase">{log.action}</p>
                        <p className="text-[9px] text-slate-400">{log.adminName} → {log.targetEmail}</p>
                      </div>
                      <span className="text-[8px] text-slate-600">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                  )) : (
                    <p className="text-[10px] text-slate-600 text-center py-4">Aucun log récent</p>
                  )}
               </Card>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 text-xs font-bold outline-none" placeholder="Search user ledgers..." />
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
              <h3 className="font-bold text-white">Trust Queue</h3>
              <p className="text-xs text-slate-500 mt-2">{users.filter(u => u.status === 'PENDING').length} ID verifications pending.</p>
            </div>
            <Button className="w-full h-16 bg-blue-600 text-white font-black italic rounded-2xl shadow-lg shadow-blue-600/20">
              PROCESS ALL
            </Button>
          </div>
        )}
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function UserRow({ user, onBan, onVerify, onUpdateBalance }: {
  user: LedgerUser,
  onBan: () => void,
  onVerify: () => void,
  onUpdateBalance: (amount: number) => void
}) {
  const handleBalancePrompt = () => {
    const amountInput = prompt(`Ajuster le solde de ${user.name} (ex: 10 pour ajouter, -10 pour retirer) :`);
    if (amountInput && !isNaN(parseFloat(amountInput))) {
      onUpdateBalance(parseFloat(amountInput));
    }
  };

  return (
    <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold border border-white/5">
          {user.name?.[0] || 'U'}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{user.name || "Utilisateur"}</p>
          <p className="text-[10px] text-slate-500">π {(user.balance || 0).toLocaleString()}</p>
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
}

interface StatCardProps {
  label: string;
  value: string;
  subText: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, subText, icon }: StatCardProps) {
  return (
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
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button onClick={onClick} className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
      active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500"
    }`}>
      {label}
    </button>
  );
}
