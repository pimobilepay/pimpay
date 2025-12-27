"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";                                    
import { toast } from "sonner";             
import {
  LogOut, Shield, Users, Zap, Search, Key,    
  CreditCard, CircleDot, UserCog, Ban,
  Settings, Wallet, Megaphone, MonitorSmartphone, Hash, Snowflake, Headphones,                                             
  Flame, Globe, Activity, ShieldCheck, Database, History,                           
  Cpu, HardDrive, Server, Terminal, LayoutGrid, ArrowUpRight, CheckCircle2, Send, Clock, CalendarClock, RefreshCw
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip } from "recharts";

// --- TYPES ---
type LedgerUser = {
  id: string;
  name: string | null;
  email: string | null;
  status: 'ACTIVE' | 'BANNED' | 'PENDING' | 'FROZEN' | 'SUSPENDED';
  role: 'ADMIN' | 'USER' | 'MERCHANT' | 'AGENT';
  autoApprove: boolean;
  wallets: { balance: number; currency: string }[];
  kycStatus?: string;
  lastLoginIp?: string | null;
  createdAt: string;
};

type AuditLog = {
  id: string;
  adminName: string | null;
  action: string;
  targetEmail: string | null;
  createdAt: string;
};

type ServerStats = {
  cpuUsage: string;
  ramUsage: string;
  storage: string;
  uptime: string;
  latency: string;
};

const chartData = [
  { day: 'Lun', vol: 450 }, { day: 'Mar', vol: 890 }, { day: 'Mer', vol: 1200 },
  { day: 'Jeu', vol: 700 }, { day: 'Ven', vol: 1500 }, { day: 'Sam', vol: 2100 }, { day: 'Dim', vol: 1800 },
];

// --- COMPOSANTS ---

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

