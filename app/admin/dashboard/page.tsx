"use client";
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";          import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";  import { toast } from "sonner";
import {                                                LogOut, Shield, Users, Zap, Search, Key, CreditCard, CircleDot, UserCog, Ban,                               Settings, Wallet, Megaphone, MonitorSmartphone, Hash, Snowflake, Headphones,
  Flame, Globe, Activity, ShieldCheck, Database, History, X,                                                  Cpu, HardDrive, Server, Terminal, LayoutGrid, ArrowUpRight, CheckCircle2, Send, Clock,
  CalendarClock, RefreshCw, ShoppingBag, Landmark, Percent, Gavel, SmartphoneNfc, Timer, Radio, Gift, Check, ChevronRight
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

// --- TYPES ---
type LedgerUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  avatar: string | null;
  piUserId: string | null;
  phone: string | null;
  country: string | null;
  status: 'ACTIVE' | 'BANNED' | 'PENDING' | 'FROZEN' | 'SUSPENDED';
  role: 'ADMIN' | 'USER' | 'MERCHANT' | 'AGENT';
  autoApprove: boolean;
  wallets: { balance: number; currency: string }[];
  kycStatus?: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'APPROVED';
  lastLoginIp?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
};

type Transaction = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: string;
  method: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
};

type AuditLog = {
  id: string;
  adminName: string | null;
  action: string;
  targetEmail: string | null;
  createdAt: string;
};

type ChartDataPoint = {
  day: string;
  entrant: number;
  sortant: number;
  exchange: number;
  total: number;
};

type ChartSummary = {
  totalEntrant: number;
  totalSortant: number;
  totalExchange: number;
  totalVolume: number;
  transactionCount: number;
};

type ServerStats = {
  cpu: { usage: string; usageNum: number; model: string; cores: number; arch: string };
  ram: { total: string; used: string; free: string; percent: string; percentNum: number };
  process: { heapUsed: string; heapTotal: string; rss: string; external: string };
  system: { platform: string; osType: string; osRelease: string; hostname: string; uptime: string; uptimeSeconds: number; nodeVersion: string };
  database: { totalUsers: number; activeSessions: number; totalTransactions: number; pendingTransactions: number; latency: string };
  timestamp: string;
} | null;

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

