"use client";                                                                                       import React, { useEffect, useState, useMemo } from "react";                                        import { useRouter } from "next/navigation";      import { Card } from "@/components/ui/card";      import { Button } from "@/components/ui/button";  import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import {
  LogOut, Shield, Users, Zap, Search, Key,
  Ban, TrendingUp, CreditCard, CircleDot, Power, CheckCircle2, UserCog,
  BarChart3, Settings, AlertTriangle, Wallet, ArrowDownUp, Megaphone, FileText,
  MonitorSmartphone, Hash, Snowflake, Fingerprint, Headphones,
  Flame, Gift, Globe, Activity, ShieldCheck, Database, History
} from "lucide-react";                            import { LineChart, Line, ResponsiveContainer } from "recharts";                                    
// --- TYPES ---
type AdminUser = { id: string; name: string; email: string; role: string; };
type LedgerUser = {
  id: string; name: string; email: string; status: string; role: string;
  balance: number; ipAddress?: string; trustScore?: number; isOnline?: boolean;
};
type AuditLog = { id: string; adminName: string; action: string; targetEmail: string; createdAt: string; };

// --- DATA SIMULATION ---
const chartData = [
  { day: 'Lun', vol: 450 }, { day: 'Mar', vol: 890 }, { day: 'Mer', vol: 1200 },
  { day: 'Jeu', vol: 700 }, { day: 'Ven', vol: 1500 }, { day: 'Sam', vol: 2100 }, { day: 'Dim', vol: 1800 },
];

// --- COMPOSANTS INTERNES ---

const StatCard = ({ label, value, subText, icon, trend }: { label: string; value: string; subText: string; icon: React.ReactNode; trend?: string }) => (
  <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-5 space-y-3">
    <div className="flex justify-between items-start">
      <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">{icon}</div>
      {trend && <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{trend}</span>}
    </div>
    <div>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{label}</p>
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-[9px] text-blue-400 font-bold mt-1 uppercase tracking-tighter">{subText}</p>
    </div>
  </Card>
);