const UserRow = ({ user, isSelected, onSelect, onUpdateBalance, onResetPassword, onToggleRole, onResetPin, onFreeze, onToggleAutoApprove, onIndividualMaintenance, onViewSessions, onSupport, onBan }: any) => {
  const piBalance = user.wallets?.find((w: any) => w.currency === "PI" || w.currency === "pi")?.balance || 0;

  return (
    <div className={`p-5 bg-slate-900/40 border ${isSelected ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5'} rounded-[2rem] space-y-4 transition-all notranslate`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="relative group" onClick={onSelect}>
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border uppercase cursor-pointer ${isSelected ? 'bg-blue-600 border-white' : 'bg-slate-800 border-white/5 text-slate-400'}`}>
                {isSelected ? <CheckCircle2 size={20} /> : (user.name?.[0] || '?')}
             </div>
             {user.status === 'ACTIVE' && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#020617]" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-white tracking-tight uppercase">{user.name || "Sans nom"}</p>
              <ShieldCheck size={10} className={user.kycStatus === 'VERIFIED' ? "text-emerald-500" : "text-slate-600"} />
            </div>
            <p className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-widest">
                {user.role} • π {piBalance.toLocaleString()}
            </p>
          </div>
        </div>
        <button onClick={onBan} className={`text-[7px] font-black px-2 py-1 rounded-full border uppercase tracking-widest transition-colors ${user.status === 'BANNED' ? 'bg-red-500 border-red-500 text-white' : 'border-white/10 text-slate-500 hover:border-red-500 hover:text-red-500'}`}>
            {user.status === 'BANNED' ? 'Débannir' : 'Bannir'}
        </button>
      </div>

      <div className="grid grid-cols-9 gap-1 pt-3 border-t border-white/5">
        <button onClick={onViewSessions} title="Infos Session" className="flex items-center justify-center p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors"><MonitorSmartphone size={14} /></button>
        <button onClick={onResetPin} title="Réinitialiser PIN" className="flex items-center justify-center p-2 text-slate-500 bg-white/5 rounded-xl hover:text-white"><Hash size={14} /></button>
        <button onClick={onResetPassword} title="Nouveau Mot de passe" className="flex items-center justify-center p-2 text-slate-500 bg-white/5 rounded-xl hover:text-white"><Key size={14} /></button>
        <button onClick={onToggleRole} title="Changer Rôle" className="flex items-center justify-center p-2 text-slate-500 bg-white/5 rounded-xl hover:text-white"><UserCog size={14} /></button>
        <button onClick={onFreeze} title="Geler le compte" className={`flex items-center justify-center p-2 rounded-xl transition-colors ${user.status === 'FROZEN' ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-500 hover:text-cyan-400'}`}><Snowflake size={14} /></button>
        <button onClick={onSupport} title="Support Direct" className="flex items-center justify-center p-2 text-slate-500 bg-white/5 rounded-xl hover:text-white"><Headphones size={14} /></button>
        <button onClick={onToggleAutoApprove} title="Auto-Approbation" className={`flex items-center justify-center p-2 rounded-xl transition-colors ${user.autoApprove ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-700 hover:text-emerald-500'}`}><Shield size={14} /></button>
        <button onClick={() => onIndividualMaintenance(user)} title="Maint. Individuelle" className="flex items-center justify-center p-2 bg-orange-500/10 text-orange-500 rounded-xl hover:bg-orange-500/20"><Clock size={14} /></button>
        <button onClick={() => {
          const amount = prompt(`Ajuster solde pour ${user.name} :`);
          if (amount) onUpdateBalance(parseFloat(amount));
        }} title="Modifier Balance" className="flex items-center justify-center p-2 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500/20"><CreditCard size={14} /></button>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [maintenanceTime, setMaintenanceTime] = useState("");
  const [users, setUsers] = useState<LedgerUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [serverStats, setServerStats] = useState<ServerStats>({
    cpuUsage: "0%", ramUsage: "0%", storage: "0%", uptime: "0h", latency: "0ms"
  });

  const fetchData = async () => {
    try {
      const [usersRes, configRes, logsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/config"),
        fetch("/api/admin/logs")
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (configRes.ok) {
        const config = await configRes.json();
        setIsMaintenanceMode(config.maintenanceMode);
        setTotalProfit(config.totalProfit || 0);
      }

      // Simulation de stats serveur temps réel
      setServerStats({
        cpuUsage: `${Math.floor(Math.random() * 15 + 5)}%`,
        ramUsage: `${(Math.random() * 2 + 1).toFixed(1)}GB / 8GB`,
        storage: "12.4GB / 50GB",
        uptime: "14d 6h 22m",
        latency: `${Math.floor(Math.random() * 20 + 10)}ms`
      });

    } catch (err) { toast.error("Erreur de synchronisation"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const calculatedTotalVolume = useMemo(() => {
    return users.reduce((acc, user) => {
      const piWallet = user.wallets?.find(w => w.currency === "PI" || w.currency === "pi");
      return acc + (piWallet?.balance || 0);
    }, 0);
  }, [users]);

  const handleAction = async (userId: string | null, action: string, amount?: number, extraData?: string, userIds?: string[]) => {
    try {
      const res = await fetch(`/api/admin/users/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, amount, extraData, userIds })
      });
      if (res.ok) {
        toast.success("Action propagée avec succès");
        setSelectedUserIds([]);
        fetchData();
      }
    } catch (error) { toast.error("Erreur de communication API"); }
  };

  const filteredUsers = useMemo(() =>
    users.filter(u => 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery, users]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-6" />
      <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[5px] animate-pulse">Accès Terminal Sécurisé</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans overflow-x-hidden notranslate" translate="no">

      {/* Barre flottante pour actions groupées */}
      {selectedUserIds.length > 0 && (
        <div className="fixed bottom-24 left-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="bg-blue-600 rounded-[2.5rem] p-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20">
            <div className="flex flex-col ml-4">
               <span className="text-[10px] font-black uppercase text-white/70">Multi-Sélection</span>
               <span className="text-sm font-black text-white">{selectedUserIds.length} Utilisateurs</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => {
                const a = prompt("Montant Airdrop Global :");
                if(a) handleAction(null, "BATCH_AIRDROP", parseFloat(a), "", selectedUserIds);
              }} className="h-12 bg-white/10 hover:bg-white/20 rounded-2xl px-6 text-[10px] font-black uppercase transition-all">Airdrop</Button>
              <Button onClick={() => handleAction(null, "BATCH_BAN", 0, "", selectedUserIds)} className="h-12 bg-red-500 hover:bg-red-400 rounded-2xl px-6 text-[10px] font-black uppercase shadow-lg transition-all">Bannir</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header avec bouton Refresh */}
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CircleDot size={12} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[3px]">System Operations</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">PIMPAY<span className="text-blue-500">CORE</span></h1>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all active:scale-95">
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => router.push('/auth/login')} className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                <LogOut size={20} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Circulation Totale" value={`π ${calculatedTotalVolume.toLocaleString()}`} subText="Ledger Balance" icon={<Zap size={16} />} trend="+1.2%" />
          <StatCard label="Population" value={users.length.toString()} subText="Comptes Vérifiés" icon={<Users size={16} />} />
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* Navigation Tabs (Style Futuriste) */}
        <div className="flex gap-1 p-1 bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-3xl sticky top-4 z-50 shadow-2xl">
          {[
            { id: "overview", icon: <LayoutGrid size={18}/>, label: "Vue" },
            { id: "users", icon: <Users size={18}/>, label: "Users" },
            { id: "finance", icon: <Wallet size={18}/>, label: "Pi" },
            { id: "system", icon: <Server size={18}/>, label: "Srv" },
            { id: "settings", icon: <Settings size={18}/>, label: "Conf" }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300"}`}>
               {tab.icon}
               <span className="text-[7px] font-black uppercase mt-1 tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <Card className="bg-slate-900/60 border-white/5 rounded-[2.5rem] p-6 h-48 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={80} className="text-blue-500" />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-6 tracking-[3px]">Analyse Transactions 24H</p>
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={chartData}>
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px'}} />
                      <Line type="stepAfter" dataKey="vol" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6' }} />
                   </LineChart>
                </ResponsiveContainer>
            </Card>

            <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <History size={16} className="text-blue-400" />
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Logs de Sécurité</p>
                </div>
                <span className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold">LIVE</span>
              </div>
              <div className="space-y-4">
                {logs.length > 0 ? logs.slice(0, 6).map(log => (
                  <div key={log.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors rounded-lg px-2">
                    <div>
                      <p className="text-[9px] font-black text-white uppercase tracking-tighter">{log.action}</p>
                      <p className="text-[8px] text-slate-500 font-medium italic">{log.adminName || 'Système'} → {log.targetEmail || 'Root'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-mono text-blue-500/50">{new Date(log.createdAt).toLocaleTimeString()}</p>
                        <p className="text-[6px] text-slate-700 uppercase">{new Date(log.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                )) : <div className="py-10 text-center text-slate-700 uppercase font-black text-[9px] tracking-[5px]">Initialisation du flux...</div>}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-400">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-16 bg-slate-900/50 border border-white/5 rounded-[1.5rem] pl-14 pr-6 text-xs font-bold outline-none text-white focus:border-blue-500/50 focus:bg-slate-900 transition-all shadow-inner" placeholder="IDENTIFIANT, NOM OU EMAIL..." />
            </div>
            <div className="space-y-4">
              {filteredUsers.length > 0 ? filteredUsers.map(user => (
                <UserRow key={user.id} user={user}
                  isSelected={selectedUserIds.includes(user.id)}
                  onSelect={() => setSelectedUserIds(prev => prev.includes(user.id) ? prev.filter(i => i !== user.id) : [...prev, user.id])}
                  onUpdateBalance={(a: number) => handleAction(user.id, 'UPDATE_BALANCE', a)}
                  onResetPassword={() => { const p = prompt("Nouveau mot de passe sécurisé :"); if(p) handleAction(user.id, 'RESET_PASSWORD', 0, p); }}
                  onToggleRole={() => handleAction(user.id, 'TOGGLE_ROLE')}
                  onResetPin={() => { const p = prompt("Nouveau code PIN (4-6 chiffres) :"); if(p) handleAction(user.id, 'RESET_PIN', 0, p); }}
                  onFreeze={() => handleAction(user.id, 'FREEZE')}
                  onToggleAutoApprove={() => handleAction(user.id, 'TOGGLE_AUTO_APPROVE')}
                  onViewSessions={() => toast.info(`Dernière IP: ${user.lastLoginIp || "Inconnue"}\nInscrit le: ${new Date(user.createdAt).toLocaleDateString()}`, { duration: 5000 })}
                  onSupport={() => toast.success(`Chat sécurisé ouvert avec ${user.name}`)}
                  onBan={() => handleAction(user.id, user.status === 'BANNED' ? 'UNBAN' : 'BAN')}
                  onIndividualMaintenance={(u: any) => {
                    const d = prompt("Date fin maintenance (YYYY-MM-DD):");
                    const t = prompt("Heure fin (HH:MM):");
                    if(d && t) handleAction(u.id, "USER_SPECIFIC_MAINTENANCE", 0, `${d}T${t}:00.000Z`);
                  }}
                />
              )) : <div className="text-center py-24 opacity-10 uppercase font-black text-sm tracking-[15px]">Vide</div>}
            </div>
          </div>
        )}

        {activeTab === "finance" && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="grid grid-cols-2 gap-4">
               <StatCard label="Retraits en Attente" value="π 0" subText="Queue Prioritaire" icon={<Clock size={16} />} />
               <StatCard label="Revenus Bruts" value={`π ${totalProfit.toFixed(4)}`} subText="Frais de Réseau" icon={<Flame size={16} />} trend="Global" />
            </div>
            <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-8 text-center border-dashed">
               <div className="flex flex-col items-center justify-center opacity-30">
                  <Activity size={48} className="text-blue-500 mb-4 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[5px]">Flux de Retrait Stable</p>
                  <p className="text-[8px] mt-2 italic">Toutes les demandes ont été traitées.</p>
               </div>
            </Card>
          </div>
        )}

        {activeTab === "system" && (
          <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
            <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-6 space-y-6">
              <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-500"><Terminal size={24} /></div>
                <div>
                    <p className="text-sm font-black text-white uppercase tracking-widest">Noyau Système</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                        <p className="text-[9px] text-emerald-500 uppercase font-black">Cluster Opérationnel</p>
                    </div>
                </div>
              </div>

              {/* Stats Serveur Détaillées */}
              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: "CPU Load", val: serverStats.cpuUsage, icon: <Cpu size={14} />, color: "text-blue-400" },
                  { label: "Mémoire Vive", val: serverStats.ramUsage, icon: <Activity size={14} />, color: "text-purple-400" },
                  { label: "Stockage NVMe", val: serverStats.storage, icon: <HardDrive size={14} />, color: "text-amber-400" },
                  { label: "Temps de réponse", val: serverStats.latency, icon: <Zap size={14} />, color: "text-emerald-400" },
                  { label: "Système Uptime", val: serverStats.uptime, icon: <Clock size={14} />, color: "text-slate-400" },
                  { label: "Instance", val: "AWS-EC2-PIMPAY-01", icon: <Globe size={14} />, color: "text-indigo-400" },
                  { label: "Base de données", val: "PostgreSQL 15 (Neon)", icon: <Database size={14} />, color: "text-cyan-400" }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                    <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-3 tracking-tighter group-hover:text-white transition-colors">
                        <span className={item.color}>{item.icon}</span> {item.label}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-white">{item.val}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <CalendarClock size={20} className="text-orange-500" />
                <p className="text-xs font-black uppercase tracking-[4px]">Maintenance Master</p>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase ml-1">Date de fin</p>
                    <input type="date" value={maintenanceDate} onChange={(e) => setMaintenanceDate(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-[11px] text-white outline-none focus:border-orange-500/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase ml-1">Heure de fin</p>
                    <input type="time" value={maintenanceTime} onChange={(e) => setMaintenanceTime(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-[11px] text-white outline-none focus:border-orange-500/50 transition-all" />
                  </div>
                </div>
                <Button onClick={() => handleAction(null, 'SET_MAINTENANCE_TIME', 0, `${maintenanceDate}T${maintenanceTime}`)} className="w-full bg-orange-600 hover:bg-orange-500 h-14 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-orange-900/20 transition-all">Planifier l'arrêt</Button>
                
                <div className="pt-6 border-t border-white/5">
                   <Button onClick={() => handleAction(null, 'TOGGLE_MAINTENANCE')} className={`w-full h-14 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg ${isMaintenanceMode ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 'bg-slate-800 hover:bg-slate-700 shadow-black/20'}`}>
                    {isMaintenanceMode ? "FORCER LA RÉOUVERTURE" : "DÉCLENCHER MAINTENANCE IMMÉDIATE"}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-6">
               <div className="flex items-center gap-3 mb-6">
                <Megaphone size={20} className="text-purple-500" />
                <p className="text-xs font-black uppercase tracking-[4px]">Global Broadcast</p>
              </div>
              <textarea placeholder="Message prioritaire pour tous les utilisateurs..." className="w-full h-32 bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-[11px] text-white outline-none mb-4 resize-none focus:border-purple-500/50 transition-all placeholder:text-slate-700" />
              <Button className="w-full bg-purple-600 hover:bg-purple-500 h-14 rounded-2xl text-[10px] font-black uppercase flex gap-3 justify-center items-center shadow-lg shadow-purple-900/20 transition-all">
                <Send size={16}/> Diffuser l'alerte
              </Button>
            </Card>
          </div>
        )}
      </div>
      
      {/* Navigation Mobile Basse */}
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
