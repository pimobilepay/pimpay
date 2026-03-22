"use client";
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";          import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";  import { toast } from "sonner";
import {                                                LogOut, Shield, Users, Zap, Search, Key, CreditCard, CircleDot, UserCog, Ban,                               Settings, Wallet, Megaphone, MonitorSmartphone, Hash, Snowflake, Headphones,
  Flame, Globe, Activity, ShieldCheck, Database, History, X,                                                  Cpu, HardDrive, Server, Terminal, LayoutGrid, ArrowUpRight, CheckCircle2, Send, Clock,
  CalendarClock, RefreshCw, ShoppingBag, Landmark, Percent, Gavel, SmartphoneNfc, Timer, Radio, Gift, Check, ChevronRight,
  Loader2, Wifi, WifiOff, MapPin, Eye, Smartphone, Monitor
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
  status: 'ACTIVE' | 'BANNED' | 'PENDING' | 'FROZEN' | 'SUSPENDED' | string;
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
  fromUser?: { firstName: string | null; lastName: string | null };
  toUser?: { firstName: string | null; lastName: string | null };
  amount: number;
  currency: string;
  type: string;
  method: string;
  accountNumber: string;
  isBlockchainWithdraw?: boolean;
  isMobileWithdraw?: boolean;
  isBankWithdraw?: boolean;
  status: string;
  createdAt: string;
  description?: string | null;
  blockchainTx?: string | null;
  fee?: number;
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
  mpay: number;
  total: number;
};

type ChartSummary = {
  totalEntrant: number;
  totalSortant: number;
  totalExchange: number;
  totalMpay: number;
  totalVolume: number;
  transactionCount: number;
  mpayCount: number;
};

type ServerStats = {
  cpu: { usage: string; usageNum: number; model: string; cores: number; arch: string };
  ram: { total: string; used: string; free: string; percent: string; percentNum: number };
  process: { heapUsed: string; heapTotal: string; rss: string; external: string };
  system: { platform: string; osType: string; osRelease: string; hostname: string; uptime: string; uptimeSeconds: number; nodeVersion: string };
  database: { totalUsers: number; activeSessions: number; totalTransactions: number; pendingTransactions: number; latency: string };
  timestamp: string;
} | null;

type SessionDetail = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  deviceName: string | null;
  os: string | null;
  browser: string | null;
  city: string | null;
  country: string | null;
  isActive: boolean;
  lastActiveAt: string;
  createdAt: string;
};

type ActivityDetail = {
  id: string;
  page: string;
  action: string;
  ip: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  createdAt: string;
};

type SecurityLogDetail = {
  id: string;
  action: string;
  ip: string | null;
  device: string | null;
  createdAt: string;
};