const UserRow = ({ user, isSelected, onSelect, onUpdateBalance, onResetPassword, onToggleRole, onResetPin, onFreeze, onToggleAutoApprove, onIndividualMaintenance, onViewSessions, onSupport, onBan, onAirdrop, onSendMessage }: any) => {
  const piBalance = user.wallets?.find((w: any) => w.currency.toUpperCase() === "PI")?.balance || 0;
  const isPiUser = !!user.piUserId;

  return (
    <div className={`p-5 bg-slate-900/40 border ${isSelected ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5'} rounded-[2rem] space-y-4 transition-all notranslate`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
             {isSelected ? (
               <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border bg-blue-600 border-white text-white">
                 <CheckCircle2 size={20} />
               </div>
             ) : user.avatar ? (
               <img
                 src={user.avatar}
                 alt={user.username || user.name || "Avatar"}
                 className="w-12 h-12 rounded-2xl object-cover border border-white/10"
                 crossOrigin="anonymous"
               />
             ) : (
               <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border bg-slate-800 border-white/5 text-slate-400 uppercase">
                 {user.username?.[0] || user.name?.[0] || '?'}
               </div>
             )}
             {user.status === 'ACTIVE' && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#020617]" />}
             {isPiUser && (
               <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-[#020617] flex items-center justify-center">
                 <span className="text-[8px] font-black text-white">Pi</span>
               </div>
             )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-white tracking-tight uppercase">{user.username || user.name || "Sans nom"}</p>
              <ShieldCheck size={10} className={user.kycStatus === 'APPROVED' || user.kycStatus === 'VERIFIED' ? "text-emerald-500" : "text-slate-600"} />
              {isPiUser && (
                <span className="text-[7px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 uppercase tracking-wider">Pi Network</span>
              )}
            </div>
            <p className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-widest">
                {user.role} {user.email ? `// ${user.email}` : ""} {"// \u03C0"} {piBalance.toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onBan(); }}
          className={`text-[7px] font-black px-2 py-1 rounded-full border uppercase tracking-widest transition-colors ${user.status === 'BANNED' ? 'bg-red-500 border-red-500 text-white' : 'border-white/10 text-slate-500 hover:border-red-500 hover:text-red-500'}`}
        >
            {user.status === 'BANNED' ? 'Debannir' : 'Bannir'}
        </button>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/5 gap-1 overflow-x-auto no-scrollbar">
        <button onClick={onViewSessions} title="Infos Session" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white shrink-0"><MonitorSmartphone size={14} /></button>
        <button onClick={onResetPin} title="PIN" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white shrink-0"><Hash size={14} /></button>
        <button onClick={onResetPassword} title="Password" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white shrink-0"><Key size={14} /></button>
        <button onClick={onToggleRole} title="Rôle" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white shrink-0"><UserCog size={14} /></button>
        <button onClick={onFreeze} title="Geler" className={`p-2 rounded-xl shrink-0 ${user.status === 'FROZEN' ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-500'}`}><Snowflake size={14} /></button>
        <button onClick={onSendMessage} title="Message" className="p-2 bg-blue-500/10 text-blue-500 rounded-xl shrink-0"><Send size={14} /></button>
        <button onClick={onSupport} title="Support" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white shrink-0"><Headphones size={14} /></button>
        <button onClick={onToggleAutoApprove} title="Auto" className={`p-2 rounded-xl shrink-0 ${user.autoApprove ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-700'}`}><Shield size={14} /></button>
        <button onClick={() => onIndividualMaintenance(user)} title="Maint." className="p-2 bg-orange-500/10 text-orange-500 rounded-xl shrink-0"><Clock size={14} /></button>
        <button onClick={() => {
          const amount = prompt(`Ajuster solde :`);
          if (amount) onUpdateBalance(parseFloat(amount));
        }} title="Balance" className="p-2 bg-green-500/10 text-green-500 rounded-xl shrink-0"><CreditCard size={14} /></button>
        <button onClick={onAirdrop} title="Airdrop" className="p-2 bg-amber-500/10 text-amber-500 rounded-xl shrink-0"><Gift size={14} /></button>
      </div>
    </div>
  );
};

// --- DASHBOARD CONTENT ---

function DashboardContent() {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  // States
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceEnd, setMaintenanceEnd] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [globalAnnouncement, setGlobalAnnouncement] = useState<string>("");
  const [users, setUsers] = useState<LedgerUser[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartSummary, setChartSummary] = useState<ChartSummary>({ totalEntrant: 0, totalSortant: 0, totalExchange: 0, totalVolume: 0, transactionCount: 0 });
  const [serverStats, setServerStats] = useState<ServerStats>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  useEffect(() => {
    if (!maintenanceEnd || !isMaintenanceMode) return;
    const timer = setInterval(() => {
      const distance = new Date(maintenanceEnd).getTime() - new Date().getTime();
      if (distance < 0) { setTimeLeft("EXPIRED"); clearInterval(timer); }
      else {
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
      const [u, c, l, t, ch, sv] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/config"),
        fetch("/api/admin/logs"),
        fetch("/api/admin/transactions?status=PENDING"),
        fetch("/api/admin/chart-data"),
        fetch("/api/admin/server-stats"),
      ]);
      if (u.ok) setUsers(await u.json());
      if (l.ok) setLogs(await l.json());
      if (t.ok) setPendingTransactions(await t.json());
      if (c.ok) {
        const config = await c.json();
        setIsMaintenanceMode(config.maintenanceMode);
        setMaintenanceEnd(config.maintenanceUntil || null);
        setGlobalAnnouncement(config.globalAnnouncement || "");
      }
      if (ch.ok) {
        const chartRes = await ch.json();
        setChartData(chartRes.chartData || []);
        setChartSummary(chartRes.summary || { totalEntrant: 0, totalSortant: 0, totalExchange: 0, totalVolume: 0, transactionCount: 0 });
      }
      if (sv.ok) {
        const stats = await sv.json();
        setServerStats(stats);
      }
    } catch (err) { toast.error("Erreur Sync"); }
    finally { setLoading(false); }
  };

  // Real-time server stats polling (every 10 seconds)
  useEffect(() => {
    if (!isMounted) return;
    const statsInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/server-stats");
        if (res.ok) setServerStats(await res.json());
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(statsInterval);
  }, [isMounted]);

  const handleAction = async (userId: string | null, action: string, amount?: number, extraData?: string, userIds?: string[], transactionId?: string, newSecret?: string) => {
    try {
      const res = await fetch(`/api/admin`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, amount, extraData, userIds, transactionId, newSecret })
      });
      if (res.ok) {
        toast.success("Action effectuée");
        if(action === "TOGGLE_MAINTENANCE") setIsMaintenanceMode(!isMaintenanceMode);
        setSelectedUserIds([]);
        fetchData();
      }
      else { toast.error("L'action a échoué"); }
    } catch (e) { toast.error("Erreur de connexion serveur"); }
  };

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      (u.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.username?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    ), [searchQuery, users]);

  if (!isMounted) return null;

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-6" />
      <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[5px]">Initialisation Sécurisée...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 notranslate" translate="no">

      {/* SIDEMENU OVERLAY */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute right-0 top-0 h-full w-4/5 max-w-xs bg-slate-900 border-l border-white/10 p-8 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl font-black text-white">ADMIN<span className="text-blue-500">MENU</span></h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white/5 rounded-full text-white"><X size={20}/></button>
            </div>
            <div className="space-y-4">
               <Button onClick={() => { setIsMenuOpen(false); fetchData(); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><RefreshCw size={18}/> Actualiser Ledger</Button>
               <Button onClick={() => { setIsMenuOpen(false); router.push('/admin/settings'); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><Settings size={18}/> Paramètres Système</Button>
               <Button onClick={() => { setIsMenuOpen(false); handleAction(null, "TOGGLE_MAINTENANCE"); }} className={`w-full justify-start gap-4 h-14 rounded-2xl text-[10px] font-black uppercase ${isMaintenanceMode ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-400'}`}><Shield size={18}/> {isMaintenanceMode ? 'Arrêter Maintenance' : 'Activer Maintenance'}</Button>
               <Button onClick={() => window.location.href = '/'} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase text-red-400"><LogOut size={18}/> Quitter Admin</Button>
            </div>
          </div>
        </div>
      )}

      {selectedUserIds.length > 0 && (
        <div className="fixed bottom-24 left-6 right-6 z-[100] animate-in slide-in-from-bottom-10">
          <div className="bg-blue-600 rounded-[2.5rem] p-4 flex items-center justify-between shadow-2xl border border-white/20">
            <span className="text-xs font-black uppercase text-white ml-4">{selectedUserIds.length} Sél.</span>
            <div className="flex gap-2">
              <Button onClick={() => {
                const a = prompt("Airdrop Groupé (π):");
                if(a) handleAction(null, "BATCH_AIRDROP", parseFloat(a), "", selectedUserIds);
              }} className="h-10 bg-white/10 rounded-xl px-4 text-[10px] font-black uppercase">Airdrop</Button>
              <Button onClick={() => handleAction(null, "BATCH_BAN", 0, "", selectedUserIds)} className="h-10 bg-red-500 rounded-xl px-4 text-[10px] font-black uppercase">Bannir</Button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CircleDot size={12} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[3px]">PIMPAY ADMIN v4.0</span>
            </div>
            <h1 className="text-xl font-black text-white italic uppercase tracking-tighter">PIMPAY<span className="text-blue-500">CORE</span></h1>
          </div>
          <button onClick={fetchData} className="p-3 bg-white/5 border border-white/10 rounded-2xl"><RefreshCw size={20}/></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Volume Ledger" value={`π ${users.reduce((acc, u) => acc + (u.wallets?.find(w => w.currency === "PI")?.balance || 0), 0).toLocaleString()}`} subText="En circulation" icon={<Zap size={16} />} trend="+4.1%" />
          <StatCard label="Live Users" value={users.filter(u => u.status === 'ACTIVE').length.toString()} subText="Actifs" icon={<Users size={16} />} />
        </div>
      </div>

      <div className="px-6 space-y-8">
        <div className="flex gap-1 p-1 bg-slate-900/80 border border-white/5 rounded-3xl sticky top-4 z-50 backdrop-blur-xl">
          {[
            { id: "overview", icon: <LayoutGrid size={18}/>, label: "Vue" },
            { id: "users", icon: <Users size={18}/>, label: "Users" },
            { id: "finance", icon: <Landmark size={18}/>, label: "Fin" },
            { id: "system", icon: <Server size={18}/>, label: "Srv" },
            { id: "settings", icon: <Settings size={18}/>, label: "Conf" }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 rounded-2xl flex flex-col items-center transition-all ${activeTab === tab.id ? "bg-blue-600 text-white" : "text-slate-500"}`}>
               {tab.icon} <span className="text-[7px] font-black uppercase mt-1 tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="animate-in fade-in duration-500">
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {isMaintenanceMode && (
                        <Card className="bg-orange-500/10 border border-orange-500/20 rounded-[2rem] p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-500 rounded-2xl text-white animate-pulse"><Timer size={20} /></div>
                                <div><p className="text-[10px] font-black text-orange-500 uppercase">Maintenance Globale</p><p className="text-xl font-black text-white font-mono">{timeLeft}</p></div>
                            </div>
                            <Button onClick={() => handleAction(null, "TOGGLE_MAINTENANCE")} variant="ghost" className="text-orange-500 text-[10px] font-black uppercase">Arrêter</Button>
                        </Card>
                    )}
                    {/* Dynamic Chart - Entrants / Sortants / Exchange */}
                    <Card className="bg-slate-900/60 border-white/5 rounded-[2.5rem] p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Volume 7 Jours</p>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[8px] font-black text-slate-400 uppercase">Entrant</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[8px] font-black text-slate-400 uppercase">Sortant</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[8px] font-black text-slate-400 uppercase">Exchange</span></div>
                          </div>
                        </div>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="gradEntrant" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="gradSortant" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="gradExchange" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 8, fill: '#475569' }} axisLine={false} tickLine={false} />
                              <Tooltip
                                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', fontSize: '10px', fontWeight: 800 }}
                                labelStyle={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '2px', marginBottom: '4px' }}
                                itemStyle={{ fontWeight: 800 }}
                              />
                              <Area type="monotone" dataKey="entrant" stroke="#10b981" fill="url(#gradEntrant)" strokeWidth={2.5} name="Entrant" dot={false} />
                              <Area type="monotone" dataKey="sortant" stroke="#f87171" fill="url(#gradSortant)" strokeWidth={2.5} name="Sortant" dot={false} />
                              <Area type="monotone" dataKey="exchange" stroke="#3b82f6" fill="url(#gradExchange)" strokeWidth={2.5} name="Exchange" dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Summary cards */}
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                          <div className="text-center">
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-wider">Entrant</p>
                            <p className="text-sm font-black text-emerald-400">{chartSummary.totalEntrant.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-wider">Sortant</p>
                            <p className="text-sm font-black text-red-400">{chartSummary.totalSortant.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-wider">Exchange</p>
                            <p className="text-sm font-black text-blue-400">{chartSummary.totalExchange.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-wider">TX Total</p>
                            <p className="text-sm font-black text-white">{chartSummary.transactionCount}</p>
                          </div>
                        </div>
                    </Card>
                    <Card className="bg-slate-900/40 border-white/5 rounded-[2.5rem] p-6">
                        <p className="text-[10px] font-black uppercase text-blue-500 mb-4 tracking-widest">Logs Audit (Dernières Actions)</p>
                        <div className="space-y-3">
                            {logs.slice(0, 5).map(log => (
                                <div key={log.id} className="flex justify-between items-center text-[9px] border-b border-white/5 pb-2">
                                    <span className="font-black text-white uppercase">{log.action}</span>
                                    <span className="text-slate-500 font-mono italic">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

           {activeTab === "users" && (
                <div className="space-y-4">
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-16 bg-slate-900/50 border border-white/5 rounded-2xl px-6 text-xs font-bold text-white outline-none focus:border-blue-500/50" placeholder="RECHERCHER UN UTILISATEUR..." />
                    {filteredUsers.map(user => (
                        <UserRow key={`user-${user.id}`} user={user}
                            isSelected={selectedUserIds.includes(user.id)}
                            onSelect={() => setSelectedUserIds(prev => prev.includes(user.id) ? prev.filter(i => i !== user.id) : [...prev, user.id])}
                            onUpdateBalance={(a:number) => handleAction(user.id, 'UPDATE_BALANCE', a)}
                            onAirdrop={() => { const a = prompt("Airdrop (π):"); if(a) handleAction(user.id, 'AIRDROP', parseFloat(a)); }}
                            onBan={() => handleAction(user.id, user.status === 'BANNED' ? 'UNBAN' : 'BAN')}
                            onResetPin={() => { const p = prompt("Nouveau PIN :"); if(p) handleAction(user.id, 'RESET_PIN', 0, "", [], "", p); }}
                            onResetPassword={() => { const p = prompt("Nouveau Password :"); if(p) handleAction(user.id, 'RESET_PASSWORD', 0, "", [], "", p); }}
                            onIndividualMaintenance={() => { const d = prompt("Date fin (YYYY-MM-DD):"); const t = prompt("Heure (HH:MM):"); if(d && t) handleAction(user.id, "USER_SPECIFIC_MAINTENANCE", 0, `${d}T${t}:00.000Z`); }}
                            onSendMessage={() => { const msg = prompt("Message privé pour l'utilisateur :"); if(msg) handleAction(user.id, "SEND_NETWORK_ANNOUNCEMENT", 0, msg); }}
                            onViewSessions={() => {
                                alert(`DÉTAILS SESSION :\n\n👤 Utilisateur: ${user.username || user.name}\n📧 Email: ${user.email}\n🌐 IP: ${user.lastLoginIp || "Aucune IP enregistrée"}\n🛡️ Rôle: ${user.role}\n⚡ Statut: ${user.status}`);
                            }}
                            onToggleRole={() => handleAction(user.id, 'TOGGLE_ROLE')}
                            onFreeze={() => handleAction(user.id, user.status === 'FROZEN' ? 'UNFREEZE' : 'FREEZE')}
                            onToggleAutoApprove={() => handleAction(user.id, 'TOGGLE_AUTO_APPROVE')}
                            onSupport={() => toast.success(`Support ouvert pour ${user.username || user.name}`)}
                        />
                    ))}
                </div>
            )}

            {activeTab === "finance" && (
                <div className="space-y-6">
                    <Button onClick={() => { const a = prompt("Airdrop GLOBAL (π):"); if(a) handleAction(null, "AIRDROP_ALL", parseFloat(a)); }} className="w-full h-16 bg-emerald-500 rounded-2xl font-black text-[10px] uppercase flex items-center justify-between px-6">
                        <div className="flex items-center gap-4"><Flame size={20} /> Exécuter Airdrop Global</div>
                        <ArrowUpRight size={18} />
                    </Button>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Transactions en attente</p>
                      {pendingTransactions.length === 0 ? (
                        <div className="p-10 border border-white/5 rounded-[2rem] text-center text-[10px] text-slate-500 font-bold uppercase">Aucune transaction en attente</div>
                      ) : (
                        pendingTransactions.map(tx => (
                          <Card key={`tx-${tx.id}`} className="bg-slate-900/40 border-white/5 rounded-[2rem] p-5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black text-white uppercase">{tx.userName || 'Utilisateur Inconnu'}</p>
                              <p className="text-[10px] text-emerald-500 font-bold">π {tx.amount.toLocaleString()}</p>
                              <p className="text-[9px] text-slate-500 font-bold">{tx.method} {tx.phoneNumber !== 'Non spécifié' ? `- ${tx.phoneNumber}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleAction(tx.userId, "VALIDATE_DEPOSIT", tx.amount, tx.currency, [], tx.id)}
                                className="h-10 bg-emerald-500/20 text-emerald-500 rounded-xl px-4 text-[10px] font-black uppercase flex items-center gap-2"
                              >
                                <Check size={14} /> Confirmer
                              </Button>
                              <Button
                                onClick={() => handleAction(tx.userId, "REJECT_DEPOSIT", tx.amount, "", [], tx.id)}
                                className="h-10 bg-red-500/20 text-red-500 rounded-xl px-4 text-[10px] font-black uppercase flex items-center gap-2"
                              >
                                <X size={14} /> Rejeter
                              </Button>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                </div>
            )}

            {activeTab === "system" && (
                <div className="space-y-6">
                    {!serverStats ? (
                      <div className="p-16 text-center">
                        <div className="w-10 h-10 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Chargement des stats serveur...</p>
                      </div>
                    ) : (
                      <>
                        {/* Live indicator */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                              <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                            </div>
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[2px]">Temps Reel</span>
                          </div>
                          <span className="text-[8px] font-mono text-slate-600">{new Date(serverStats.timestamp).toLocaleTimeString("fr-FR")}</span>
                        </div>

                        {/* CPU & RAM with progress bars */}
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-5 text-white space-y-3">
                            <div className="flex items-center gap-2">
                              <Cpu size={16} className="text-blue-500" />
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">CPU</p>
                            </div>
                            <p className="text-2xl font-black text-white">{serverStats.cpu.usage}</p>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${serverStats.cpu.usageNum}%`, background: serverStats.cpu.usageNum > 80 ? '#ef4444' : serverStats.cpu.usageNum > 50 ? '#f59e0b' : '#3b82f6' }} />
                            </div>
                            <p className="text-[7px] text-slate-600 font-mono">{serverStats.cpu.cores} Cores // {serverStats.cpu.arch}</p>
                          </Card>
                          <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-5 text-white space-y-3">
                            <div className="flex items-center gap-2">
                              <Activity size={16} className="text-emerald-500" />
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">RAM</p>
                            </div>
                            <p className="text-2xl font-black text-white">{serverStats.ram.percent}</p>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${serverStats.ram.percentNum}%`, background: serverStats.ram.percentNum > 80 ? '#ef4444' : serverStats.ram.percentNum > 60 ? '#f59e0b' : '#10b981' }} />
                            </div>
                            <p className="text-[7px] text-slate-600 font-mono">{serverStats.ram.used} / {serverStats.ram.total}</p>
                          </Card>
                        </div>

                        {/* DB Latency & Uptime */}
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-5 text-white space-y-2">
                            <div className="flex items-center gap-2">
                              <Database size={14} className="text-amber-500" />
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">DB Latence</p>
                            </div>
                            <p className="text-xl font-black text-amber-400">{serverStats.database.latency}</p>
                            <p className="text-[7px] text-slate-600 font-mono">{serverStats.database.totalTransactions} TX total</p>
                          </Card>
                          <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-5 text-white space-y-2">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-cyan-500" />
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Uptime</p>
                            </div>
                            <p className="text-xl font-black text-cyan-400">{serverStats.system.uptime}</p>
                            <p className="text-[7px] text-slate-600 font-mono">{serverStats.system.hostname}</p>
                          </Card>
                        </div>

                        {/* System Info Card */}
                        <Card className="bg-slate-900/60 border-white/5 rounded-[2.5rem] p-6 text-white space-y-4">
                          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                            <Server size={18} className="text-blue-400" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Infos Systeme PimPay</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            {[
                              { label: "OS / Type", value: `${serverStats.system.osType} ${serverStats.system.osRelease}`, color: "text-white" },
                              { label: "Plateforme", value: `${serverStats.system.platform} (${serverStats.cpu.arch})`, color: "text-white" },
                              { label: "CPU Model", value: serverStats.cpu.model, color: "text-blue-400" },
                              { label: "Node.js Version", value: serverStats.system.nodeVersion, color: "text-emerald-400" },
                              { label: "Process RSS", value: serverStats.process.rss, color: "text-amber-400" },
                              { label: "Heap Used / Total", value: `${serverStats.process.heapUsed} / ${serverStats.process.heapTotal}`, color: "text-cyan-400" },
                            ].map((item, i) => (
                              <div key={i} className="flex justify-between items-center bg-white/[0.03] p-4 rounded-2xl border border-white/[0.03]">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{item.label}</span>
                                <span className={`text-[10px] font-bold ${item.color} font-mono max-w-[55%] text-right truncate`}>{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </Card>

                        {/* Database Stats Card */}
                        <Card className="bg-slate-900/60 border-white/5 rounded-[2.5rem] p-6 text-white space-y-4">
                          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                            <Database size={18} className="text-emerald-400" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Base de Donnees</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.03] text-center">
                              <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Utilisateurs</p>
                              <p className="text-lg font-black text-white">{serverStats.database.totalUsers}</p>
                            </div>
                            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.03] text-center">
                              <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Sessions Actives</p>
                              <p className="text-lg font-black text-emerald-400">{serverStats.database.activeSessions}</p>
                            </div>
                            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.03] text-center">
                              <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">TX Total</p>
                              <p className="text-lg font-black text-blue-400">{serverStats.database.totalTransactions}</p>
                            </div>
                            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.03] text-center">
                              <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">TX En Attente</p>
                              <p className="text-lg font-black text-amber-400">{serverStats.database.pendingTransactions}</p>
                            </div>
                          </div>
                        </Card>
                      </>
                    )}

                    {/* Global Announcement Control */}
                    <Card className={`border rounded-[2.5rem] p-6 space-y-4 ${globalAnnouncement ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-slate-900/60 border-white/5'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl ${globalAnnouncement ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                            <Megaphone size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">Annonce Globale</p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                              {globalAnnouncement ? "EN COURS DE DIFFUSION" : "AUCUNE ANNONCE ACTIVE"}
                            </p>
                          </div>
                        </div>
                        {globalAnnouncement && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/admin/config", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ globalAnnouncement: "" }),
                                });
                                if (res.ok) {
                                  setGlobalAnnouncement("");
                                  toast.success("Annonce globale desactivee");
                                } else { toast.error("Echec de la desactivation"); }
                              } catch { toast.error("Erreur reseau"); }
                            }}
                            className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                          >
                            <X size={14} /> Stopper
                          </button>
                        )}
                      </div>
                      {globalAnnouncement && (
                        <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
                          <p className="text-[10px] text-slate-300 font-mono leading-relaxed break-words">{globalAnnouncement}</p>
                        </div>
                      )}
                    </Card>

                    <Button onClick={() => { const msg = prompt("Message annonce reseau :"); if(msg) handleAction(null, "SEND_NETWORK_ANNOUNCEMENT", 0, msg); }} className="w-full h-14 bg-blue-600 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2">
                        <Radio size={16} className="animate-pulse" /> Envoyer Annonce Network
                    </Button>
                </div>
            )}

            {activeTab === "settings" && (
                <div className="space-y-4">
                    <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3"><Settings size={18} className="text-blue-500" /><p className="text-[10px] font-black text-white uppercase">Maintenance Système</p></div>
                            <button onClick={() => handleAction(null, "TOGGLE_MAINTENANCE")} className={`w-12 h-6 rounded-full relative transition-colors ${isMaintenanceMode ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-slate-700'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isMaintenanceMode ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        <Button onClick={() => { const d = prompt("Date (YYYY-MM-DD):"); const t = prompt("Heure (HH:MM):"); if(d && t) handleAction(null, "PLAN_MAINTENANCE", 0, `${d}T${t}:00.000Z`); }} variant="outline" className="w-full h-12 border-white/10 bg-white/5 rounded-xl font-black text-[10px] uppercase gap-2"><CalendarClock size={14} /> Planifier Maintenance Globale</Button>
                    </Card>

                    <Card onClick={() => router.push('/admin/settings')} className="bg-blue-600/10 border border-blue-500/20 rounded-[2rem] p-6 cursor-pointer hover:bg-blue-600/20 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-blue-600 rounded-2xl text-white"><Settings size={20} /></div>
                           <div>
                              <p className="text-[10px] font-black text-white uppercase">Paramètres Avancés</p>
                              <p className="text-[8px] font-bold text-blue-400 uppercase">Consensus, Fees & Kernels</p>
                           </div>
                        </div>
                        <ChevronRight size={20} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                    </Card>
                </div>
            )}
        </div>
      </div>

      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
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