const UserRow = ({ user, onBan, onFreeze, onUpdateBalance, onResetPassword, onToggleRole, onResetPin, onViewSessions, onSupport }: any) => {
  const handleBalancePrompt = () => {
    const amountInput = prompt(`Ajuster le solde de ${user.name} :`);
    if (amountInput && !isNaN(parseFloat(amountInput))) onUpdateBalance(parseFloat(amountInput));
  };

  return (
    <div className="p-5 bg-slate-900/40 border border-white/5 rounded-[2rem] space-y-4 transition-all hover:border-white/10">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border border-white/5 uppercase ${user.role === 'ADMIN' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {user.name?.[0]}
            </div>
            {user.isOnline && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#020617] animate-pulse" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-white tracking-tight uppercase">{user.name}</p>
              <ShieldCheck size={10} className={(user.trustScore || 0) > 80 ? "text-emerald-500" : "text-slate-600"} />
            </div>
            <p className="text-[10px] text-blue-400 font-mono font-bold">π {user.balance.toLocaleString()}</p>
          </div>
        </div>
        <div className="text-right">
            <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${user.status === 'BANNED' ? 'border-red-500 text-red-500' : 'border-white/10 text-slate-500'}`}>
                {user.status}
            </span>
            <p className="text-[8px] text-slate-600 mt-1 font-mono uppercase tracking-tighter">{user.ipAddress || "NO_IP"}</p>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-1 pt-3 border-t border-white/5">
        <button onClick={onViewSessions} title="Sessions" className="flex items-center justify-center p-2 text-slate-500 hover:text-blue-400 bg-white/5 rounded-xl transition-all"><MonitorSmartphone size={14} /></button>
        <button onClick={onResetPin} title="PIN" className="flex items-center justify-center p-2 text-slate-500 hover:text-emerald-500 bg-white/5 rounded-xl transition-all"><Hash size={14} /></button>
        <button onClick={onResetPassword} title="Pass" className="flex items-center justify-center p-2 text-slate-500 hover:text-amber-500 bg-white/5 rounded-xl transition-all"><Key size={14} /></button>
        <button onClick={onToggleRole} title="Rôle" className="flex items-center justify-center p-2 text-slate-500 hover:text-blue-500 bg-white/5 rounded-xl transition-all"><UserCog size={14} /></button>
        <button onClick={onFreeze} title="Geler" className={`flex items-center justify-center p-2 rounded-xl transition-all ${user.status === 'FROZEN' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-500 hover:text-cyan-400'}`}><Snowflake size={14} /></button>
        <button onClick={onSupport} title="Chat" className="flex items-center justify-center p-2 text-slate-500 hover:text-purple-400 bg-white/5 rounded-xl transition-all"><Headphones size={14} /></button>
        <button onClick={handleBalancePrompt} title="Solde" className="flex items-center justify-center p-2 bg-green-500/10 text-green-500 rounded-xl transition-all"><CreditCard size={14} /></button>
        <button onClick={onBan} title="Bannir" className={`flex items-center justify-center p-2 rounded-xl transition-all ${user.status === 'BANNED' ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-700 hover:text-red-500'}`}><Ban size={14} /></button>
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

  // INITIALISATION
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
    } catch (err) { toast.error("Sync Error"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // COMPUTED
  const totalPiVolume = useMemo(() => users.reduce((acc, user) => acc + (user.balance || 0), 0), [users]);
  const sortedHolders = useMemo(() => [...users].sort((a,b) => b.balance - a.balance).slice(0, 3), [users]);
  const ipDuplicates = useMemo(() => users.filter((u, i) => users.findIndex(u2 => u2.ipAddress === u.ipAddress) !== i && u.ipAddress), [users]);
  const filteredUsers = useMemo(() => users.filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.ipAddress?.includes(searchQuery)), [searchQuery, users]);

  // ACTIONS
  const handleAction = async (userId: string, action: string, amount?: number, extraData?: string) => {
    try {
      const res = await fetch(`/api/admin/users/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, amount, extraData })
      });
      if (res.ok) { toast.success(`${action} OK`); fetchData(); }
    } catch (error) { toast.error("Network Error"); }
  };

  const handleGlobalAirdrop = () => {
    const amount = prompt("Montant de π à distribuer à CHAQUE utilisateur actif :");
    if (amount) toast.success(`Airdrop de π ${amount} initié !`);
  };

  const handleBurn = () => {
    const amount = prompt("Montant de π à détruire de la supply :");
    if (amount) toast.error(`BURN: π ${amount} détruits.`);
  };

  const handleToggleMaintenance = async () => {
    const newStatus = !isMaintenanceMode;
    const res = await fetch("/api/admin/maintenance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: newStatus }) });
    if (res.ok) setIsMaintenanceMode(newStatus);
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
          <button onClick={() => router.push('/auth/login')} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400"><LogOut size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Volume Ledger" value={`π ${totalPiVolume.toLocaleString()}`} subText="Circulation" icon={<Zap size={16} />} trend="+12%" />
          <StatCard label="Nodes Actifs" value="124" subText="Mainnet Pi" icon={<Globe size={16} />} />
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* NAV TABS */}
        <div className="flex gap-1 p-1 bg-slate-900/50 border border-white/5 rounded-2xl overflow-x-auto">
          {["overview", "users", "finance", "settings"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[80px] flex flex-col items-center justify-center py-2 rounded-xl transition-all ${activeTab === tab ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"}`}>
               {tab === "overview" && <BarChart3 size={14} />}
               {tab === "users" && <Users size={14} />}
               {tab === "finance" && <Wallet size={14} />}
               {tab === "settings" && <Settings size={14} />}
               <span className="text-[8px] font-bold uppercase mt-1">{tab}</span>
            </button>
          ))}
        </div>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-6">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Activité Réseau (7j)</p>
                <div className="h-28 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <Line type="monotone" dataKey="vol" stroke="#3b82f6" strokeWidth={3} dot={false} />
                      </LineChart>
                   </ResponsiveContainer>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <StatCard label="Frais Perçus" value="π 124.5" subText="Revenus" icon={<ArrowDownUp size={16} />} />
                <Button onClick={() => toast.info("Génération...")} className="h-full bg-slate-900/60 border-white/5 rounded-[2rem] p-5 flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                  <FileText className="text-blue-400" size={20} />
                  <span className="text-[9px] font-bold uppercase">Rapport PDF</span>
                </Button>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2"><History size={12}/> Journal d'Audit</h3>
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

        {/* --- USERS TAB --- */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2">
            {ipDuplicates.length > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                <AlertTriangle className="text-red-500" size={18} />
                <p className="text-[10px] font-bold text-red-500 uppercase leading-tight">Alerte Sybil : {ipDuplicates.length} comptes avec IP identiques !</p>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 text-xs font-bold outline-none text-white focus:border-blue-500/50 transition-all" placeholder="Nom, Email ou IP..." />
            </div>
            <div className="space-y-4">
              {filteredUsers.map(user => (
                <UserRow key={user.id} user={user}
                  onBan={() => handleAction(user.id, 'BAN')}
                  onFreeze={() => handleAction(user.id, user.status === 'FROZEN' ? 'UNFREEZE' : 'FREEZE')}
                  onUpdateBalance={(a: any) => handleAction(user.id, 'UPDATE_BALANCE', a)}
                  onResetPassword={() => { const p = prompt("Nouveau pass :"); if(p) handleAction(user.id, 'RESET_PASSWORD', 0, p); }}
                  onToggleRole={() => handleAction(user.id, 'TOGGLE_ROLE')}
                  onResetPin={() => { const pin = prompt("Code PIN :"); if(pin) handleAction(user.id, 'RESET_PIN', 0, pin); }}
                  onViewSessions={() => {
                    fetch(`/api/admin/users/${user.id}/sessions`).then(r => r.json()).then(d => alert(`Sessions: ${d.sessions.length}`));
                  }}
                  onSupport={() => { const m = prompt("Message :"); if(m) handleAction(user.id, 'SEND_SUPPORT', 0, m); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* --- FINANCE TAB --- */}
        {activeTab === "finance" && (
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <Button onClick={handleGlobalAirdrop} className="h-32 bg-emerald-600/10 border border-emerald-500/20 rounded-[2rem] flex flex-col gap-2 hover:bg-emerald-600/20 transition-all">
                  <Gift className="text-emerald-500" size={24} />
                  <span className="text-[10px] font-black uppercase">Mass Airdrop</span>
                </Button>
                <Button onClick={handleBurn} className="h-32 bg-orange-600/10 border border-orange-500/20 rounded-[2rem] flex flex-col gap-2 hover:bg-orange-600/20 transition-all">
                  <Flame className="text-orange-500" size={24} />
                  <span className="text-[10px] font-black uppercase">Burn Supply</span>
                </Button>
             </div>

             <section className="space-y-4">
                <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2rem] text-center">
                  <ShieldCheck size={40} className="text-blue-500 mx-auto mb-4" />
                  <h3 className="font-black text-white text-lg uppercase tracking-tighter">Vérification KYC</h3>
                  <p className="text-[10px] text-slate-500 mt-2 uppercase">File d'attente : {users.filter(u => u.status === 'PENDING').length}</p>
                </div>
                <Button onClick={() => handleAction('', 'VERIFY_ALL')} className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black italic rounded-2xl shadow-xl transition-all">APPROUVER TOUTE LA FILE</Button>
             </section>

             <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="text-blue-500" size={20} />
                  <p className="text-xs font-black uppercase">Sync Bridge Pi Network</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-500">Node Status</span><span className="text-emerald-500">Live</span></div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="w-[98%] h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" /></div>
                </div>
             </Card>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] p-6">
              <div className="flex items-center gap-3 mb-4"><Megaphone size={18} className="text-blue-500" /><p className="text-xs font-black uppercase">Message Défilant (User App)</p></div>
              <textarea className="w-full bg-slate-950/50 border border-white/5 rounded-xl p-4 text-[11px] font-bold text-slate-300 outline-none focus:border-blue-500/50" rows={2} placeholder="Ex: Bienvenue sur PIMPAY..." />
              <Button className="w-full mt-3 bg-blue-600 h-10 rounded-xl text-[10px] font-black uppercase">Mettre à jour l'annonce</Button>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card onClick={handleToggleMaintenance} className={`p-5 rounded-[2rem] border-white/5 cursor-pointer transition-all ${isMaintenanceMode ? 'bg-orange-600/20' : 'bg-slate-900/40'}`}>
                <Power size={20} className={isMaintenanceMode ? 'text-orange-500' : 'text-slate-600'} />
                <p className="text-[10px] font-black uppercase mt-3">Maintenance</p>
              </Card>
              <Card onClick={() => toast.success("Backup Ready")} className="p-5 rounded-[2rem] bg-slate-900/40 border-white/5 cursor-pointer hover:bg-slate-800/60 transition-all">
                <Database size={20} className="text-blue-500" />
                <p className="text-[10px] font-black uppercase mt-3">Backup DB</p>
              </Card>
            </div>

            <div className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl flex justify-between items-center">
              <div className="flex items-center gap-3"><CreditCard size={16} className="text-blue-500" /><span className="text-[10px] font-bold uppercase">Frais Réseau π</span></div>
              <input type="number" step="0.001" value={platformFee} onChange={(e) => setPlatformFee(parseFloat(e.target.value))} className="w-16 bg-slate-900 border border-white/10 rounded-lg p-2 text-[10px] font-mono text-center text-white outline-none" />
            </div>
          </div>
        )}
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