type UserSessionInfo = {
  user: LedgerUser;
  sessions: SessionDetail[];
  recentActivity: ActivityDetail[];
  securityLogs: SecurityLogDetail[];
  loading: boolean;
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

const UserRow = ({ user, isSelected, onSelect, onUpdateBalance, onResetPassword, onToggleRole, onResetPin, onFreeze, onToggleAutoApprove, onIndividualMaintenance, onViewSessions, onSupport, onBan, onAirdrop, onSendMessage, onViewBalance }: any) => {
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
        <button onClick={onViewBalance} title="Voir Soldes" className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0 hover:bg-emerald-500/20 transition-colors"><Wallet size={14} /></button>
        <button onClick={onViewSessions} title="Infos Session" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white shrink-0"><MonitorSmartphone size={14} /></button>
        <button onClick={onResetPin} title="PIN" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white shrink-0"><Hash size={14} /></button>
        <button onClick={onResetPassword} title="Password" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white shrink-0"><Key size={14} /></button>
        <button onClick={onToggleRole} title="Rôle" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white shrink-0"><UserCog size={14} /></button>
        <button onClick={onFreeze} title={user.status === 'FROZEN' ? 'Degeler' : 'Geler'} className={`p-2 rounded-xl shrink-0 transition-colors ${user.status === 'FROZEN' ? 'bg-cyan-500 text-white animate-pulse' : 'bg-white/5 text-slate-500 hover:text-cyan-400'}`}><Snowflake size={14} /></button>
        <button onClick={onSendMessage} title="Message" className="p-2 bg-blue-500/10 text-blue-500 rounded-xl shrink-0"><Send size={14} /></button>
        <button onClick={onSupport} title="Envoyer notification support" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-amber-400 transition-colors shrink-0"><Headphones size={14} /></button>
        <button onClick={onToggleAutoApprove} title="Auto" className={`p-2 rounded-xl shrink-0 ${user.autoApprove ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-700'}`}><Shield size={14} /></button>
        <button onClick={() => onIndividualMaintenance(user)} title={user.status === 'SUSPENDED' ? 'Retirer Maintenance' : 'Maintenance'} className={`p-2 rounded-xl shrink-0 transition-colors ${user.status === 'SUSPENDED' ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-500/10 text-orange-500'}`}><Clock size={14} /></button>
        <button onClick={() => {
          const amount = prompt(`Ajuster solde :`);
          if (amount) onUpdateBalance(parseFloat(amount));
        }} title="Ajuster Balance" className="p-2 bg-green-500/10 text-green-500 rounded-xl shrink-0"><CreditCard size={14} /></button>
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
  const [chartSummary, setChartSummary] = useState<ChartSummary>({ totalEntrant: 0, totalSortant: 0, totalExchange: 0, totalMpay: 0, totalVolume: 0, transactionCount: 0, mpayCount: 0 });
  const [serverStats, setServerStats] = useState<ServerStats>(null);
  const [roleModalUser, setRoleModalUser] = useState<LedgerUser | null>(null);
  const [maintModalUser, setMaintModalUser] = useState<LedgerUser | null>(null);
  const [maintDate, setMaintDate] = useState("");
  const [maintTime, setMaintTime] = useState("");
  const [sessionInfo, setSessionInfo] = useState<UserSessionInfo>(null);
  const [sessionInfoTab, setSessionInfoTab] = useState<"sessions" | "activity" | "security">("sessions");
  const [balanceModalUser, setBalanceModalUser] = useState<LedgerUser | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

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

  const fetchUserSessions = async (user: LedgerUser) => {
    setSessionInfo({ user, sessions: [], recentActivity: [], securityLogs: [], loading: true });
    setSessionInfoTab("sessions");
    try {
      const res = await fetch(`/api/admin/users/${user.id}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessionInfo({
          user,
          sessions: data.sessions || [],
          recentActivity: data.recentActivity || [],
          securityLogs: data.securityLogs || [],
          loading: false,
        });
      } else {
        toast.error("Impossible de charger les sessions");
        setSessionInfo(null);
      }
    } catch {
      toast.error("Erreur de connexion");
      setSessionInfo(null);
    }
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
            <div className="space-y-3">
               <Button onClick={() => { setIsMenuOpen(false); router.push('/admin'); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><LayoutGrid size={18}/> Accueil Admin</Button>
               <Button onClick={() => { setIsMenuOpen(false); router.push('/admin/users'); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><Users size={18}/> Utilisateurs</Button>
               <Button onClick={() => { setIsMenuOpen(false); router.push('/admin/transactions'); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><Wallet size={18}/> Transactions</Button>
               <Button onClick={() => { setIsMenuOpen(false); router.push('/admin/kyc'); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><ShieldCheck size={18}/> KYC</Button>
               <Button onClick={() => { setIsMenuOpen(false); router.push('/admin/support'); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><Headphones size={18}/> Support</Button>
               <Button onClick={() => { setIsMenuOpen(false); fetchData(); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><RefreshCw size={18}/> Actualiser Ledger</Button>
               <Button onClick={() => { setIsMenuOpen(false); router.push('/admin/settings'); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><Settings size={18}/> Parametres</Button>
               <Button onClick={() => { setIsMenuOpen(false); handleAction(null, "TOGGLE_MAINTENANCE"); }} className={`w-full justify-start gap-4 h-14 rounded-2xl text-[10px] font-black uppercase ${isMaintenanceMode ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-400'}`}><Shield size={18}/> {isMaintenanceMode ? 'Arreter Maintenance' : 'Activer Maintenance'}</Button>
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
  <linearGradient id="gradMpay" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
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
  <Area type="monotone" dataKey="mpay" stroke="#f59e0b" fill="url(#gradMpay)" strokeWidth={2.5} name="MPAY" dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
{/* Summary cards */}
  <div className="grid grid-cols-5 gap-2 pt-2 border-t border-white/5">
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
  <p className="text-[7px] font-black text-slate-500 uppercase tracking-wider">MPAY</p>
  <p className="text-sm font-black text-amber-400">{chartSummary.totalMpay.toLocaleString()}</p>
  <p className="text-[6px] text-amber-500/60">{chartSummary.mpayCount} tx</p>
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
                            onIndividualMaintenance={() => setMaintModalUser(user)}
                            onSendMessage={() => { const msg = prompt("Message privé pour l'utilisateur :"); if(msg) handleAction(user.id, "SEND_NETWORK_ANNOUNCEMENT", 0, msg); }}
                            onViewSessions={() => fetchUserSessions(user)}
                            onToggleRole={() => setRoleModalUser(user)}
                            onFreeze={() => handleAction(user.id, user.status === 'FROZEN' ? 'UNFREEZE' : 'FREEZE')}
                            onToggleAutoApprove={() => handleAction(user.id, 'TOGGLE_AUTO_APPROVE')}
                            onSupport={() => {
                              const msg = prompt(`Notification support pour ${user.username || user.name} :`);
                              if (msg && msg.trim()) handleAction(user.id, "SEND_SUPPORT_NOTIFICATION", 0, msg.trim());
                            }}
                            onViewBalance={() => setBalanceModalUser(user)}
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
                        pendingTransactions.map(tx => {
                          const user = tx.fromUser || tx.toUser;
                          const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur PimPay' : 'Utilisateur Inconnu';
                          return (
                            <Card 
                              key={`tx-${tx.id}`} 
                              className="bg-slate-900/40 border-white/5 rounded-[2rem] p-5 cursor-pointer hover:bg-slate-800/50 transition-colors"
                              onClick={() => setSelectedTx(tx)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-white uppercase truncate">{userName}</p>
                                  <p className="text-[10px] text-emerald-500 font-bold">{tx.currency === 'PI' ? 'π' : tx.currency} {tx.amount.toLocaleString()}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[9px] font-bold uppercase ${tx.isBlockchainWithdraw ? 'text-blue-400' : tx.isBankWithdraw ? 'text-indigo-400' : 'text-amber-400'}`}>
                                      {tx.method}
                                    </span>
                                    {tx.accountNumber && tx.accountNumber !== 'Non spécifié' && (
                                      <span className="text-[8px] text-slate-500 font-mono truncate max-w-[120px]">
                                        {tx.accountNumber.length > 16 ? `${tx.accountNumber.slice(0, 8)}...${tx.accountNumber.slice(-6)}` : tx.accountNumber}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[8px] text-slate-600 font-mono mt-1">
                                    {new Date(tx.createdAt).toLocaleString("fr-FR")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    onClick={() => handleAction(tx.userId, "VALIDATE_DEPOSIT", tx.amount, tx.currency, [], tx.id)}
                                    className="h-10 bg-emerald-500/20 text-emerald-500 rounded-xl px-4 text-[10px] font-black uppercase flex items-center gap-2"
                                  >
                                    <Check size={14} /> Ok
                                  </Button>
                                  <Button
                                    onClick={() => handleAction(tx.userId, "REJECT_DEPOSIT", tx.amount, "", [], tx.id)}
                                    className="h-10 bg-red-500/20 text-red-500 rounded-xl px-4 text-[10px] font-black uppercase flex items-center gap-2"
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })
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
                        <Button onClick={async () => { 
                          const d = prompt("Date (YYYY-MM-DD):"); 
                          const t = prompt("Heure (HH:MM):"); 
                          if(d && t) {
                            try {
                              const res = await fetch("/api/admin/config", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ maintenanceMode: true, maintenanceUntil: `${d}T${t}:00.000Z` })
                              });
                              if (res.ok) {
                                setIsMaintenanceMode(true);
                                setMaintenanceEnd(`${d}T${t}:00.000Z`);
                                toast.success(`Maintenance planifiee jusqu'au ${d} a ${t}`);
                                fetchData();
                              } else { toast.error("Echec de la planification"); }
                            } catch { toast.error("Erreur reseau"); }
                          }
                        }} variant="outline" className="w-full h-12 border-white/10 bg-white/5 rounded-xl font-black text-[10px] uppercase gap-2"><CalendarClock size={14} /> Planifier Maintenance Globale</Button>
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

      {/* USER SESSION INFO MODAL */}
      {sessionInfo && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-200" onClick={() => setSessionInfo(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {sessionInfo.user.avatar ? (
                      <img src={sessionInfo.user.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover border border-white/10" crossOrigin="anonymous" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black border bg-slate-800 border-white/5 text-slate-400 uppercase">
                        {sessionInfo.user.username?.[0] || sessionInfo.user.name?.[0] || '?'}
                      </div>
                    )}
                    {sessionInfo.user.piUserId && (
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                        <span className="text-[7px] font-black text-white">Pi</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-tight">{sessionInfo.user.username || sessionInfo.user.name || "Sans nom"}</p>
                    <p className="text-[10px] text-blue-400 font-mono font-bold">{sessionInfo.user.email}</p>
                    {sessionInfo.user.piUserId && (
                      <p className="text-[8px] text-amber-400 font-mono font-bold mt-0.5">Pi ID: {sessionInfo.user.piUserId}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setSessionInfo(null)} className="p-2 bg-white/5 rounded-full text-white hover:bg-white/10 transition-colors"><X size={16}/></button>
              </div>

              {/* Quick info row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 text-center">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Role</p>
                  <p className="text-[10px] font-black text-white uppercase">{sessionInfo.user.role}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 text-center">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Statut</p>
                  <p className={`text-[10px] font-black uppercase ${sessionInfo.user.status === 'ACTIVE' ? 'text-emerald-400' : sessionInfo.user.status === 'BANNED' ? 'text-red-400' : 'text-amber-400'}`}>{sessionInfo.user.status}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 text-center">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Derniere IP</p>
                  <p className="text-[10px] font-black text-cyan-400 font-mono">{sessionInfo.user.lastLoginIp || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 mx-4 mt-4 bg-black/40 border border-white/5 rounded-2xl">
              {([
                { id: "sessions" as const, label: "Sessions", icon: <Wifi size={12} /> },
                { id: "activity" as const, label: "Activite", icon: <Eye size={12} /> },
                { id: "security" as const, label: "Securite", icon: <Shield size={12} /> },
              ]).map((tab) => (
                <button 
                  key={tab.id} 
                  onClick={() => setSessionInfoTab(tab.id)}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all text-[8px] font-black uppercase tracking-wider ${
                    sessionInfoTab === tab.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {sessionInfo.loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 size={24} className="text-blue-500 animate-spin mb-3" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Chargement des donnees...</p>
                </div>
              ) : sessionInfoTab === "sessions" ? (
                <div className="space-y-3">
                  {sessionInfo.sessions.length === 0 ? (
                    <div className="text-center py-10">
                      <WifiOff size={24} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aucune session trouvee</p>
                    </div>
                  ) : (
                    sessionInfo.sessions.map((s) => (
                      <div key={s.id} className="bg-white/[0.03] border border-white/[0.03] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                            <span className={`text-[8px] font-black uppercase tracking-widest ${s.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {s.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <span className="text-[8px] text-slate-600 font-mono">
                            {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Globe size={10} className="text-cyan-400 shrink-0" />
                            <div>
                              <p className="text-[7px] font-black text-slate-500 uppercase">Adresse IP</p>
                              <p className="text-[10px] font-black text-cyan-400 font-mono">{s.ip || "Inconnue"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={10} className="text-amber-400 shrink-0" />
                            <div>
                              <p className="text-[7px] font-black text-slate-500 uppercase">Localisation</p>
                              <p className="text-[10px] font-black text-amber-400">{[s.city, s.country].filter(Boolean).join(", ") || "Inconnue"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.deviceName?.toLowerCase().includes("mobile") || s.os?.toLowerCase().includes("android") || s.os?.toLowerCase().includes("ios") ? (
                              <Smartphone size={10} className="text-blue-400 shrink-0" />
                            ) : (
                              <Monitor size={10} className="text-blue-400 shrink-0" />
                            )}
                            <div>
                              <p className="text-[7px] font-black text-slate-500 uppercase">Appareil</p>
                              <p className="text-[10px] font-black text-white">{s.deviceName || s.os || "Inconnu"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity size={10} className="text-emerald-400 shrink-0" />
                            <div>
                              <p className="text-[7px] font-black text-slate-500 uppercase">Navigateur</p>
                              <p className="text-[10px] font-black text-white">{s.browser || "Inconnu"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-white/5 flex justify-between text-[7px] text-slate-600 font-mono">
                          <span>Derniere activite: {new Date(s.lastActiveAt).toLocaleString("fr-FR")}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : sessionInfoTab === "activity" ? (
                <div className="space-y-2">
                  {sessionInfo.recentActivity.length === 0 ? (
                    <div className="text-center py-10">
                      <Eye size={24} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aucune activite enregistree</p>
                    </div>
                  ) : (
                    sessionInfo.recentActivity.map((a) => (
                      <div key={a.id} className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Eye size={12} className="text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-black text-white truncate">{a.page}</p>
                            {a.ip && <span className="text-[7px] font-mono text-cyan-400 shrink-0">{a.ip}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-[8px] text-slate-500">
                            {a.device && <span>{a.device}</span>}
                            {a.browser && <><span>{'/'}</span><span>{a.browser}</span></>}
                            {a.os && <><span>{'/'}</span><span>{a.os}</span></>}
                          </div>
                        </div>
                        <span className="text-[8px] text-slate-600 font-mono shrink-0">{new Date(a.createdAt).toLocaleTimeString("fr-FR")}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {sessionInfo.securityLogs.length === 0 ? (
                    <div className="text-center py-10">
                      <Shield size={24} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aucun log de securite</p>
                    </div>
                  ) : (
                    sessionInfo.securityLogs.map((log) => (
                      <div key={log.id} className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          log.action.includes("LOGIN") ? "bg-emerald-500/10" : log.action.includes("FAIL") ? "bg-red-500/10" : "bg-amber-500/10"
                        }`}>
                          <ShieldCheck size={12} className={
                            log.action.includes("LOGIN") ? "text-emerald-400" : log.action.includes("FAIL") ? "text-red-400" : "text-amber-400"
                          } />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-white uppercase truncate">{log.action}</p>
                          <div className="flex items-center gap-2 text-[8px] text-slate-500">
                            {log.ip && <span className="font-mono text-cyan-400">{log.ip}</span>}
                            {log.device && <span>{log.device}</span>}
                          </div>
                        </div>
                        <span className="text-[8px] text-slate-600 font-mono shrink-0">{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ROLE SELECTOR MODAL */}
      {roleModalUser && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setRoleModalUser(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 w-full max-w-sm space-y-5 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[3px]">Changer Role</p>
                <p className="text-sm font-black text-white uppercase mt-1">{roleModalUser.username || roleModalUser.name || "Utilisateur"}</p>
              </div>
              <button onClick={() => setRoleModalUser(null)} className="p-2 bg-white/5 rounded-full text-white"><X size={16}/></button>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              Role actuel : <span className="text-white">{roleModalUser.role}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["USER", "AGENT", "MERCHANT", "ADMIN"] as const).map(role => (
                <button
                  key={role}
                  onClick={async () => {
                    await handleAction(roleModalUser.id, "SET_ROLE", 0, role);
                    setRoleModalUser(null);
                  }}
                  className={`p-4 rounded-2xl border text-center transition-all active:scale-95 ${
                    roleModalUser.role === role
                      ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-blue-500/50 hover:text-white"
                  }`}
                >
                  <UserCog size={18} className={`mx-auto mb-2 ${roleModalUser.role === role ? "text-white" : "text-slate-500"}`} />
                  <p className="text-[10px] font-black uppercase tracking-wider">{role}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* USER BALANCE MODAL */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setBalanceModalUser(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 w-full max-w-md space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between sticky top-0 bg-slate-900 pb-3 border-b border-white/5">
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[3px]">Soldes Utilisateur</p>
                <p className="text-sm font-black text-white uppercase mt-1">{balanceModalUser.username || balanceModalUser.name || "Utilisateur"}</p>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">{balanceModalUser.email}</p>
              </div>
              <button onClick={() => setBalanceModalUser(null)} className="p-2 bg-white/5 rounded-full text-white hover:bg-white/10 transition-colors"><X size={16}/></button>
            </div>

            {/* Total Balance */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Valeur Totale Estimee</p>
              <p className="text-2xl font-black text-white">
                {balanceModalUser.wallets?.reduce((acc: number, w: any) => acc + (w.balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} <span className="text-sm text-slate-500">unites</span>
              </p>
            </div>

            {/* Crypto Balances */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CircleDot size={14} className="text-amber-500" />
                <p className="text-[9px] font-black text-amber-400 uppercase tracking-[2px]">Crypto Balances</p>
              </div>
              <div className="space-y-2">
                {balanceModalUser.wallets?.filter((w: any) => ["PI", "SDA", "BTC", "ETH", "USDT", "USDC"].includes(w.currency.toUpperCase())).length > 0 ? (
                  balanceModalUser.wallets?.filter((w: any) => ["PI", "SDA", "BTC", "ETH", "USDT", "USDC"].includes(w.currency.toUpperCase())).map((wallet: any) => (
                    <div key={wallet.currency} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl p-3 hover:border-amber-500/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] ${
                          wallet.currency.toUpperCase() === "PI" ? "bg-amber-500/20 text-amber-400" :
                          wallet.currency.toUpperCase() === "SDA" ? "bg-emerald-500/20 text-emerald-400" :
                          wallet.currency.toUpperCase() === "BTC" ? "bg-orange-500/20 text-orange-400" :
                          wallet.currency.toUpperCase() === "ETH" ? "bg-blue-500/20 text-blue-400" :
                          "bg-green-500/20 text-green-400"
                        }`}>
                          {wallet.currency.toUpperCase() === "PI" ? "π" : wallet.currency.substring(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase">{wallet.currency}</p>
                          <p className="text-[9px] text-slate-500 font-bold">Crypto</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">{wallet.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{wallet.currency}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 border border-white/5 rounded-xl text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Aucun solde crypto</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fiat Balances */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Landmark size={14} className="text-blue-500" />
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-[2px]">Fiat Balances</p>
              </div>
              <div className="space-y-2">
                {balanceModalUser.wallets?.filter((w: any) => ["XAF", "XOF", "EUR", "USD", "GBP", "NGN"].includes(w.currency.toUpperCase())).length > 0 ? (
                  balanceModalUser.wallets?.filter((w: any) => ["XAF", "XOF", "EUR", "USD", "GBP", "NGN"].includes(w.currency.toUpperCase())).map((wallet: any) => (
                    <div key={wallet.currency} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl p-3 hover:border-blue-500/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] ${
                          wallet.currency.toUpperCase() === "XAF" || wallet.currency.toUpperCase() === "XOF" ? "bg-green-500/20 text-green-400" :
                          wallet.currency.toUpperCase() === "EUR" ? "bg-blue-500/20 text-blue-400" :
                          wallet.currency.toUpperCase() === "USD" ? "bg-emerald-500/20 text-emerald-400" :
                          "bg-purple-500/20 text-purple-400"
                        }`}>
                          {wallet.currency.toUpperCase() === "XAF" || wallet.currency.toUpperCase() === "XOF" ? "F" :
                           wallet.currency.toUpperCase() === "EUR" ? "€" :
                           wallet.currency.toUpperCase() === "USD" ? "$" :
                           wallet.currency.toUpperCase() === "GBP" ? "£" : wallet.currency.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase">{wallet.currency}</p>
                          <p className="text-[9px] text-slate-500 font-bold">Fiat</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">{wallet.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{wallet.currency}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 border border-white/5 rounded-xl text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Aucun solde fiat</p>
                  </div>
                )}
              </div>
            </div>

            {/* Other Balances */}
            {balanceModalUser.wallets?.filter((w: any) => 
              !["PI", "SDA", "BTC", "ETH", "USDT", "USDC", "XAF", "XOF", "EUR", "USD", "GBP", "NGN"].includes(w.currency.toUpperCase())
            ).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet size={14} className="text-purple-500" />
                  <p className="text-[9px] font-black text-purple-400 uppercase tracking-[2px]">Autres Devises</p>
                </div>
                <div className="space-y-2">
                  {balanceModalUser.wallets?.filter((w: any) => 
                    !["PI", "SDA", "BTC", "ETH", "USDT", "USDC", "XAF", "XOF", "EUR", "USD", "GBP", "NGN"].includes(w.currency.toUpperCase())
                  ).map((wallet: any) => (
                    <div key={wallet.currency} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-700/50 flex items-center justify-center font-black text-[10px] text-slate-400">
                          {wallet.currency.substring(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase">{wallet.currency}</p>
                          <p className="text-[9px] text-slate-500 font-bold">Autre</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">{wallet.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{wallet.currency}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 pt-3 border-t border-white/5">
              <button
                onClick={() => {
                  const amount = prompt(`Ajuster solde pour ${balanceModalUser.username || balanceModalUser.name}:`);
                  if (amount) {
                    handleAction(balanceModalUser.id, 'UPDATE_BALANCE', parseFloat(amount));
                    setBalanceModalUser(null);
                  }
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CreditCard size={14} /> Ajuster
              </button>
              <button
                onClick={() => {
                  const amount = prompt(`Airdrop pour ${balanceModalUser.username || balanceModalUser.name} (π):`);
                  if (amount) {
                    handleAction(balanceModalUser.id, 'AIRDROP', parseFloat(amount));
                    setBalanceModalUser(null);
                  }
                }}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Gift size={14} /> Airdrop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION DETAIL MODAL */}
      {selectedTx && (() => {
        const user = selectedTx.fromUser || selectedTx.toUser;
        const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur PimPay' : 'Utilisateur Inconnu';
        const isSuccess = selectedTx.status === "SUCCESS";
        const isPending = selectedTx.status === "PENDING";
        const PI_GCV_PRICE = 314159;
        const isPi = selectedTx.currency === "PI" || !selectedTx.currency;
        const amountPI = isPi ? selectedTx.amount : selectedTx.amount / PI_GCV_PRICE;
        const amountUSD = isPi ? (amountPI * PI_GCV_PRICE) : selectedTx.amount;
        const feeAmount = selectedTx.fee || 0;

        return (
          <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200" onClick={() => setSelectedTx(null)}>
            <div className="w-full max-w-lg bg-[#020617] rounded-t-[2rem] sm:rounded-[2rem] max-h-[90vh] overflow-y-auto border border-white/10 animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${selectedTx.isBlockchainWithdraw ? 'bg-blue-500/10' : selectedTx.isBankWithdraw ? 'bg-indigo-500/10' : 'bg-amber-500/10'}`}>
                    {selectedTx.isBlockchainWithdraw ? <Globe size={18} className="text-blue-400" /> : selectedTx.isBankWithdraw ? <Landmark size={18} className="text-indigo-400" /> : <Wallet size={18} className="text-amber-400" />}
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-tight text-white">{selectedTx.type}</h2>
                    <p className="text-[9px] text-slate-500 font-bold mt-0.5">REF-{selectedTx.id.slice(0, 10).toUpperCase()}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTx(null)} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all active:scale-90">
                  <X size={18} />
                </button>
              </div>

              {/* Status Bar */}
              <div className={`py-3 px-6 flex items-center justify-between ${isSuccess ? 'bg-emerald-500/10' : isPending ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isPending ? "animate-pulse" : ""} ${isSuccess ? "bg-emerald-400" : isPending ? "bg-amber-400" : "bg-red-400"}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isSuccess ? "text-emerald-400" : isPending ? "text-amber-400" : "text-red-400"}`}>
                    {selectedTx.status}
                  </span>
                </div>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                  {new Date(selectedTx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div className="p-6 space-y-6">
                {/* Amount */}
                <div className="flex flex-col items-center text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Montant</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">
                      {selectedTx.amount < 0.01 && selectedTx.amount > 0 ? selectedTx.amount.toFixed(8) : selectedTx.amount.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}
                    </span>
                    <span className="text-lg font-bold text-blue-500">{selectedTx.currency || "PI"}</span>
                  </div>
                  {isPi && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                      <Activity size={12} className="text-blue-400" />
                      <span className="text-[10px] font-bold text-blue-400">{"\u2248"} ${amountUSD.toLocaleString()} USD (GCV)</span>
                    </div>
                  )}
                </div>

                {/* Details Grid */}
                <div className="space-y-4 border-t border-white/5 pt-6">
                  <div className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/5 rounded-xl text-blue-500"><Hash size={16} /></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Transaction</span>
                    </div>
                    <span className="text-[11px] font-bold text-white">{selectedTx.id.length > 18 ? selectedTx.id.slice(0, 18) + "..." : selectedTx.id}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/5 rounded-xl text-blue-500"><CalendarClock size={16} /></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</span>
                    </div>
                    <span className="text-[11px] font-bold text-white">{new Date(selectedTx.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/5 rounded-xl text-blue-500"><Zap size={16} /></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Methode</span>
                    </div>
                    <span className="text-[11px] font-bold text-white">{selectedTx.method || selectedTx.description || "Wallet"}</span>
                  </div>
                  {feeAmount > 0 && (
                    <div className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/5 rounded-xl text-red-500"><Percent size={16} /></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Frais</span>
                      </div>
                      <span className="text-[11px] font-bold text-red-400">{feeAmount.toFixed(4)} {selectedTx.currency || "PI"}</span>
                    </div>
                  )}
                  {selectedTx.accountNumber && selectedTx.accountNumber !== "Non spécifié" && (
                    <div className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/5 rounded-xl text-blue-500">{selectedTx.isBlockchainWithdraw ? <Globe size={16} /> : <CreditCard size={16} />}</div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compte / Adresse</span>
                      </div>
                      <span className="text-[11px] font-bold text-white font-mono">{selectedTx.accountNumber.length > 20 ? selectedTx.accountNumber.slice(0, 10) + "..." + selectedTx.accountNumber.slice(-6) : selectedTx.accountNumber}</span>
                    </div>
                  )}
                  {selectedTx.blockchainTx && (
                    <div className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/5 rounded-xl text-emerald-500"><ShieldCheck size={16} /></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Blockchain Hash</span>
                      </div>
                      <span className="text-[11px] font-bold text-blue-400 font-mono">{selectedTx.blockchainTx.slice(0, 12)}...</span>
                    </div>
                  )}
                  {selectedTx.description && (
                    <div className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/5 rounded-xl text-blue-500"><History size={16} /></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</span>
                      </div>
                      <span className="text-[11px] font-bold text-white">{selectedTx.description.length > 30 ? selectedTx.description.slice(0, 30) + "..." : selectedTx.description}</span>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="border-t border-white/5 pt-6 space-y-4">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-[3px]">Initiateur</p>
                  <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-[10px] font-black uppercase">
                      {user?.firstName?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">{userName}</p>
                      <p className="text-[9px] text-slate-600 font-mono">{selectedTx.userId.slice(-12)}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {isPending && (
                  <div className="flex gap-3 pt-4 border-t border-white/5">
                    <Button
                      onClick={() => { handleAction(selectedTx.userId, "VALIDATE_DEPOSIT", selectedTx.amount, selectedTx.currency, [], selectedTx.id); setSelectedTx(null); }}
                      className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
                    >
                      <Check size={16} /> Confirmer
                    </Button>
                    <Button
                      onClick={() => { handleAction(selectedTx.userId, "REJECT_DEPOSIT", selectedTx.amount, "", [], selectedTx.id); setSelectedTx(null); }}
                      className="flex-1 h-12 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
                    >
                      <X size={16} /> Rejeter
                    </Button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-white/[0.02] py-4 text-center border-t border-white/5">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em]">PimPay Admin Console</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* INDIVIDUAL MAINTENANCE MODAL */}
      {maintModalUser && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => { setMaintModalUser(null); setMaintDate(""); setMaintTime(""); }}>
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 w-full max-w-sm space-y-5 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[3px]">Maintenance Individuelle</p>
                <p className="text-sm font-black text-white uppercase mt-1">{maintModalUser.username || maintModalUser.name || "Utilisateur"}</p>
              </div>
              <button onClick={() => { setMaintModalUser(null); setMaintDate(""); setMaintTime(""); }} className="p-2 bg-white/5 rounded-full text-white"><X size={16}/></button>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              Statut actuel : <span className={maintModalUser.status === "SUSPENDED" ? "text-orange-400" : "text-emerald-400"}>{maintModalUser.status}</span>
            </p>

            {maintModalUser.status === "SUSPENDED" ? (
              <button
                onClick={async () => {
                  await handleAction(maintModalUser.id, "USER_SPECIFIC_MAINTENANCE");
                  setMaintModalUser(null);
                  setMaintDate("");
                  setMaintTime("");
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Check size={16} /> Retirer la maintenance
              </button>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Date de fin (optionnel)</label>
                    <input
                      type="date"
                      value={maintDate}
                      onChange={e => setMaintDate(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Heure de fin (optionnel)</label>
                    <input
                      type="time"
                      value={maintTime}
                      onChange={e => setMaintTime(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500/50 transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const extra = maintDate && maintTime ? `${maintDate}T${maintTime}:00.000Z` : undefined;
                    await handleAction(maintModalUser.id, "USER_SPECIFIC_MAINTENANCE", 0, extra || "");
                    setMaintModalUser(null);
                    setMaintDate("");
                    setMaintTime("");
                  }}
                  className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Clock size={16} /> Mettre en maintenance
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
