"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import {
  LogOut, Shield, Users, Zap, Search, Key, CreditCard, CircleDot, UserCog, Ban,
  Settings, Wallet, Megaphone, MonitorSmartphone, Hash, Snowflake, Headphones,
  Flame, Globe, Activity, ShieldCheck, Database, History,
  Cpu, HardDrive, Server, Terminal, LayoutGrid, ArrowUpRight, CheckCircle2, Send, Clock,
  CalendarClock, RefreshCw, ShoppingBag, Landmark, Percent, Gavel, SmartphoneNfc, Timer, Radio
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

// --- TYPES ---
type LedgerUser = {
  id: string;
  name: string | null;
  email: string | null;
  status: 'ACTIVE' | 'BANNED' | 'PENDING' | 'FROZEN' | 'SUSPENDED';
  role: 'ADMIN' | 'USER' | 'MERCHANT' | 'AGENT';
  autoApprove: boolean;
  wallets: { balance: number; currency: string }[];
  kycStatus?: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
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
  activeSessions: number;
};

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

const UserRow = ({ user, isSelected, onSelect, onUpdateBalance, onResetPassword, onToggleRole, onResetPin, onFreeze, onToggleAutoApprove, onIndividualMaintenance, onViewSessions, onSupport, onBan }: any) => {
  const piBalance = user.wallets?.find((w: any) => w.currency.toUpperCase() === "PI")?.balance || 0;

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
        <button onClick={onViewSessions} title="Infos Session" className="flex items-center justify-center p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white"><MonitorSmartphone size={14} /></button>
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

// --- DASHBOARD CONTENT ---

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Maintenance States
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceEnd, setMaintenanceEnd] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const [users, setUsers] = useState<LedgerUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [serverStats, setServerStats] = useState<ServerStats>({
    cpuUsage: "0%", ramUsage: "0%", storage: "0%", uptime: "0h", latency: "0ms", activeSessions: 0
  });

  // Countdown Logic
  useEffect(() => {
    if (!maintenanceEnd || !isMaintenanceMode) return;
    const timer = setInterval(() => {
      const distance = new Date(maintenanceEnd).getTime() - new Date().getTime();
      if (distance < 0) {
        setTimeLeft("EXPIRED");
        clearInterval(timer);
      } else {
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [maintenanceEnd, isMaintenanceMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Correction des endpoints pour correspondre à ta structure
      const [usersRes, configRes, logsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/config"),
        fetch("/api/admin/logs")
      ]);

      if (usersRes.ok) {
        const userData = await usersRes.json();
        setUsers(userData);
        setServerStats(prev => ({
            ...prev,
            activeSessions: userData.filter((u:any) => u.status === 'ACTIVE').length,
            cpuUsage: `${Math.floor(Math.random() * 10 + 2)}%`,
            latency: `${Math.floor(Math.random() * 15 + 5)}ms`
        }));
      }

      if (logsRes.ok) setLogs(await logsRes.json());

      if (configRes.ok) {
        const config = await configRes.json();
        setIsMaintenanceMode(config.maintenanceMode);
        setMaintenanceEnd(config.maintenanceUntil || null);
      }

    } catch (err) {
      toast.error("Erreur de synchronisation Base de données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // FONCTION UNIFIÉE POUR TOUTES LES ACTIONS (CORRIGÉE POUR TON API)
  const handleAction = async (userId: string | null, action: string, amount?: number, extraData?: string, userIds?: string[]) => {
    try {
      const res = await fetch(`/api/admin`, { // On pointe vers la route centrale que nous avons créée
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, amount, extraData, userIds })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Action effectuée");
        setSelectedUserIds([]);
        fetchData(); // Rafraîchir les données
      } else {
        toast.error(data.error || "Échec de l'action");
      }
    } catch (error) {
        toast.error("Erreur de communication serveur");
    }
  };

  const handleMaintenanceUpdate = async () => {
    const date = prompt("Date de fin (YYYY-MM-DD) :", new Date().toISOString().split('T')[0]);
    const time = prompt("Heure de fin (HH:MM) :", "12:00");
    if (!date || !time) return;

    handleAction(null, "PLAN_MAINTENANCE", 0, `${date}T${time}:00.000Z`);
  };

  const handleSendAnnouncement = async () => {
    const msg = prompt("Message de l'annonce Network :");
    if(msg) handleAction(null, "SEND_NETWORK_ANNOUNCEMENT", 0, msg);
  };

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery, users]);

  const calculatedTotalVolume = useMemo(() => {
    return users.reduce((acc, user) => {
      const piWallet = user.wallets?.find(w => w.currency.toUpperCase() === "PI");
      return acc + (piWallet?.balance || 0);
    }, 0);
  }, [users]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-6" />
      <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[5px]">Initialisation Sécurisée...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans overflow-x-hidden notranslate" translate="no">

      {/* Barre flottante pour actions groupées */}
      {selectedUserIds.length > 0 && (
        <div className="fixed bottom-24 left-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-10">
          <div className="bg-blue-600 rounded-[2.5rem] p-4 flex items-center justify-between shadow-2xl border border-white/20">
            <span className="text-xs font-black uppercase text-white ml-4">{selectedUserIds.length} Sélectionnés</span>
            <div className="flex gap-2">
              <Button onClick={() => {
                const a = prompt("Montant Airdrop Global :");
                if(a) handleAction(null, "BATCH_AIRDROP", parseFloat(a), "", selectedUserIds);
              }} className="h-10 bg-white/10 hover:bg-white/20 rounded-xl px-4 text-[10px] font-black uppercase">Airdrop</Button>
              <Button onClick={() => handleAction(null, "BATCH_BAN", 0, "", selectedUserIds)} className="h-10 bg-red-500 hover:bg-red-400 rounded-xl px-4 text-[10px] font-black uppercase">Bannir</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CircleDot size={12} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[3px]">PIMPAY ADMIN v4.0</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">PIMPAY<span className="text-blue-500">CORE</span></h1>
          </div>
          <button onClick={fetchData} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Volume Ledger" value={`π ${calculatedTotalVolume.toLocaleString()}`} subText="En circulation" icon={<Zap size={16} />} trend="+4.1%" />
          <StatCard label="Sessions Actives" value={serverStats.activeSessions.toString()} subText="Live Users" icon={<Users size={16} />} />
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-3xl sticky top-4 z-50">
          {[
            { id: "overview", icon: <LayoutGrid size={18}/>, label: "Vue" },
            { id: "users", icon: <Users size={18}/>, label: "Users" },
            { id: "finance", icon: <Landmark size={18}/>, label: "Fin" },
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
          <div className="space-y-6 animate-in fade-in duration-500">
             {isMaintenanceMode && (
                <Card className="bg-orange-500/10 border border-orange-500/20 rounded-[2rem] p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500 rounded-2xl text-white animate-pulse"><Timer size={20} /></div>
                        <div>
                            <p className="text-[10px] font-black text-orange-500 uppercase">Maintenance Active</p>
                            <p className="text-xl font-black text-white font-mono">{timeLeft}</p>
                        </div>
                    </div>
                    <Button onClick={() => handleAction(null, "TOGGLE_MAINTENANCE")} variant="ghost" className="text-orange-500 text-[10px] font-black uppercase">Arrêter</Button>
                </Card>
             )}

             <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-900/40 border-white/5 rounded-3xl p-4 flex flex-col justify-center items-center text-center">
                    <SmartphoneNfc size={20} className="text-blue-400 mb-2" />
                    <p className="text-[8px] font-black uppercase text-slate-500">Paiements NFC</p>
                    <p className="text-lg font-black text-white">π 0.00</p>
                </Card>
                <Card className="bg-slate-900/40 border-white/5 rounded-3xl p-4 flex flex-col justify-center items-center text-center">
                    <Landmark size={20} className="text-emerald-400 mb-2" />
                    <p className="text-[8px] font-black uppercase text-slate-500">Pool de Liquidité</p>
                    <p className="text-lg font-black text-white">π 1.2M</p>
                </Card>
             </div>

            <Card className="bg-slate-900/60 border-white/5 rounded-[2.5rem] p-6 h-48 overflow-hidden relative">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-6 tracking-[3px]">Activité Réseau (Vol/24h)</p>
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="vol" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVol)" strokeWidth={3} />
                   </AreaChart>
                </ResponsiveContainer>
            </Card>

            <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-6">
              <div className="flex items-center gap-3 mb-6">
                <History size={16} className="text-blue-400" />
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Logs Audit Temps Réel</p>
              </div>
              <div className="space-y-4">
                {logs.length > 0 ? logs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 px-2">
                    <div>
                      <p className="text-[9px] font-black text-white uppercase">{log.action}</p>
                      <p className="text-[8px] text-slate-500 italic">{log.adminName || 'Système'} → {log.targetEmail || 'Root'}</p>
                    </div>
                    <p className="text-[8px] font-mono text-blue-500/50">{new Date(log.createdAt).toLocaleTimeString()}</p>
                  </div>
                )) : <div className="py-10 text-center text-slate-700 font-black text-[9px] uppercase tracking-[5px]">Chargement des flux...</div>}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-400">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-16 bg-slate-900/50 border border-white/5 rounded-[1.5rem] pl-14 pr-6 text-xs font-bold outline-none text-white focus:border-blue-500/50" placeholder="RECHERCHER UN UTILISATEUR..." />
            </div>
            <div className="space-y-4">
              {filteredUsers.length > 0 ? filteredUsers.map(user => (
                <UserRow key={user.id} user={user}
                  isSelected={selectedUserIds.includes(user.id)}
                  onSelect={() => setSelectedUserIds(prev => prev.includes(user.id) ? prev.filter(i => i !== user.id) : [...prev, user.id])}
                  onUpdateBalance={(a: number) => handleAction(user.id, 'UPDATE_BALANCE', a)}
                  onResetPassword={() => { const p = prompt("Nouveau Password :"); if(p) handleAction(user.id, 'RESET_PASSWORD', 0, p); }}
                  onToggleRole={() => handleAction(user.id, 'TOGGLE_ROLE')}
                  onResetPin={() => { const p = prompt("Nouveau PIN :"); if(p) handleAction(user.id, 'RESET_PIN', 0, p); }}
                  onFreeze={() => handleAction(user.id, 'FREEZE')}
                  onToggleAutoApprove={() => handleAction(user.id, 'TOGGLE_AUTO_APPROVE')}
                  onViewSessions={() => toast.info(`Dernière IP: ${user.lastLoginIp || "N/A"}`)}
                  onSupport={() => toast.success(`Support ouvert pour ${user.name}`)}
                  onBan={() => handleAction(user.id, user.status === 'BANNED' ? 'UNBAN' : 'BAN')}
                  onIndividualMaintenance={(u: any) => {
                    const d = prompt("Fin Maint. (YYYY-MM-DD):");
                    const t = prompt("Heure (HH:MM):");
                    if(d && t) handleAction(u.id, "USER_SPECIFIC_MAINTENANCE", 0, `${d}T${t}:00.000Z`);
                  }}
                />
              )) : <div className="text-center py-24 opacity-10 uppercase font-black text-sm tracking-[15px]">Aucun Compte</div>}
            </div>
          </div>
        )}

        {activeTab === "finance" && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Landmark size={18} className="text-emerald-500" />
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Outils Financiers</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    <Button onClick={() => {
                        const amt = prompt("Montant Airdrop pour TOUS les utilisateurs :");
                        if(amt) handleAction(null, "AIRDROP_ALL", parseFloat(amt));
                    }} className="h-16 bg-emerald-500 hover:bg-emerald-600 rounded-2xl flex items-center justify-between px-6 group transition-all">
                        <div className="flex items-center gap-4">
                            <Flame size={20} className="group-hover:animate-bounce" />
                            <span className="font-black uppercase text-[10px]">Exécuter Airdrop Global</span>
                        </div>
                        <ArrowUpRight size={18} />
                    </Button>
                    <Button className="h-16 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl flex items-center justify-between px-6">
                        <span className="font-black uppercase text-[10px]">Gestion des Frais</span>
                        <Percent size={18} />
                    </Button>
                </div>
             </Card>
          </div>
        )}

        {activeTab === "system" && (
          <div className="grid grid-cols-1 gap-4 animate-in zoom-in-95">
             <div className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-6 space-y-6">
                <div className="flex items-center gap-3"><Activity size={18} className="text-blue-500" /><p className="text-[10px] font-black text-white uppercase tracking-widest">État du Serveur (Live)</p></div>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-1"><p className="text-[8px] font-black text-slate-500 uppercase">CPU Usage</p><p className="text-lg font-black text-white font-mono">{serverStats.cpuUsage}</p></div>
                   <div className="space-y-1"><p className="text-[8px] font-black text-slate-500 uppercase">Latence DB</p><p className="text-lg font-black text-emerald-500 font-mono">{serverStats.latency}</p></div>
                   <div className="space-y-1"><p className="text-[8px] font-black text-slate-500 uppercase">Stockage</p><p className="text-lg font-black text-white font-mono">24.8%</p></div>
                   <div className="space-y-1"><p className="text-[8px] font-black text-slate-500 uppercase">Uptime</p><p className="text-lg font-black text-white font-mono">14j 6h</p></div>
                </div>
                <div className="pt-4 border-t border-white/5">
                    <Button onClick={handleSendAnnouncement} className="w-full h-12 bg-blue-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">
                        <Radio size={14} className="animate-pulse" />
                        Envoyer Annonce Network
                    </Button>
                </div>
             </div>
          </div>
        )}

        {activeTab === "settings" && (
            <div className="space-y-4 animate-in slide-in-from-left-4">
                <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3"><Settings size={18} className="text-blue-500" /><p className="text-[10px] font-black text-white uppercase tracking-widest">Maintenance Système</p></div>
                        <button onClick={() => {
                            if(window.confirm("Changer l'état immédiat ?")) handleAction(null, "TOGGLE_MAINTENANCE");
                        }} className={`w-12 h-6 rounded-full relative transition-colors ${isMaintenanceMode ? 'bg-red-500' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isMaintenanceMode ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <Button onClick={handleMaintenanceUpdate} variant="outline" className="w-full h-12 border-white/10 bg-white/5 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">
                            <CalendarClock size={14} />
                            Planifier/Modifier Maintenance
                        </Button>
                        <p className="text-[9px] text-slate-500 leading-relaxed uppercase font-bold italic opacity-50">* Le mode maintenance redirige tous les utilisateurs vers la page d'attente.</p>
                    </div>
                </Card>
            </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
