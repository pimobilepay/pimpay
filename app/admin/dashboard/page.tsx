"use client";
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";          import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";  import { toast } from "sonner";
import {                                                LogOut, Shield, Users, Zap, Search, Key, CreditCard, CircleDot, UserCog, Ban,                               Settings, Wallet, Megaphone, MonitorSmartphone, Hash, Snowflake, Headphones,
  Flame, Globe, Activity, ShieldCheck, Database, History, X,                                                  Cpu, HardDrive, Server, Terminal, LayoutGrid, ArrowUpRight, CheckCircle2, Send, Clock,
  CalendarClock, RefreshCw, ShoppingBag, Landmark, Percent, Gavel, SmartphoneNfc, Timer, Radio, Gift, Check, ChevronRight,
  Loader2, Wifi, WifiOff, MapPin, Eye, Smartphone, Monitor, Trash2
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Admin2FAModal } from "@/components/admin/Admin2FAModal";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

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
  role: 'ADMIN' | 'USER' | 'MERCHANT' | 'AGENT' | 'BANK_ADMIN' | 'BUSINESS_ADMIN';
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
  fromUser?: { firstName: string | null; lastName: string | null; username?: string | null };
  toUser?: { firstName: string | null; lastName: string | null; username?: string | null };
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
  adminId: string | null;
  adminName: string | null;
  adminEmail: string | null;
  adminAvatar: string | null;
  action: string;
  targetId: string | null;
  targetEmail: string | null;
  targetName: string | null;
  details: string | null;
  createdAt: string;
};

