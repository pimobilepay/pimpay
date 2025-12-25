"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import {
  LogOut, Shield, Users, Zap, Search, Key,
  Ban, TrendingUp, CreditCard, CircleDot, Power, CheckCircle2, UserCog,
  BarChart3, Settings, AlertTriangle, Wallet, ArrowDownUp, Megaphone, FileText,
  MonitorSmartphone, Hash, Snowflake, Fingerprint, Headphones
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
  isOnline?: boolean;
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

const UserRow = ({
  user,
  onBan,
  onFreeze,
  onVerify,
  onUpdateBalance,
  onResetPassword,
  onToggleRole,
  onResetPin,
  onViewSessions,
  onSupport
}: {
  user: LedgerUser,
  onBan: () => void,
  onFreeze: () => void,
  onVerify: () => void,
  onUpdateBalance: (amount: number) => void,
  onResetPassword: () => void,
  onToggleRole: () => void,
  onResetPin: () => void,
  onViewSessions: () => void,
  onSupport: () => void
}) => {
  const handleBalancePrompt = () => {
    const amountInput = prompt(`Ajuster le solde de ${user.name} (ex: 10 pour ajouter, -10 pour retirer) :`);
    if (amountInput && !isNaN(parseFloat(amountInput))) {
      onUpdateBalance(parseFloat(amountInput));
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success("ID copié");
  };

  return (
    <div className="p-5 bg-slate-900/40 border border-white/5 rounded-[2rem] space-y-4 transition-all hover:border-white/10">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border border-white/5 uppercase ${user.role === 'ADMIN' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'bg-slate-800 text-slate-400'}`}>
              {user.name?.[0] || 'U'}
            </div>
            {user.isOnline && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#020617] animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-white tracking-tight uppercase">{user.name || "Utilisateur"}</p>
              <button onClick={copyId} className="text-slate-600 hover:text-blue-400 transition-colors">
                <Fingerprint size={12} />
              </button>
              {user.role === 'ADMIN' && <Shield size={10} className="text-blue-500" />}
              {user.status === 'FROZEN' && <Snowflake size={10} className="text-cyan-400 animate-pulse" />}
            </div>
            <p className="text-[10px] text-blue-400 font-mono font-bold">π {(user.balance || 0).toLocaleString()}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
            <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${user.status === 'BANNED' ? 'border-red-500/50 text-red-500' : 'border-white/10 text-slate-500'}`}>
                {user.status}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-1 pt-3 border-t border-white/5">
        <button onClick={onViewSessions} title="Sessions" className="flex items-center justify-center p-2 text-slate-500 hover:text-blue-400 bg-white/5 rounded-xl transition-all">
          <MonitorSmartphone size={14} />
        </button>
        <button onClick={onResetPin} title="Reset PIN" className="flex items-center justify-center p-2 text-slate-500 hover:text-emerald-500 bg-white/5 rounded-xl transition-all">
          <Hash size={14} />
        </button>
        <button onClick={onResetPassword} title="Reset Password" className="flex items-center justify-center p-2 text-slate-500 hover:text-amber-500 bg-white/5 rounded-xl transition-all">
          <Key size={14} />
        </button>
        <button onClick={onToggleRole} title="Modifier Rôle" className="flex items-center justify-center p-2 text-slate-500 hover:text-blue-500 bg-white/5 rounded-xl transition-all">
          <UserCog size={14} />
        </button>
        <button onClick={onFreeze} title="Geler" className={`flex items-center justify-center p-2 rounded-xl transition-all ${user.status === 'FROZEN' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-500 hover:text-cyan-400'}`}>
          <Snowflake size={14} />
        </button>
        <button onClick={onSupport} title="Chat Support" className="flex items-center justify-center p-2 text-slate-500 hover:text-purple-400 bg-white/5 rounded-xl transition-all">
          <Headphones size={14} />
        </button>
        <button onClick={handleBalancePrompt} title="Solde" className="flex items-center justify-center p-2 bg-green-500/10 text-green-500 rounded-xl">
          <CreditCard size={14} />
        </button>
        <button onClick={onBan} title="Bannir" className={`flex items-center justify-center p-2 rounded-xl transition-all ${user.status === 'BANNED' ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-700 hover:text-red-500'}`}>
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
  const [platformFee, setPlatformFee] = useState(0.01);
  const [users, setUsers] = useState<LedgerUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const fetchData = async () => {
    try {
      const authRes = await fetch("/api/auth/me", { credentials: "include" });
      const authData = await authRes.json();
      if (!authRes.ok || authData.user?.role !== "ADMIN") {
        router.replace("/auth/login");
        return;
      }
      setAdmin(authData.user);

      const [usersRes, logsRes, configRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/logs"),
        fetch("/api/admin/config")
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (configRes.ok) {
        const config = await configRes.json();
        setIsMaintenanceMode(config.maintenanceMode);
        setPlatformFee(config.transactionFee);
      }
    } catch (err) {
      toast.error("Erreur de synchronisation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const totalPiVolume = useMemo(() => users.reduce((acc, user) => acc + (user.balance || 0), 0), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, users]);

  const handleAction = async (userId: string, action: string, amount?: number, extraData?: string) => {
    try {
      const res = await fetch(`/api/admin/users/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, amount, extraData })
      });
      if (res.ok) {
        toast.success(`Action ${action} réussie`);
        fetchData();
      } else {
        const d = await res.json();
        toast.error(d.error || "Action impossible");
      }
    } catch (error) { toast.error("Erreur réseau"); }
  };

  const handleViewSessions = async (user: LedgerUser) => {
    toast.promise(
      fetch(`/api/admin/users/${user.id}/sessions`).then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        const sessionList = data.sessions.map((s: any) => `• ${s.deviceName}\n Statut: ${s.isActive ? '✅' : '❌'}`).join('\n\n');
        alert(`TERMINAUX DE ${user.name.toUpperCase()}\n\n${sessionList || "Aucune session"}`);
      }),
      { loading: 'Analyse...', success: 'Chargé', error: 'Erreur' }
    );
  };

  const handleToggleMaintenance = async () => {
    const newStatus = !isMaintenanceMode;
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newStatus })
      });
      if (res.ok) {
        setIsMaintenanceMode(newStatus);
        toast.success(newStatus ? "Mode Maintenance activé" : "Plateforme en ligne");
      }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleApproveAllKYC = async () => {
    if (!confirm("Approuver tout ?")) return;
    try {
      const res = await fetch("/api/admin/kyc/verify-all", { method: "POST" });
      if (res.ok) { toast.success("KYC Validés"); fetchData(); }
    } catch (err) { toast.error("Erreur"); }
  };

  const handleExportCSV = () => { window.location.href = "/api/admin/export/transactions"; };

  const handleGenerateReport = async () => {
    try {
      const res = await fetch("/api/admin/reports/daily");
      const data = await res.json();
      if (res.ok) alert(`📊 RAPPORT\nNouveaux : ${data.metrics.newUsers}\nVolume : π ${data.metrics.volumePi}`);
    } catch (err) { toast.error("Erreur"); }
  };

  const handleSendGlobalNotif = async () => {
    const msg = prompt("Message pour tous :");
    if (msg) {
      await fetch("/api/admin/notifications/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Annonce Admin", message: msg })
      });
      toast.success("Envoyé");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans overflow-x-hidden">
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CircleDot size={12} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Terminal Admin</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase">ADMIN DASHBOARD</h1>
          </div>
          <button onClick={() => { fetch("/api/auth/logout", { method: "POST" }); router.replace("/auth/login"); }} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400"><LogOut size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Volume Total" value={`π ${totalPiVolume.toLocaleString()}`} subText="Système Ledger" icon={<Zap size={16} />} />
          <StatCard label="Utilisateurs" value={users.length.toString()} subText="Comptes Actifs" icon={<Users size={16} />} />
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* TAB NAVIGATION */}
        <div className="flex gap-1 p-1 bg-slate-900/50 border border-white/5 rounded-2xl">
          {["overview", "users", "finance", "settings"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all ${activeTab === tab ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"}`}>
              {tab === "overview" && <BarChart3 size={14} />}
              {tab === "users" && <Users size={14} />}
              {tab === "finance" && <Wallet size={14} />}
              {tab === "settings" && <Settings size={14} />}
              <span className="text-[8px] font-bold uppercase mt-1">{tab}</span>
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
               <StatCard label="Frais perçus" value="π 124.50" subText="Revenue Platform" icon={<ArrowDownUp size={16} />} />
               <Button onClick={handleGenerateReport} className="h-full bg-slate-900/60 border-white/5 rounded-[2rem] p-5 flex flex-col items-center justify-center gap-2 hover:bg-slate-800">
                  <FileText className="text-blue-400" size={20} />
                  <span className="text-[9px] font-bold uppercase">Rapport 24H</span>
               </Button>
            </div>
            <div className="space-y-4">
               <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Journal d'Audit</h3>
               <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] p-4 space-y-3">
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-[10px] font-bold text-blue-400 uppercase">{log.action}</p>
                        <p className="text-[9px] text-slate-400">{log.adminName} ➔ {log.targetEmail?.split('@')[0]}</p>
                      </div>
                      <span className="text-[8px] text-slate-600 font-mono bg-slate-950 px-2 py-1 rounded-md">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
               </Card>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="space-y-4 animate-in slide-in-from-bottom-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 text-xs font-bold outline-none text-white focus:border-blue-500/50 transition-all" placeholder="Rechercher..." />
            </div>
            <div className="space-y-4">
              {filteredUsers.map(user => (
                <UserRow
                  key={user.id} user={user}
                  onBan={() => handleAction(user.id, 'BAN')}
                  onFreeze={() => handleAction(user.id, user.status === 'FROZEN' ? 'UNFREEZE' : 'FREEZE')}
                  onVerify={() => handleAction(user.id, 'VERIFY')}
                  onUpdateBalance={(amount) => handleAction(user.id, 'UPDATE_BALANCE', amount)}
                  onResetPassword={() => { const p = prompt("Nouveau pass :"); if(p) handleAction(user.id, 'RESET_PASSWORD', 0, p); }}
                  onToggleRole={() => handleAction(user.id, 'TOGGLE_ROLE')}
                  onResetPin={() => { const pin = prompt("Code PIN :"); if(pin) handleAction(user.id, 'RESET_PIN', 0, pin); }}
                  onViewSessions={() => handleViewSessions(user)}
                  onSupport={() => { const m = prompt("Message :"); if(m) handleAction(user.id, 'SEND_SUPPORT', 0, m); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* FINANCE TAB */}
        {activeTab === "finance" && (
          <div className="space-y-6">
             <section className="space-y-4">
                <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2rem] text-center">
                  <Shield size={40} className="text-blue-500 mx-auto mb-4" />
                  <h3 className="font-bold text-white text-lg">Vérification KYC</h3>
                  <p className="text-[10px] text-slate-500 mt-2 uppercase">Dossiers en attente : {users.filter(u => u.status === 'PENDING').length}</p>
                </div>
                <Button onClick={handleApproveAllKYC} className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black italic rounded-2xl shadow-xl">APPROUVER TOUTES LES FILES</Button>
             </section>
             <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] p-6">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-4">Exportation</p>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={handleExportCSV} className="py-3 bg-white/5 rounded-xl text-[10px] font-bold uppercase border border-white/5">Transactions CSV</button>
                   <button className="py-3 bg-white/5 rounded-xl text-[10px] font-bold uppercase border border-white/5">Users JSON</button>
                </div>
             </Card>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <Card onClick={handleToggleMaintenance} className={`border-white/5 rounded-[2rem] p-6 flex justify-between items-center cursor-pointer transition-all ${isMaintenanceMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-slate-900/40'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isMaintenanceMode ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}><Power size={18} /></div>
                <div><p className="text-xs font-bold">Mode Maintenance</p><p className="text-[10px] text-slate-500">{isMaintenanceMode ? 'Système Locké' : 'Portails Ouverts'}</p></div>
              </div>
            </Card>
            <Card onClick={handleSendGlobalNotif} className="bg-slate-900/40 border-white/5 rounded-[2rem] p-6 flex justify-between items-center cursor-pointer hover:bg-slate-800/60">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500"><Megaphone size={18} /></div>
                <div><p className="text-xs font-bold">Annonce Globale</p><p className="text-[10px] text-slate-500">Notifier tous les membres</p></div>
              </div>
            </Card>
            <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] p-6 space-y-4">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-3"><CreditCard size={18} className="text-blue-500" /><p className="text-xs font-bold text-white">Frais de Réseau</p></div>
                   <input type="number" step="0.001" value={platformFee} onChange={(e) => setPlatformFee(parseFloat(e.target.value))} className="w-16 bg-slate-950 border border-white/10 rounded-lg p-2 text-[10px] font-mono text-center text-white" />
                </div>
            </Card>
          </div>
        )}
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