type ChartDataPoint = {
  day: string;
  date?: string;
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

const UserRow = ({ user, isSelected, onSelect, onUpdateBalance, onResetBalance, onResetPassword, onToggleRole, onResetPin, onFreeze, onToggleAutoApprove, onIndividualMaintenance, onViewSessions, onSupport, onBan, onAirdrop, onSendMessage, onViewBalance, onDelete, onDisconnect }: any) => {
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
        <button onClick={onDisconnect} title="Deconnecter l'utilisateur" className="p-2 bg-red-500/10 text-red-400 rounded-xl shrink-0 hover:bg-red-500/20 transition-colors"><LogOut size={14} /></button>
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
        <button onClick={onResetBalance} title="Reinitialiser Solde" className="p-2 bg-red-500/10 text-red-500 rounded-xl shrink-0 hover:bg-red-500/20 transition-colors"><Wallet size={14} /></button>
        <button onClick={onAirdrop} title="Airdrop" className="p-2 bg-amber-500/10 text-amber-500 rounded-xl shrink-0"><Gift size={14} /></button>
        <button onClick={onDelete} title="Supprimer l'utilisateur" className="p-2 bg-red-500/20 text-red-500 rounded-xl shrink-0 hover:bg-red-500/30 transition-colors"><Trash2 size={14} /></button>
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
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: LedgerUser; role: string } | null>(null);
  const [maintModalUser, setMaintModalUser] = useState<LedgerUser | null>(null);
  const [maintDate, setMaintDate] = useState("");
  const [maintTime, setMaintTime] = useState("");
  const [sessionInfo, setSessionInfo] = useState<UserSessionInfo>(null);
  const [sessionInfoTab, setSessionInfoTab] = useState<"sessions" | "activity" | "security">("sessions");
  const [balanceModalUser, setBalanceModalUser] = useState<LedgerUser | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  // Live chart states
  const [liveIndicator, setLiveIndicator] = useState(true);
  const [lastChartRefresh, setLastChartRefresh] = useState(new Date());
  const [chartRefreshing, setChartRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [chartPeriod, setChartPeriod] = useState<7 | 30 | 90>(7);

  // 2FA Modal state for sensitive reset actions
  const [twoFaModal, setTwoFaModal] = useState<{
    open: boolean;
    pendingAction: (() => void) | null;
    title: string;
    description: string;
  }>({ open: false, pendingAction: null, title: "", description: "" });
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaError, setTwoFaError] = useState("");
  
  // 2FA Modal state for DELETE and AIRDROP actions
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [pending2FAAction, setPending2FAAction] = useState<{
    type: "DELETE" | "AIRDROP" | "AIRDROP_ALL" | "BATCH_AIRDROP";
    userId?: string;
    userName?: string;
    amount?: number;
    userIds?: string[];
  } | null>(null);

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

  // Live indicator blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => setLiveIndicator(v => !v), 1200);
    return () => clearInterval(blinkInterval);
  }, []);

  // Real-time clock
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Auto-refresh chart data every 30 seconds
  useEffect(() => {
    if (!isMounted) return;
    const chartInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/chart-data?days=${chartPeriod}`);
        if (res.ok) {
          const chartRes = await res.json();
          setChartData(chartRes.chartData || []);
          setChartSummary(chartRes.summary || { totalEntrant: 0, totalSortant: 0, totalExchange: 0, totalMpay: 0, totalVolume: 0, transactionCount: 0, mpayCount: 0 });
          setLastChartRefresh(new Date());
        }
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(chartInterval);
  }, [isMounted, chartPeriod]);

  // Manual chart refresh handler
  const handleChartRefresh = async () => {
    setChartRefreshing(true);
    try {
      const res = await fetch(`/api/admin/chart-data?days=${chartPeriod}`);
      if (res.ok) {
        const chartRes = await res.json();
        setChartData(chartRes.chartData || []);
        setChartSummary(chartRes.summary || { totalEntrant: 0, totalSortant: 0, totalExchange: 0, totalMpay: 0, totalVolume: 0, transactionCount: 0, mpayCount: 0 });
        setLastChartRefresh(new Date());
      }
    } catch { /* silent */ }
    finally { setChartRefreshing(false); }
  };

  // Handle period change
  const handlePeriodChange = async (period: 7 | 30 | 90) => {
    setChartPeriod(period);
    setChartRefreshing(true);
    try {
      const res = await fetch(`/api/admin/chart-data?days=${period}`);
      if (res.ok) {
        const chartRes = await res.json();
        setChartData(chartRes.chartData || []);
        setChartSummary(chartRes.summary || { totalEntrant: 0, totalSortant: 0, totalExchange: 0, totalMpay: 0, totalVolume: 0, transactionCount: 0, mpayCount: 0 });
        setLastChartRefresh(new Date());
      }
    } catch { /* silent */ }
    finally { setChartRefreshing(false); }
  };

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return `il y a ${Math.floor(diff)}s`;
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
    return `il y a ${Math.floor(diff / 3600)}h`;
  };

  /**
   * Ouvre le modal 2FA et exécute l'action uniquement après vérification TOTP réussie.
   */
  const requireTwoFa = (title: string, description: string, action: () => void) => {
    setTwoFaCode("");
    setTwoFaError("");
    setTwoFaModal({ open: true, pendingAction: action, title, description });
  };

  const confirmTwoFa = async () => {
    if (twoFaCode.length !== 6) return;
    setTwoFaLoading(true);
    setTwoFaError("");
    try {
      const res = await fetch("/api/admin/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFaCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTwoFaError(data.error || "Code incorrect");
        setTwoFaLoading(false);
        return;
      }
      // Code valide : fermer le modal et exécuter l'action
      setTwoFaModal({ open: false, pendingAction: null, title: "", description: "" });
      setTwoFaCode("");
      twoFaModal.pendingAction?.();
    } catch {
      setTwoFaError("Erreur de connexion");
    } finally {
      setTwoFaLoading(false);
    }
  };

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

  const handlePrivateMessage = async (userId: string, userName: string, message: string) => {
    try {
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "SEND_PRIVATE_MESSAGE", extraData: message }),
      });
      
      if (res.ok) {
        toast.success(`Message prive envoye a ${userName}`, {
          description: "L'utilisateur recevra une notification",
          icon: "📧",
          duration: 4000,
        });
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de l'envoi du message");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    const confirmed = confirm(`Supprimer definitivement l'utilisateur ${userName} ?\n\nCette action est IRREVERSIBLE et supprimera:\n- Le compte utilisateur\n- Tous ses portefeuilles\n- Tout son historique de transactions`);
    if (!confirmed) return;
    
    const doubleConfirm = confirm("DERNIERE CONFIRMATION: Etes-vous vraiment sur ?");
    if (!doubleConfirm) return;
    
    // Require 2FA verification
    setPending2FAAction({ type: "DELETE", userId, userName });
    setShow2FAModal(true);
  };

  const handleDisconnectUser = async (userId: string, userName: string) => {
    const confirmed = confirm(`Deconnecter ${userName} ?\n\nCette action va fermer toutes ses sessions actives et l'obliger a se reconnecter.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/sessions`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(`${userName} deconnecte - ${data.count} session(s) fermee(s)`);
        // Refresh session info si le modal est ouvert pour cet utilisateur
        if (sessionInfo?.user.id === userId) {
          fetchUserSessions(sessionInfo.user);
        }
        // Rafraîchir la liste des utilisateurs dans tous les cas
        const usersRes = await fetch("/api/admin/users");
        if (usersRes.ok) setUsers(await usersRes.json());
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la deconnexion");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  };

  const executeDeleteUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "DELETE_USER" }),
      });
      
      if (res.ok) {
        toast.success("Utilisateur supprime avec succes");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  };

  const handleAirdropWith2FA = (userId: string, userName: string, amount: number) => {
    setPending2FAAction({ type: "AIRDROP", userId, userName, amount });
    setShow2FAModal(true);
  };

  const handleAirdropAllWith2FA = (amount: number) => {
    setPending2FAAction({ type: "AIRDROP_ALL", amount });
    setShow2FAModal(true);
  };

  const handleBatchAirdropWith2FA = (userIds: string[], amount: number) => {
    setPending2FAAction({ type: "BATCH_AIRDROP", userIds, amount });
    setShow2FAModal(true);
  };

  const on2FAVerified = () => {
    if (!pending2FAAction) return;
    
    switch (pending2FAAction.type) {
      case "DELETE":
        if (pending2FAAction.userId) {
          executeDeleteUser(pending2FAAction.userId);
        }
        break;
      case "AIRDROP":
        if (pending2FAAction.userId && pending2FAAction.amount) {
          handleAction(pending2FAAction.userId, "AIRDROP", pending2FAAction.amount);
        }
        break;
      case "AIRDROP_ALL":
        if (pending2FAAction.amount) {
          handleAction(null, "AIRDROP_ALL", pending2FAAction.amount);
        }
        break;
      case "BATCH_AIRDROP":
        if (pending2FAAction.userIds && pending2FAAction.amount) {
          handleAction(null, "BATCH_AIRDROP", pending2FAAction.amount, "", pending2FAAction.userIds);
        }
        break;
    }
    
    setPending2FAAction(null);
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
                const a = prompt("Airdrop Groupe (π):");
                if(a) handleBatchAirdropWith2FA(selectedUserIds, parseFloat(a));
              }} className="h-10 bg-white/10 rounded-xl px-4 text-[10px] font-black uppercase">Airdrop</Button>
              <Button onClick={() => handleAction(null, "BATCH_BAN", 0, "", selectedUserIds)} className="h-10 bg-red-500 rounded-xl px-4 text-[10px] font-black uppercase">Bannir</Button>
            </div>
          </div>
        </div>
      )}

      {/* TOP NAV WITH NOTIFICATIONS */}
      <div className="px-6">
        <AdminTopNav 
          title="Admin Dashboard" 
          subtitle="PimPay Core"
          onRefresh={fetchData}
          backPath="/admin"
        />
      </div>

      <div className="px-6 pt-4 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
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
                    <Card className="bg-slate-900/60 border-white/5 rounded-[2.5rem] p-6 space-y-4 relative overflow-hidden">
                        {/* Live indicator glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                        
                        {/* Header with live indicator and refresh */}
                        <div className="flex flex-col gap-3 relative z-10">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Flux Financier</p>
                              {/* Live indicator */}
                              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-1">
                                <span className={`h-1.5 w-1.5 rounded-full bg-emerald-400 transition-opacity duration-500 ${liveIndicator ? 'opacity-100' : 'opacity-30'}`} />
                                <span className="text-[7px] font-black text-emerald-400 uppercase tracking-wider">Live</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Clock */}
                              <div className="hidden sm:flex items-center gap-2">
                                <span className="text-[8px] font-mono text-slate-500">{formatRelativeTime(lastChartRefresh)}</span>
                                <span className="text-slate-700">|</span>
                                <span className="text-[9px] font-mono text-blue-400 font-bold">{currentTime.toLocaleTimeString('fr-FR')}</span>
                              </div>
                              {/* Refresh button */}
                              <button
                                onClick={handleChartRefresh}
                                disabled={chartRefreshing}
                                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-[8px] font-black text-slate-300 uppercase tracking-wider transition hover:border-blue-500/50 hover:bg-slate-700 hover:text-white disabled:opacity-50"
                              >
                                <RefreshCw className={`h-3 w-3 transition-transform duration-700 ${chartRefreshing ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Actualiser</span>
                              </button>
                            </div>
                          </div>
                          
                          {/* Period filters */}
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Période :</span>
                            {[
                              { label: '7J', value: 7 as const },
                              { label: '30J', value: 30 as const },
                              { label: '90J', value: 90 as const }
                            ].map(({ label, value }) => (
                              <button
                                key={value}
                                onClick={() => handlePeriodChange(value)}
                                disabled={chartRefreshing}
                                className={`rounded-lg px-3 py-1.5 text-[8px] font-black uppercase tracking-wider transition border ${
                                  chartPeriod === value
                                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                                    : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-blue-500/30 hover:bg-slate-700'
                                } disabled:opacity-50`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Legend */}
                        <div className="flex items-center justify-center gap-4 sm:gap-6">
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" /><span className="text-[8px] font-black text-slate-400 uppercase">Entrant</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]" /><span className="text-[8px] font-black text-slate-400 uppercase">Sortant</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" /><span className="text-[8px] font-black text-slate-400 uppercase">Exchange</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" /><span className="text-[8px] font-black text-slate-400 uppercase">MPAY</span></div>
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
                              <XAxis 
                                dataKey="day" 
                                tick={{ fontSize: 9, fill: '#64748b', fontWeight: 800 }} 
                                axisLine={false} 
                                tickLine={false} 
                                interval={chartPeriod === 7 ? 0 : chartPeriod === 30 ? 4 : 14}
                              />
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
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Logs Audit (Dernières Actions)</p>
                          <button onClick={() => router.push('/admin/logs')} className="text-[8px] font-black text-slate-500 uppercase tracking-wider hover:text-blue-400 transition-colors">Voir tout</button>
                        </div>
                        <div className="space-y-3">
                            {logs.slice(0, 8).map(log => (
                                <div 
                                  key={log.id} 
                                  className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 space-y-2 cursor-pointer hover:bg-white/[0.04] hover:border-blue-500/20 transition-all active:scale-[0.99]"
                                  onClick={() => setSelectedAuditLog(log)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-[8px] font-black uppercase">
                                        {log.adminName?.[0] || 'S'}
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black text-white uppercase">{log.adminName || 'Systeme'}</p>
                                        {log.adminEmail && <p className="text-[7px] text-slate-500 font-mono">{log.adminEmail}</p>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[7px] text-slate-600 font-mono">{new Date(log.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                      <ChevronRight size={12} className="text-slate-600" />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider ${
                                      log.action.includes('BAN') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                      log.action.includes('RESET') ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                      log.action.includes('AIRDROP') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                      log.action.includes('ROLE') ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                      log.action.includes('BALANCE') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      log.action.includes('MAINTENANCE') ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                      'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}>{log.action}</span>
                                    {log.targetEmail && (
                                      <span className="text-[7px] text-slate-500 font-mono truncate max-w-[120px]">→ {log.targetName || log.targetEmail}</span>
                                    )}
                                  </div>
                                  {log.details && (
                                    <p className="text-[7px] text-slate-600 font-mono truncate">{log.details}</p>
                                  )}
                                </div>
                            ))}
                            {logs.length === 0 && (
                              <div className="text-center py-6">
                                <History size={20} className="text-slate-600 mx-auto mb-2" />
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aucun log disponible</p>
                              </div>
                            )}
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
                            onUpdateBalance={(a:number) => requireTwoFa(
                              `Ajuster le solde de ${user.username || user.name}`,
                              `Le solde sera ajusté de ${a > 0 ? '+' : ''}${a} π. Confirmez avec votre code Google Authenticator.`,
                              () => handleAction(user.id, 'UPDATE_BALANCE', a)
                            )}
                            onResetBalance={() => requireTwoFa(
                              `Réinitialiser le solde de ${user.username || user.name}`,
                              `Le solde de ${user.username || user.name} sera remis à 0. Confirmez avec votre code Google Authenticator.`,
                              () => handleAction(user.id, 'RESET_USER_BALANCE')
                            )}
                            onAirdrop={() => { const a = prompt("Airdrop (π):"); if(a) handleAirdropWith2FA(user.id, user.username || user.name || "Utilisateur", parseFloat(a)); }}
                            onBan={() => handleAction(user.id, user.status === 'BANNED' ? 'UNBAN' : 'BAN')}
                            onResetPin={() => { const p = prompt("Nouveau PIN :"); if(p) handleAction(user.id, 'RESET_PIN', 0, "", [], "", p); }}
                            onResetPassword={() => { const p = prompt("Nouveau Password :"); if(p) handleAction(user.id, 'RESET_PASSWORD', 0, "", [], "", p); }}
                            onIndividualMaintenance={() => setMaintModalUser(user)}
                            onSendMessage={() => { const msg = prompt("Message privé pour l'utilisateur :"); if(msg) handlePrivateMessage(user.id, user.username || user.name || "Utilisateur", msg); }}
                            onViewSessions={() => fetchUserSessions(user)}
                            onToggleRole={() => setRoleModalUser(user)}
                            onFreeze={() => handleAction(user.id, user.status === 'FROZEN' ? 'UNFREEZE' : 'FREEZE')}
                            onToggleAutoApprove={() => handleAction(user.id, 'TOGGLE_AUTO_APPROVE')}
                            onSupport={() => {
                              const msg = prompt(`Notification support pour ${user.username || user.name} :`);
                              if (msg && msg.trim()) handleAction(user.id, "SEND_SUPPORT_NOTIFICATION", 0, msg.trim());
                            }}
                            onViewBalance={() => setBalanceModalUser(user)}
                            onDelete={() => handleDeleteUser(user.id, user.username || user.name || "Utilisateur")}
                            onDisconnect={() => handleDisconnectUser(user.id, user.username || user.name || "Utilisateur")}
                        />
                    ))}
                    <button
                      onClick={() => requireTwoFa(
                        "Réinitialiser tous les soldes",
                        "Cette action va remettre le solde de TOUS les utilisateurs à 0. Confirmez avec votre code Google Authenticator.",
                        () => handleAction(null, "RESET_ALL_BALANCES")
                      )}
                      className="w-full h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between px-6 text-red-400 hover:bg-red-500/20 transition-colors active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <Wallet size={16} className="shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Réinitialiser tous les soldes</span>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30">Dangereux</span>
                    </button>
                </div>
            )}

            {activeTab === "finance" && (
                <div className="space-y-6">
                    <Button onClick={() => { const a = prompt("Airdrop GLOBAL (π):"); if(a) handleAirdropAllWith2FA(parseFloat(a)); }} className="w-full h-16 bg-emerald-500 rounded-2xl font-black text-[10px] uppercase flex items-center justify-between px-6">
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
                          const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
                          const userName = fullName || user?.username || 'Utilisateur PimPay';
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

                    {/* Actions Rapides - Liens vers autres pages */}
                    <div className="pt-4">
                      <p className="text-[9px] font-black uppercase text-slate-500 mb-3 tracking-widest">Actions Rapides</p>
                      <div className="grid grid-cols-1 gap-3">
                        
                        <Card onClick={() => router.push('/hub')} className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-5 cursor-pointer hover:bg-amber-500/20 transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500 rounded-2xl text-white"><SmartphoneNfc size={18} /></div>
                            <div>
                              <p className="text-[10px] font-black text-white uppercase">PimPay Hub</p>
                              <p className="text-[8px] font-bold text-amber-400 uppercase">Gestion des Agents</p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-amber-500 group-hover:translate-x-1 transition-transform" />
                        </Card>

                        <Card onClick={() => router.push('/admin/rescue')} className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-5 cursor-pointer hover:bg-red-500/20 transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500 rounded-2xl text-white"><Flame size={18} /></div>
                            <div>
                              <p className="text-[10px] font-black text-white uppercase">Rescue</p>
                              <p className="text-[8px] font-bold text-red-400 uppercase">Recovery & Emergency Tools</p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-red-500 group-hover:translate-x-1 transition-transform" />
                        </Card>

                        <Card onClick={() => router.push('/admin/messages')} className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-5 cursor-pointer hover:bg-emerald-500/20 transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500 rounded-2xl text-white"><Send size={18} /></div>
                            <div>
                              <p className="text-[10px] font-black text-white uppercase">Messages</p>
                              <p className="text-[8px] font-bold text-emerald-400 uppercase">Communication Utilisateurs</p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-emerald-500 group-hover:translate-x-1 transition-transform" />
                        </Card>

                      </div>
                    </div>
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
  <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 w-full max-w-md space-y-5 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
<div className="grid grid-cols-3 gap-2">
  {(["USER", "AGENT", "MERCHANT", "ADMIN", "BANK_ADMIN", "BUSINESS_ADMIN"] as const).map(role => {
    const roleConfig = {
      USER: { icon: Users, color: "blue", label: "Utilisateur" },
      AGENT: { icon: Shield, color: "purple", label: "Agent" },
      MERCHANT: { icon: ShoppingBag, color: "orange", label: "Marchand" },
      ADMIN: { icon: ShieldCheck, color: "red", label: "Admin" },
      BANK_ADMIN: { icon: Landmark, color: "emerald", label: "Bank Admin" },
      BUSINESS_ADMIN: { icon: Zap, color: "amber", label: "Business Admin" },
    };
    const config = roleConfig[role];
    const Icon = config.icon;
    const isActive = roleModalUser.role === role;
    const colorClasses = {
      blue: isActive ? "bg-blue-600 border-blue-500 shadow-blue-500/20" : "hover:border-blue-500/50",
      purple: isActive ? "bg-purple-600 border-purple-500 shadow-purple-500/20" : "hover:border-purple-500/50",
      orange: isActive ? "bg-orange-600 border-orange-500 shadow-orange-500/20" : "hover:border-orange-500/50",
      red: isActive ? "bg-red-600 border-red-500 shadow-red-500/20" : "hover:border-red-500/50",
      emerald: isActive ? "bg-emerald-600 border-emerald-500 shadow-emerald-500/20" : "hover:border-emerald-500/50",
      amber: isActive ? "bg-amber-600 border-amber-500 shadow-amber-500/20" : "hover:border-amber-500/50",
    };
    return (
      <button
        key={role}
        onClick={() => {
          setRoleModalUser(null);
          requireTwoFa(
            `Changer le rôle de ${roleModalUser.username || roleModalUser.name}`,
            `Le rôle sera changé de ${roleModalUser.role} vers ${role}. Confirmez avec votre code Google Authenticator.`,
            () => handleAction(roleModalUser.id, "SET_ROLE", 0, role)
          );
        }}
        className={`p-4 rounded-2xl border text-center transition-all active:scale-95 ${
          isActive
            ? `${colorClasses[config.color as keyof typeof colorClasses]} text-white shadow-lg`
            : `bg-white/5 border-white/10 text-slate-400 ${colorClasses[config.color as keyof typeof colorClasses]} hover:text-white`
        }`}
      >
        <Icon size={18} className={`mx-auto mb-2 ${isActive ? "text-white" : "text-slate-500"}`} />
        <p className="text-[10px] font-black uppercase tracking-wider">{config.label}</p>
        <p className="text-[7px] text-slate-500 mt-0.5 uppercase tracking-widest">{role}</p>
      </button>
    );
  })}
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
                {balanceModalUser.wallets?.filter((w: any) => ["XAF", "XOF", "EUR", "USD", "GBP", "NGN", "MGA"].includes(w.currency.toUpperCase())).length > 0 ? (
                  balanceModalUser.wallets?.filter((w: any) => ["XAF", "XOF", "EUR", "USD", "GBP", "NGN", "MGA"].includes(w.currency.toUpperCase())).map((wallet: any) => (
                    <div key={wallet.currency} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl p-3 hover:border-blue-500/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] ${
                          wallet.currency.toUpperCase() === "XAF" || wallet.currency.toUpperCase() === "XOF" ? "bg-green-500/20 text-green-400" :
                          wallet.currency.toUpperCase() === "MGA" ? "bg-teal-500/20 text-teal-400" :
                          wallet.currency.toUpperCase() === "EUR" ? "bg-blue-500/20 text-blue-400" :
                          wallet.currency.toUpperCase() === "USD" ? "bg-emerald-500/20 text-emerald-400" :
                          "bg-purple-500/20 text-purple-400"
                        }`}>
                          {wallet.currency.toUpperCase() === "XAF" || wallet.currency.toUpperCase() === "XOF" ? "F" :
                           wallet.currency.toUpperCase() === "MGA" ? "Ar" :
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
              !["PI", "SDA", "BTC", "ETH", "USDT", "USDC", "XAF", "XOF", "EUR", "USD", "GBP", "NGN", "MGA"].includes(w.currency.toUpperCase())
            ).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet size={14} className="text-purple-500" />
                  <p className="text-[9px] font-black text-purple-400 uppercase tracking-[2px]">Autres Devises</p>
                </div>
                <div className="space-y-2">
                  {balanceModalUser.wallets?.filter((w: any) => 
                    !["PI", "SDA", "BTC", "ETH", "USDT", "USDC", "XAF", "XOF", "EUR", "USD", "GBP", "NGN", "MGA"].includes(w.currency.toUpperCase())
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
                    handleAirdropWith2FA(balanceModalUser.id, balanceModalUser.username || balanceModalUser.name || "Utilisateur", parseFloat(amount));
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
        const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
        const userName = fullName || user?.username || 'Utilisateur PimPay';
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

      {/* MODAL 2FA pour DELETE et AIRDROP */}
      <Admin2FAModal
        isOpen={show2FAModal}
        onClose={() => {
          setShow2FAModal(false);
          setPending2FAAction(null);
        }}
        onVerified={on2FAVerified}
        actionTitle={
          pending2FAAction?.type === "DELETE" 
            ? `Supprimer ${pending2FAAction.userName || "l'utilisateur"}`
            : pending2FAAction?.type === "AIRDROP"
            ? `Airdrop de ${pending2FAAction.amount} Pi pour ${pending2FAAction.userName}`
            : pending2FAAction?.type === "AIRDROP_ALL"
            ? `Airdrop Global de ${pending2FAAction.amount} Pi`
            : pending2FAAction?.type === "BATCH_AIRDROP"
            ? `Airdrop de ${pending2FAAction.amount} Pi pour ${pending2FAAction.userIds?.length} utilisateurs`
            : "Action sensible"
        }
        actionDescription={
          pending2FAAction?.type === "DELETE"
            ? "Cette action supprimera definitivement le compte et toutes ses donnees."
            : pending2FAAction?.type === "AIRDROP_ALL"
            ? "Cette action creditera TOUS les utilisateurs du montant specifie."
            : pending2FAAction?.type === "BATCH_AIRDROP"
            ? `${pending2FAAction.userIds?.length} utilisateurs selectionnes recevront ${pending2FAAction.amount} Pi chacun.`
            : undefined
        }
        variant={pending2FAAction?.type === "DELETE" ? "danger" : "warning"}
      />

      {/* MODAL 2FA — Confirmation Google Authenticator */}
      {/* Audit Log Detail Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setSelectedAuditLog(null)}>
          <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-400">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">Detail Log Audit</h3>
                  <p className="text-[9px] text-slate-500 font-mono">{selectedAuditLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Admin Info */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3">
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Administrateur</p>
                <div className="flex items-center gap-3">
                  {selectedAuditLog.adminAvatar ? (
                    <img src={selectedAuditLog.adminAvatar} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10" crossOrigin="anonymous" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-sm font-black uppercase">
                      {selectedAuditLog.adminName?.[0] || 'S'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-black text-white uppercase">{selectedAuditLog.adminName || 'Systeme'}</p>
                    {selectedAuditLog.adminEmail && <p className="text-[10px] text-slate-500 font-mono">{selectedAuditLog.adminEmail}</p>}
                  </div>
                </div>
              </div>

              {/* Action Info */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3">
                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Action Effectuee</p>
                <span className={`inline-block text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-wider ${
                  selectedAuditLog.action.includes('BAN') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  selectedAuditLog.action.includes('RESET') ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                  selectedAuditLog.action.includes('AIRDROP') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  selectedAuditLog.action.includes('ROLE') ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                  selectedAuditLog.action.includes('BALANCE') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  selectedAuditLog.action.includes('MAINTENANCE') ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>{selectedAuditLog.action}</span>
              </div>

              {/* Target Info */}
              {(selectedAuditLog.targetId || selectedAuditLog.targetEmail || selectedAuditLog.targetName) && (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3">
                  <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Cible</p>
                  <div className="space-y-2">
                    {selectedAuditLog.targetName && (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 uppercase">Nom:</span>
                        <span className="text-xs font-bold text-white">{selectedAuditLog.targetName}</span>
                      </div>
                    )}
                    {selectedAuditLog.targetEmail && (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 uppercase">Email:</span>
                        <span className="text-xs font-mono text-slate-300">{selectedAuditLog.targetEmail}</span>
                      </div>
                    )}
                    {selectedAuditLog.targetId && (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 uppercase">ID:</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">{selectedAuditLog.targetId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Details */}
              {selectedAuditLog.details && (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3">
                  <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Details</p>
                  <p className="text-xs text-slate-300 font-mono bg-slate-800/50 p-3 rounded-xl leading-relaxed break-all">{selectedAuditLog.details}</p>
                </div>
              )}

              {/* Timestamp */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Horodatage</p>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-500" />
                  <span className="text-sm font-bold text-white">{new Date(selectedAuditLog.createdAt).toLocaleString('fr-FR', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all active:scale-[0.98]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {twoFaModal.open && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-0">
              <div className="p-2.5 bg-red-500/10 rounded-2xl text-red-400">
                <Shield size={20} />
              </div>
              <button
                onClick={() => {
                  setTwoFaModal({ open: false, pendingAction: null, title: "", description: "" });
                  setTwoFaCode("");
                  setTwoFaError("");
                }}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pt-4 pb-6 space-y-5">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">{twoFaModal.title}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 leading-relaxed">{twoFaModal.description}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Code Google Authenticator</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFaCode}
                  onChange={(e) => {
                    setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setTwoFaError("");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" && twoFaCode.length === 6) confirmTwoFa(); }}
                  placeholder="000 000"
                  autoFocus
                  className="w-full text-center text-3xl font-black tracking-[0.5em] bg-slate-900/60 border border-white/10 rounded-2xl py-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {twoFaError && (
                  <p className="text-[10px] font-bold text-red-400 text-center">{twoFaError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setTwoFaModal({ open: false, pendingAction: null, title: "", description: "" });
                    setTwoFaCode("");
                    setTwoFaError("");
                  }}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmTwoFa}
                  disabled={twoFaLoading || twoFaCode.length !== 6}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {twoFaLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
