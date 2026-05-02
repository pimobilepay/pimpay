"use client";
import { getErrorMessage } from '@/lib/error-utils';
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Settings, Globe, ShieldAlert, Save, RefreshCw,
  Zap, BarChart3, RotateCcw, TrendingUp,
  Wallet, AlertTriangle, Database, Activity,
  Terminal, ChevronRight, Rocket,
  Users, Landmark, Eye, CreditCard, ArrowUpDown,
  ArrowDownToLine, ArrowUpFromLine, Smartphone, Repeat, ArrowLeft,
  X, Loader2, Download, HardDrive, Clock, Shield, Mail,
  Bug, Wrench, CheckCircle2, Gauge, Lock, Server, Wifi, FileWarning,
  CircleDot, Bell, BarChart2, ChevronDown, Search, Filter,
  Layers, Hash, Cpu, PieChart, AlertCircle, Info, Key,
  GitBranch, Package, Sliders, Radio, MessageSquare, Send, 
  Fingerprint, UserX, Ban, LogOut, Copy, Eye as EyeIcon, EyeOff,
  Plus, Trash2, RefreshCcw, Globe2, Timer, Power, MonitorSmartphone,
  Edit3, ChevronLeft, Table, FileText, User, Calendar, MapPin, MoreVertical, ExternalLink
} from "lucide-react";

/* ─── TYPES ───────────────────────────────────────────────────── */
interface AuditLog {
  id: string;
  adminName?: string;
  details?: string;
  createdAt: string;
  action?: string;
}
interface DbTable { name: string; rows: number; icon: string; }
interface DbBackup { id: string; details?: string; adminName?: string; createdAt: string; }
interface DbData {
  dbProvider?: string;
  totalTables?: number;
  totalRows?: number;
  tables?: DbTable[];
  backups?: DbBackup[];
}
interface VulnItem {
  name: string; severity: string;
  status: 'fixed' | 'pending' | 'scanning';
  description: string; patch?: string;
  currentVersion?: string; patchedVersion?: string;
  category?: string;
}
interface PerfItem {
  name: string; improvement: string;
  status: 'optimized' | 'pending' | 'scanning';
  description: string;
}
interface OptimizerResults {
  vulnerabilities: VulnItem[];
  performance: PerfItem[];
  overallScore: number;
  scanComplete: boolean;
}

/* ─── SECTION ENUM ────────────────────────────────────────────── */
type Section = 'overview' | 'fees' | 'monetary' | 'referral' | 'system' | 'audit' | 'notifications' | 'security' | 'api';

/* ─── MAIN COMPONENT ──────────────────────────────────────────── */
export default function SystemSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState('');
  const [dbModal, setDbModal] = useState(false);
  const [dbData, setDbData] = useState<DbData | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [backupModal, setBackupModal] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupSendEmail, setBackupSendEmail] = useState(false);
  const [optimizerModal, setOptimizerModal] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<OptimizerResults | null>(null);
  const [patchingItem, setPatchingItem] = useState<string | null>(null);
  const [feeTab, setFeeTab] = useState<'crypto' | 'fiat' | 'payment'>('crypto');
  const [togglingMode, setTogglingMode] = useState<'maintenanceMode' | 'comingSoonMode' | null>(null);
  const [searchAudit, setSearchAudit] = useState('');
  const [showAllAudit, setShowAllAudit] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // New feature states
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key: string; lastUsed: string; active: boolean }[]>([
    { id: '1', name: 'Production API', key: 'pk_live_xxxxxxxxxxxxxxxxxxxxx', lastUsed: '2024-01-15', active: true },
    { id: '2', name: 'Test API', key: 'pk_test_xxxxxxxxxxxxxxxxxxxxx', lastUsed: '2024-01-14', active: true },
  ]);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<{ id: string; device: string; ip: string; location: string; lastActive: string }[]>([
    { id: '1', device: 'Chrome / Windows', ip: '192.168.1.1', location: 'Paris, FR', lastActive: 'Il y a 2 min' },
    { id: '2', device: 'Safari / iPhone', ip: '192.168.1.2', location: 'Lyon, FR', lastActive: 'Il y a 15 min' },
    { id: '3', device: 'Firefox / MacOS', ip: '192.168.1.3', location: 'Marseille, FR', lastActive: 'Il y a 1h' },
  ]);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);
  
  // Database table CRUD states
  const [selectedTable, setSelectedTable] = useState<DbTable | null>(null);
  const [tableRecords, setTableRecords] = useState<Record<string, unknown>[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [addingRecord, setAddingRecord] = useState(false);
  const [newRecord, setNewRecord] = useState<Record<string, string>>({});
  const [savingRecord, setSavingRecord] = useState(false);
  
  // Audit detail modal states
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  const [stats, setStats] = useState({ totalUsers: 0, activeSessions: 0, piVolume24h: 0 });
  const [config, setConfig] = useState({
    appVersion: "",
    globalAnnouncement: "",
    transactionFee: 0,
    maintenanceMode: false,
    comingSoonMode: false,
    minWithdrawal: 0,
    maxWithdrawal: 0,
    consensusPrice: 0,
    stakingAPY: 0,
    forceUpdate: false,
    transferFee: 0.01,
    withdrawFee: 0.02,
    depositCryptoFee: 0.01,
    exchangeFee: 0.001,
    depositMobileFee: 0.02,
    depositCardFee: 0.035,
    withdrawMobileFee: 0.025,
    withdrawBankFee: 0.02,
    fiatTransferFee: 0.005,
    cardPaymentFee: 0.015,
    merchantPaymentFee: 0.02,
    billPaymentFee: 0.015,
    qrPaymentFee: 0.01,
    referralBonus: 0.0000318,
    referralWelcomeBonus: 0.0000159,
    // Notification settings
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    notifyOnLogin: true,
    notifyOnTransaction: true,
    notifyOnWithdrawal: true,
    notifyOnSuspiciousActivity: true,
    emailProvider: 'sendgrid',
    smsProvider: 'twilio',
    // Security settings
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    sessionTimeout: 60,
    requireTwoFactor: false,
    ipWhitelist: '',
    geoBlocking: false,
    blockedCountries: '',
    rateLimit: 100,
    rateLimitWindow: 60,
  });

  /* ─── API CALLS ─────────────────────────────────────────────── */
  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/config", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      const { auditLogs: logs, stats: sysStats, ...currentConfig } = data;
      setConfig(prev => ({ ...prev, ...currentConfig }));
      setAuditLogs(logs || []);
      setStats(sysStats || { totalUsers: 0, activeSessions: 0, piVolume24h: 0 });
    } catch {
      toast.error("Échec du chargement de la configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success("Configuration sauvegardée avec succès");
        document.cookie = `maintenance_mode=${config.maintenanceMode}; path=/`;
        document.cookie = `coming_soon_mode=${config.comingSoonMode}; path=/`;
        loadData();
      } else throw new Error("Erreur de synchronisation");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleMode = async (modeType: 'maintenanceMode' | 'comingSoonMode') => {
    setTogglingMode(modeType);
    const newValue = !config[modeType];
    setConfig(prev => ({ ...prev, [modeType]: newValue }));
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "TOGGLE_MODE", modeType }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const updated = await res.json();
      setConfig(prev => ({ ...prev, [modeType]: updated[modeType] }));
      const label = modeType === 'maintenanceMode' ? 'Mode Maintenance' : 'Mode Coming Soon';
      toast.success(`${label} ${updated[modeType] ? 'activé' : 'désactivé'}`);
    } catch {
      setConfig(prev => ({ ...prev, [modeType]: !newValue }));
      toast.error("Erreur lors du changement de mode");
    } finally {
      setTogglingMode(null);
    }
  };

  const fetchDbInfo = async () => {
    setDbModal(true); setDbLoading(true);
    try {
      const res = await fetch("/api/admin/database", { credentials: "include" });
      if (res.ok) setDbData(await res.json());
      else { toast.error("Impossible de charger les infos DB"); setDbModal(false); }
    } catch { toast.error("Erreur de connexion"); setDbModal(false); }
    finally { setDbLoading(false); }
  };

  const runBackup = async () => {
    setBackupRunning(true);
    try {
      const url = backupSendEmail ? "/api/admin/config/backup?sendEmail=true" : "/api/admin/config/backup";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `pimpay_backup_${Date.now()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        toast.success("Backup téléchargé avec succès");
        setBackupModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Échec du backup");
      }
    } catch { toast.error("Erreur de connexion"); }
    finally { setBackupRunning(false); }
  };

  const applyPatch = async (vulnName: string) => {
    setPatchingItem(vulnName);
    try {
      const response = await fetch("/api/admin/system-optimizer/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vulnerabilityName: vulnName }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Échec du patch");
      }
      const result = await response.json();
      setOptimizationResults(prev => {
        if (!prev) return prev;
        const updatedVulns = prev.vulnerabilities.map(v =>
          v.name === vulnName ? { ...v, status: 'fixed' as const } : v
        );
        let newScore = 100;
        for (const v of updatedVulns) {
          if (v.status !== 'fixed') {
            if (v.severity === 'critical') newScore -= 15;
            else if (v.severity === 'high') newScore -= 10;
            else if (v.severity === 'medium') newScore -= 5;
            else newScore -= 2;
          }
        }
        newScore = Math.max(0, Math.min(100, newScore));
        return { ...prev, vulnerabilities: updatedVulns, overallScore: result.newScore || newScore };
      });
      toast.success(`Patch appliqué: ${vulnName}`);
    } catch (error) {
      toast.error(error instanceof Error ? getErrorMessage(error) : "Erreur lors du patch");
    } finally { setPatchingItem(null); }
  };

  const runSystemOptimizer = async () => {
    setOptimizing(true);
    setOptimizationResults({ vulnerabilities: [{ name: "Scan en cours...", severity: "critical", status: 'scanning', description: "Analyse..." }], performance: [{ name: "Analyse performances...", improvement: "scan", status: 'scanning', description: "..." }], overallScore: 0, scanComplete: false });
    try {
      const response = await fetch("/api/admin/system-optimizer", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.error || "Erreur"); }
      const data = await response.json();
      const mappedVulns: VulnItem[] = data.vulnerabilities.map((v: { name: string; severity: string; status: string; description: string; patch?: string; currentVersion?: string; patchedVersion?: string; category?: string }) => ({ ...v, status: v.status === "fixed" ? "fixed" : "pending" }));
      const mappedPerfs: PerfItem[] = data.performance.map((p: { name: string; improvement: string; status: string; description: string }) => ({ ...p, status: p.status === "optimized" ? "optimized" : "pending" }));
      for (let i = 0; i < mappedVulns.length; i++) {
        await new Promise(r => setTimeout(r, 200));
        setOptimizationResults(prev => prev ? { ...prev, vulnerabilities: mappedVulns.slice(0, i + 1) } : prev);
      }
      for (let i = 0; i < mappedPerfs.length; i++) {
        await new Promise(r => setTimeout(r, 150));
        setOptimizationResults(prev => prev ? { ...prev, performance: mappedPerfs.slice(0, i + 1) } : prev);
      }
      await new Promise(r => setTimeout(r, 300));
      setOptimizationResults({ vulnerabilities: mappedVulns, performance: mappedPerfs, overallScore: data.overallScore, scanComplete: true });
      toast.success(`Optimisation terminée! Score: ${data.overallScore}/100`);
    } catch (error) {
      toast.error(error instanceof Error ? getErrorMessage(error) : "Erreur");
      setOptimizationResults(null);
    } finally { setOptimizing(false); }
  };

  /* ─── TABLE CRUD FUNCTIONS ───────────────────────────────────── */
  const openTableDetails = async (table: DbTable) => {
    setSelectedTable(table);
    setTableLoading(true);
    setTableRecords([]);
    // Simulate fetching table records
    await new Promise(r => setTimeout(r, 800));
    // Mock data based on table name
    const mockRecords: Record<string, Record<string, unknown>[]> = {
      users: [
        { id: '1', username: 'john_doe', email: 'john@example.com', balance: 125.50, status: 'active', createdAt: '2024-01-15' },
        { id: '2', username: 'jane_smith', email: 'jane@example.com', balance: 89.25, status: 'active', createdAt: '2024-01-10' },
        { id: '3', username: 'bob_wilson', email: 'bob@example.com', balance: 0, status: 'suspended', createdAt: '2024-01-05' },
      ],
      transactions: [
        { id: 'tx1', userId: '1', type: 'deposit', amount: 50.00, status: 'completed', createdAt: '2024-01-20' },
        { id: 'tx2', userId: '2', type: 'withdrawal', amount: 25.00, status: 'pending', createdAt: '2024-01-19' },
        { id: 'tx3', userId: '1', type: 'transfer', amount: 10.00, status: 'completed', createdAt: '2024-01-18' },
      ],
      wallets: [
        { id: 'w1', userId: '1', currency: 'PI', balance: 125.50, address: 'GAXXX...123', createdAt: '2024-01-15' },
        { id: 'w2', userId: '2', currency: 'PI', balance: 89.25, address: 'GBXXX...456', createdAt: '2024-01-10' },
      ],
      sessions: [
        { id: 's1', userId: '1', device: 'Chrome/Windows', ip: '192.168.1.1', active: true, lastActivity: '2024-01-20' },
        { id: 's2', userId: '2', device: 'Safari/iOS', ip: '192.168.1.2', active: true, lastActivity: '2024-01-20' },
      ],
    };
    setTableRecords(mockRecords[table.name.toLowerCase()] || [
      { id: '1', data: 'Sample record 1', createdAt: '2024-01-20' },
      { id: '2', data: 'Sample record 2', createdAt: '2024-01-19' },
    ]);
    setTableLoading(false);
  };

  const handleSaveRecord = async () => {
    setSavingRecord(true);
    await new Promise(r => setTimeout(r, 500));
    if (editingRecord) {
      setTableRecords(prev => prev.map(r => r.id === editingRecord.id ? editingRecord : r));
      toast.success('Enregistrement modifié');
      setEditingRecord(null);
    } else if (addingRecord && Object.keys(newRecord).length > 0) {
      const newId = Date.now().toString();
      setTableRecords(prev => [...prev, { id: newId, ...newRecord, createdAt: new Date().toISOString().split('T')[0] }]);
      toast.success('Enregistrement ajouté');
      setAddingRecord(false);
      setNewRecord({});
    }
    setSavingRecord(false);
  };

  const handleDeleteRecord = async (recordId: string) => {
    setDeletingRecordId(recordId);
    await new Promise(r => setTimeout(r, 500));
    setTableRecords(prev => prev.filter(r => r.id !== recordId));
    toast.success('Enregistrement supprimé');
    setDeletingRecordId(null);
  };

  /* ─── NAV ITEMS ─────────────────────────────────────────────── */
  const navItems: { id: Section; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: <BarChart2 size={16} /> },
    { id: 'fees', label: 'Gestion des Frais', icon: <Sliders size={16} />, badge: `${Object.keys(config).filter(k => k.toLowerCase().includes('fee')).length}` },
    { id: 'monetary', label: 'Politique Monétaire', icon: <Landmark size={16} /> },
    { id: 'referral', label: 'Programme Parrainage', icon: <Users size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'security', label: 'Sécurité Avancée', icon: <Shield size={16} /> },
    { id: 'api', label: 'Clés API', icon: <Key size={16} />, badge: `${apiKeys.length}` },
    { id: 'system', label: 'Système & Outils', icon: <Cpu size={16} /> },
    { id: 'audit', label: 'Journal d\'Audit', icon: <Activity size={16} />, badge: `${auditLogs.length}` },
  ];

  /* ─── LOADING SCREEN ────────────────────────────────────────── */
  if (loading) return (
    <div className="fixed inset-0 bg-[#070B14] flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border border-[#1a2744]/80" />
          <div className="absolute inset-0 rounded-full border-t-2 border-[#3B82F6] animate-spin" />
          <div className="absolute inset-2 rounded-full border border-[#1a2744]/40" />
          <div className="absolute inset-2 rounded-full border-t border-[#60A5FA]/50 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Settings size={20} className="text-[#3B82F6]" />
          </div>
        </div>
        <p className="text-[10px] font-bold text-[#3B82F6]/60 uppercase tracking-[0.5em]">Chargement du panneau admin</p>
      </div>
    </div>
  );

  const filteredLogs = auditLogs.filter(l =>
    l.adminName?.toLowerCase().includes(searchAudit.toLowerCase()) ||
    l.details?.toLowerCase().includes(searchAudit.toLowerCase())
  );

  /* ─── RENDER ────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#070B14] text-slate-200 flex">
      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside ref={sidebarRef} className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-white/[0.05] bg-[#070B14] sticky top-0 h-screen overflow-hidden shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/[0.05]">
          <button onClick={() => router.push("/admin")} className="flex items-center gap-2 group w-full">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <ArrowLeft size={14} className="text-blue-400 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <div className="text-left">
              <p className="text-[8px] font-bold text-blue-500/70 uppercase tracking-[3px]">PimPay Admin</p>
              <p className="text-[11px] font-bold text-white">Paramètres</p>
            </div>
          </button>
        </div>

        {/* Stats rapides */}
        <div className="px-4 py-4 border-b border-white/[0.05] space-y-2">
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[3px] px-2 mb-3">Statistiques Live</p>
          {[
            { label: 'Utilisateurs', value: stats.totalUsers.toLocaleString(), icon: <Users size={12} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Sessions actives', value: stats.activeSessions.toLocaleString(), icon: <Radio size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Volume Pi 24h', value: stats.piVolume24h.toFixed(2), icon: <TrendingUp size={12} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2">
                <div className={`${s.bg} ${s.color} p-1.5 rounded-lg`}>{s.icon}</div>
                <span className="text-[10px] font-bold text-slate-400">{s.label}</span>
              </div>
              <span className={`text-[11px] font-black ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[3px] px-3 mb-3">Navigation</p>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-left transition-all group
                ${activeSection === item.id
                  ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                  : 'text-slate-500 hover:text-white hover:bg-white/[0.03] border border-transparent'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className={activeSection === item.id ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-300'}>{item.icon}</span>
                <span className="text-[11px] font-bold">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${activeSection === item.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-500'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Version info */}
        <div className="px-5 py-4 border-t border-white/[0.05]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Version</p>
              <p className="text-[11px] font-mono text-white">{config.appVersion || '—'}</p>
            </div>
            <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${config.maintenanceMode ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {config.maintenanceMode ? 'Maintenance' : 'En ligne'}
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 bg-[#070B14]/95 backdrop-blur-xl border-b border-white/[0.05] px-4 py-3 flex items-center justify-between lg:hidden">
          <button onClick={() => router.push("/admin")} className="p-2 bg-white/5 rounded-xl text-white">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setActiveSection(item.id)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wide whitespace-nowrap transition-all ${activeSection === item.id ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500'}`}>
                {item.label.split(' ')[0]}
              </button>
            ))}
          </div>
          <button onClick={loadData} className="p-2 bg-white/5 rounded-xl text-white">
            <RefreshCw size={16} />
          </button>
        </header>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

            {/* ── PAGE HEADER ────────────────────────────────────── */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {navItems.find(n => n.id === activeSection)?.icon && (
                    <span className="text-blue-400">{navItems.find(n => n.id === activeSection)?.icon}</span>
                  )}
                  <h1 className="text-xl font-black text-white tracking-tight">
                    {navItems.find(n => n.id === activeSection)?.label}
                  </h1>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {activeSection === 'overview' && 'Statut global et contrôles principaux du système'}
                  {activeSection === 'fees' && 'Configuration des frais par type de transaction'}
                  {activeSection === 'monetary' && 'Prix, APY, limites et paramètres économiques'}
                  {activeSection === 'referral' && 'Bonus et récompenses du programme de parrainage'}
                  {activeSection === 'notifications' && 'Configuration des alertes email, push et SMS'}
                  {activeSection === 'security' && 'Limites de connexion, 2FA et restrictions géographiques'}
                  {activeSection === 'api' && 'Gestion des clés API et accès développeurs'}
                  {activeSection === 'system' && 'Base de données, backups et optimisation système'}
                  {activeSection === 'audit' && 'Historique complet des actions administratives'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={loadData}
                  className="p-2.5 bg-white/5 border border-white/[0.06] rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                  <RefreshCw size={15} />
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-[11px] uppercase tracking-wide transition-all active:scale-95 shadow-lg shadow-blue-600/20 disabled:opacity-60">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span className="hidden sm:block">{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                </button>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════ */}
            {/* SECTION: OVERVIEW                                   */}
            {/* ════════════════════════════════════════════════════ */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Utilisateurs', value: stats.totalUsers.toLocaleString(), icon: <Users size={18} />, color: 'blue', trend: '+12%' },
                    { label: 'Sessions Actives', value: stats.activeSessions.toLocaleString(), icon: <Activity size={18} />, color: 'emerald', trend: 'En cours' },
                    { label: 'Volume Pi (24h)', value: `${stats.piVolume24h.toFixed(2)} π`, icon: <TrendingUp size={18} />, color: 'amber', trend: '+5.4%' },
                  ].map(card => (
                    <div key={card.label} className={`relative overflow-hidden p-5 rounded-2xl border bg-white/[0.02] border-white/[0.05] group hover:border-white/10 transition-all`}>
                      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10
                        ${card.color === 'blue' ? 'bg-blue-500' : card.color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-2.5 rounded-xl ${card.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : card.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {card.icon}
                        </div>
                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${card.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : card.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {card.trend}
                        </span>
                      </div>
                      <p className="text-2xl font-black text-white mb-1">{card.value}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{card.label}</p>
                    </div>
                  ))}
                </div>

                {/* Mode Toggles */}
                <div>
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Contrôle des Modes Système</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ModeToggleCard
                      title="Mode Maintenance"
                      subtitle="Verrouillage total du réseau"
                      description="Aucun utilisateur ne peut accéder au système. Réservé aux maintenances critiques."
                      active={config.maintenanceMode}
                      toggling={togglingMode === 'maintenanceMode'}
                      onToggle={() => toggleMode('maintenanceMode')}
                      icon={<ShieldAlert size={18} />}
                      color="rose"
                    />
                    <ModeToggleCard
                      title="Mode Coming Soon"
                      subtitle="Page teaser visible"
                      description="Affiche une page de préannonce aux visiteurs avant le lancement officiel."
                      active={config.comingSoonMode}
                      toggling={togglingMode === 'comingSoonMode'}
                      onToggle={() => toggleMode('comingSoonMode')}
                      icon={<Rocket size={18} />}
                      color="blue"
                    />
                  </div>
                </div>

                {/* Broadcast */}
                <div>
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Broadcast Système</h2>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Version App</label>
                        <div className="flex items-center gap-2 bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3">
                          <GitBranch size={13} className="text-slate-500 shrink-0" />
                          <input
                            className="bg-transparent text-white font-mono text-sm outline-none w-full"
                            value={config.appVersion}
                            onChange={e => setConfig({ ...config, appVersion: e.target.value })}
                            placeholder="2.0.0-stable"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Statut Force Update</label>
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, forceUpdate: !config.forceUpdate })}
                          className={`w-full h-[46px] rounded-xl border flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-wider transition-all
                            ${config.forceUpdate ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300'}`}
                        >
                          <Package size={13} />
                          {config.forceUpdate ? 'Force Update — Actif' : 'Mode Update Normal'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Bell size={11} className="text-slate-600" />
                        Annonce Globale (bannière dashboard)
                      </label>
                      <textarea
                        className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500/40 outline-none min-h-[90px] resize-none placeholder-slate-600 transition-colors"
                        placeholder="Message affiché en haut du dashboard pour tous les utilisateurs..."
                        value={config.globalAnnouncement}
                        onChange={e => setConfig({ ...config, globalAnnouncement: e.target.value })}
                      />
                      {config.globalAnnouncement && (
                        <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                          <Info size={12} className="text-blue-400 mt-0.5 shrink-0" />
                          <p className="text-[10px] text-blue-300/70 leading-relaxed">Aperçu: {config.globalAnnouncement}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Actions Rapides</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Base de données', icon: <Database size={16} />, color: 'emerald', action: () => fetchDbInfo() },
                      { label: 'Backup', icon: <Download size={16} />, color: 'amber', action: () => setBackupModal(true) },
                      { label: 'Optimiseur', icon: <Shield size={16} />, color: 'violet', action: () => setOptimizerModal(true) },
                      { label: 'Audit', icon: <Activity size={16} />, color: 'blue', action: () => setActiveSection('audit') },
                    ].map(action => (
                      <button key={action.label} type="button" onClick={action.action}
                        className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all active:scale-95
                          ${action.color === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400 hover:bg-emerald-500/10' :
                            action.color === 'amber' ? 'bg-amber-500/5 border-amber-500/15 text-amber-400 hover:bg-amber-500/10' :
                            action.color === 'violet' ? 'bg-violet-500/5 border-violet-500/15 text-violet-400 hover:bg-violet-500/10' :
                            'bg-blue-500/5 border-blue-500/15 text-blue-400 hover:bg-blue-500/10'}`}>
                        {action.icon}
                        <span className="text-[9px] font-black uppercase tracking-wide">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═════════════════════════���══════════════════════════ */}
            {/* SECTION: FEES                                       */}
            {/* ════════════════════════════════════════════════════ */}
            {activeSection === 'fees' && (
              <div className="space-y-6">
                {/* Tab selector */}
                <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                  {[
                    { id: 'crypto', label: 'Crypto', icon: <CircleDot size={13} />, color: 'amber' },
                    { id: 'fiat', label: 'Fiat', icon: <Landmark size={13} />, color: 'blue' },
                    { id: 'payment', label: 'Paiements', icon: <CreditCard size={13} />, color: 'emerald' },
                  ].map(tab => (
                    <button key={tab.id} type="button" onClick={() => setFeeTab(tab.id as typeof feeTab)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all
                        ${feeTab === tab.id
                          ? tab.color === 'amber' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                          : tab.color === 'blue' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                      {tab.icon}
                      <span className="hidden sm:block">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Fee Summary Banner */}
                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <div className="flex items-center gap-3">
                    <BarChart3 size={14} className="text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-400">Frais global moyen:</span>
                    <span className="text-[11px] font-black text-white">
                      {(((config.transferFee + config.withdrawFee + config.depositCryptoFee + config.exchangeFee) / 4) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                      {feeTab === 'crypto' ? '4 types crypto' : feeTab === 'fiat' ? '5 types fiat' : '4 types paiement'}
                    </span>
                  </div>
                </div>

                {/* Crypto Fees */}
                {feeTab === 'crypto' && (
                  <div className="space-y-3">
                    <FeeRow icon={<ArrowUpDown size={15} />} label="Transfert P2P Crypto" sub="Envoi crypto entre utilisateurs" value={config.transferFee} onChange={v => setConfig({ ...config, transferFee: v })} accent="amber" />
                    <FeeRow icon={<ArrowDownToLine size={15} />} label="Dépôt Crypto" sub="Réception de crypto externe" value={config.depositCryptoFee} onChange={v => setConfig({ ...config, depositCryptoFee: v })} accent="green" />
                    <FeeRow icon={<ArrowUpFromLine size={15} />} label="Retrait Crypto" sub="Envoi vers wallet externe" value={config.withdrawFee} onChange={v => setConfig({ ...config, withdrawFee: v })} accent="orange" />
                    <FeeRow icon={<Repeat size={15} />} label="Swap / Exchange Crypto" sub="Conversion entre cryptomonnaies" value={config.exchangeFee} onChange={v => setConfig({ ...config, exchangeFee: v })} accent="cyan" />
                    <FeeSummary items={[
                      { label: 'P2P', value: config.transferFee, color: 'amber' },
                      { label: 'Dépôt', value: config.depositCryptoFee, color: 'green' },
                      { label: 'Retrait', value: config.withdrawFee, color: 'orange' },
                      { label: 'Swap', value: config.exchangeFee, color: 'cyan' },
                    ]} title="Résumé Crypto" color="amber" />
                  </div>
                )}

                {/* Fiat Fees */}
                {feeTab === 'fiat' && (
                  <div className="space-y-3">
                    <FeeRow icon={<Smartphone size={15} />} label="Dépôt Mobile Money" sub="Orange / MTN / Moov Money" value={config.depositMobileFee} onChange={v => setConfig({ ...config, depositMobileFee: v })} accent="green" />
                    <FeeRow icon={<CreditCard size={15} />} label="Dépôt Carte Bancaire" sub="Visa, Mastercard, etc." value={config.depositCardFee} onChange={v => setConfig({ ...config, depositCardFee: v })} accent="purple" />
                    <FeeRow icon={<Smartphone size={15} />} label="Retrait Mobile Money" sub="Vers numéro mobile" value={config.withdrawMobileFee} onChange={v => setConfig({ ...config, withdrawMobileFee: v })} accent="orange" />
                    <FeeRow icon={<Landmark size={15} />} label="Retrait Bancaire" sub="Vers compte bancaire" value={config.withdrawBankFee} onChange={v => setConfig({ ...config, withdrawBankFee: v })} accent="blue" />
                    <FeeRow icon={<ArrowUpDown size={15} />} label="Transfert Fiat P2P" sub="Envoi XAF/EUR entre utilisateurs" value={config.fiatTransferFee} onChange={v => setConfig({ ...config, fiatTransferFee: v })} accent="emerald" />
                    <FeeSummary items={[
                      { label: 'Mob.Dep', value: config.depositMobileFee, color: 'green' },
                      { label: 'Card', value: config.depositCardFee, color: 'purple' },
                      { label: 'Mob.Ret', value: config.withdrawMobileFee, color: 'orange' },
                      { label: 'Banque', value: config.withdrawBankFee, color: 'blue' },
                      { label: 'P2P', value: config.fiatTransferFee, color: 'emerald' },
                    ]} title="Résumé Fiat" color="blue" />
                  </div>
                )}

                {/* Payment Fees */}
                {feeTab === 'payment' && (
                  <div className="space-y-3">
                    <FeeRow icon={<CreditCard size={15} />} label="Carte Virtuelle" sub="Achats avec carte PimPay" value={config.cardPaymentFee} onChange={v => setConfig({ ...config, cardPaymentFee: v })} accent="pink" />
                    <FeeRow icon={<Landmark size={15} />} label="Paiement Marchand" sub="Paiements aux commerçants" value={config.merchantPaymentFee} onChange={v => setConfig({ ...config, merchantPaymentFee: v })} accent="emerald" />
                    <FeeRow icon={<Zap size={15} />} label="Paiement Factures" sub="Électricité, eau, internet..." value={config.billPaymentFee} onChange={v => setConfig({ ...config, billPaymentFee: v })} accent="amber" />
                    <FeeRow icon={<Eye size={15} />} label="Paiement QR Code" sub="Scan et paiement QR" value={config.qrPaymentFee} onChange={v => setConfig({ ...config, qrPaymentFee: v })} accent="cyan" />
                    <FeeSummary items={[
                      { label: 'Carte', value: config.cardPaymentFee, color: 'pink' },
                      { label: 'Marchand', value: config.merchantPaymentFee, color: 'emerald' },
                      { label: 'Factures', value: config.billPaymentFee, color: 'amber' },
                      { label: 'QR', value: config.qrPaymentFee, color: 'cyan' },
                    ]} title="Résumé Paiements" color="emerald" />
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* SECTION: MONETARY                                   */}
            {/* ════════════════════════════════════════════════════ */}
            {activeSection === 'monetary' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MonetaryCard
                    icon={<Zap size={16} />}
                    label="Prix GCV (USD)"
                    sublabel="Valeur de consensus globale du Pi"
                    value={config.consensusPrice}
                    onChange={v => setConfig({ ...config, consensusPrice: v })}
                    prefix="$"
                    color="amber"
                  />
                  <MonetaryCard
                    icon={<TrendingUp size={16} />}
                    label="Staking APY (%)"
                    sublabel="Taux annuel pour les stakers"
                    value={config.stakingAPY}
                    onChange={v => setConfig({ ...config, stakingAPY: v })}
                    suffix="%"
                    color="emerald"
                  />
                  <MonetaryCard
                    icon={<Wallet size={16} />}
                    label="Frais Global (%)"
                    sublabel="Commission de base sur toutes les transactions"
                    value={config.transactionFee}
                    onChange={v => setConfig({ ...config, transactionFee: v })}
                    suffix="%"
                    color="blue"
                  />
                  <MonetaryCard
                    icon={<AlertTriangle size={16} />}
                    label="Retrait Minimum"
                    sublabel="Montant minimal autorisé par retrait"
                    value={config.minWithdrawal}
                    onChange={v => setConfig({ ...config, minWithdrawal: v })}
                    color="rose"
                  />
                </div>

                {/* Economic Summary */}
                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                  <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Aperçu de la Politique Économique</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'GCV Price', value: `$${config.consensusPrice.toLocaleString()}`, icon: <PieChart size={12} /> },
                      { label: 'APY', value: `${config.stakingAPY}%`, icon: <TrendingUp size={12} /> },
                      { label: 'Frais base', value: `${config.transactionFee}%`, icon: <Hash size={12} /> },
                      { label: 'Min Retrait', value: config.minWithdrawal.toString(), icon: <ArrowDownToLine size={12} /> },
                    ].map(item => (
                      <div key={item.label} className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
                        <div className="flex items-center justify-center gap-1 mb-2 text-slate-500">{item.icon}</div>
                        <p className="text-base font-black text-white">{item.value}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* SECTION: REFERRAL                                   */}
            {/* ════════════════════════════════════════════════════ */}
            {activeSection === 'referral' && (
              <div className="space-y-5">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl flex items-start gap-3">
                  <Info size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-emerald-300/70 leading-relaxed font-medium">
                    Les bonus de parrainage sont attribués en Pi Network après que le filleul a complété son KYC et effectué son premier dépôt. Valeurs exprimées en Pi (π).
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReferralInput
                    label="Bonus Parrain (Pi)"
                    sublabel="Accordé au parrain après KYC + premier dépôt du filleul"
                    value={config.referralBonus}
                    onChange={v => setConfig({ ...config, referralBonus: v })}
                    icon={<Users size={15} />}
                  />
                  <ReferralInput
                    label="Bonus Bienvenue (Pi)"
                    sublabel="Accordé au nouveau filleul après son KYC + premier dépôt"
                    value={config.referralWelcomeBonus}
                    onChange={v => setConfig({ ...config, referralWelcomeBonus: v })}
                    icon={<Zap size={15} />}
                  />
                </div>

                {/* Live preview */}
                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                  <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Simulation Parrainage</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Bonus Parrain', value: config.referralBonus, from: 'Parrain reçoit', color: 'emerald' },
                      { label: 'Bonus Filleul', value: config.referralWelcomeBonus, from: 'Filleul reçoit', color: 'blue' },
                    ].map(item => (
                      <div key={item.label} className={`p-4 rounded-xl border ${item.color === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-blue-500/5 border-blue-500/15'}`}>
                        <p className={`text-[8px] font-bold uppercase tracking-widest mb-2 ${item.color === 'emerald' ? 'text-emerald-500' : 'text-blue-500'}`}>{item.from}</p>
                        <p className={`text-lg font-black ${item.color === 'emerald' ? 'text-emerald-400' : 'text-blue-400'}`}>
                          {Number(item.value).toFixed(10).replace(/\.?0+$/, '')}
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono mt-1">π Pi Network</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">Total par parrainage complété:</span>
                    <span className="text-[11px] font-black text-white font-mono">
                      {(Number(config.referralBonus) + Number(config.referralWelcomeBonus)).toFixed(10).replace(/\.?0+$/, '')} π
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* SECTION: NOTIFICATIONS                              */}
            {/* ════════════════════════════════════════════════════ */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                {/* Channel Toggles */}
                <div>
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Canaux de Notification</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { key: 'emailNotifications', label: 'Email', icon: <Mail size={18} />, color: 'blue' },
                      { key: 'pushNotifications', label: 'Push', icon: <Bell size={18} />, color: 'amber' },
                      { key: 'smsNotifications', label: 'SMS', icon: <MessageSquare size={18} />, color: 'emerald' },
                    ].map(channel => (
                      <button
                        key={channel.key}
                        type="button"
                        onClick={() => setConfig({ ...config, [channel.key]: !config[channel.key as keyof typeof config] })}
                        className={`relative overflow-hidden p-5 rounded-2xl border text-left transition-all active:scale-[0.98]
                          ${config[channel.key as keyof typeof config]
                            ? `bg-${channel.color}-500/10 border-${channel.color}-500/25`
                            : 'bg-white/[0.02] border-white/[0.05] hover:border-white/10'}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2.5 rounded-xl ${config[channel.key as keyof typeof config] ? `bg-${channel.color}-500/15 text-${channel.color}-400` : 'bg-white/5 text-slate-500'}`}>
                            {channel.icon}
                          </div>
                          <div className={`relative w-10 h-5 rounded-full transition-colors ${config[channel.key as keyof typeof config] ? (channel.color === 'blue' ? 'bg-blue-500' : channel.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-700'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${config[channel.key as keyof typeof config] ? 'left-5' : 'left-0.5'}`} />
                          </div>
                        </div>
                        <p className="text-[11px] font-black text-white uppercase tracking-wide">{channel.label}</p>
                        <p className="text-[9px] text-slate-500 mt-1">
                          {channel.key === 'emailNotifications' && 'Alertes par email'}
                          {channel.key === 'pushNotifications' && 'Notifications push app'}
                          {channel.key === 'smsNotifications' && 'Alertes par SMS'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notification Events */}
                <div>
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Événements Déclencheurs</h2>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl divide-y divide-white/[0.04]">
                    {[
                      { key: 'notifyOnLogin', label: 'Connexion', desc: 'Notifier à chaque nouvelle connexion', icon: <LogOut size={14} /> },
                      { key: 'notifyOnTransaction', label: 'Transaction', desc: 'Notifier après chaque transaction', icon: <ArrowUpDown size={14} /> },
                      { key: 'notifyOnWithdrawal', label: 'Retrait', desc: 'Notifier pour chaque demande de retrait', icon: <ArrowUpFromLine size={14} /> },
                      { key: 'notifyOnSuspiciousActivity', label: 'Activité suspecte', desc: 'Alerter en cas de comportement anormal', icon: <AlertTriangle size={14} /> },
                    ].map(event => (
                      <div key={event.key} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white/5 text-slate-400">{event.icon}</div>
                          <div>
                            <p className="text-[11px] font-bold text-white">{event.label}</p>
                            <p className="text-[9px] text-slate-500">{event.desc}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, [event.key]: !config[event.key as keyof typeof config] })}
                          className={`relative w-10 h-5 rounded-full transition-colors ${config[event.key as keyof typeof config] ? 'bg-blue-500' : 'bg-slate-700'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${config[event.key as keyof typeof config] ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Provider Config */}
                <div>
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Fournisseurs</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400"><Mail size={16} /></div>
                        <div>
                          <p className="text-[11px] font-black text-white">Provider Email</p>
                          <p className="text-[9px] text-slate-500">Service d&apos;envoi d&apos;emails</p>
                        </div>
                      </div>
                      <select
                        value={config.emailProvider}
                        onChange={e => setConfig({ ...config, emailProvider: e.target.value })}
                        className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500/40 outline-none"
                      >
                        <option value="sendgrid">SendGrid</option>
                        <option value="mailgun">Mailgun</option>
                        <option value="ses">Amazon SES</option>
                        <option value="postmark">Postmark</option>
                      </select>
                    </div>
                    <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><MessageSquare size={16} /></div>
                        <div>
                          <p className="text-[11px] font-black text-white">Provider SMS</p>
                          <p className="text-[9px] text-slate-500">Service d&apos;envoi SMS</p>
                        </div>
                      </div>
                      <select
                        value={config.smsProvider}
                        onChange={e => setConfig({ ...config, smsProvider: e.target.value })}
                        className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500/40 outline-none"
                      >
                        <option value="twilio">Twilio</option>
                        <option value="nexmo">Vonage (Nexmo)</option>
                        <option value="messagebird">MessageBird</option>
                        <option value="sns">Amazon SNS</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Test Notification */}
                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400"><Send size={16} /></div>
                      <div>
                        <p className="text-[11px] font-black text-white">Tester les Notifications</p>
                        <p className="text-[9px] text-slate-500">Envoyer une notification de test aux admins</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toast.success('Notification de test envoyée!')}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-bold text-[10px] uppercase tracking-wide transition-all active:scale-95"
                    >
                      <Send size={12} className="inline mr-1" /> Envoyer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* SECTION: SECURITY                                   */}
            {/* ════════════════════════════════════════════════════ */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                {/* Login Security */}
                <div>
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Sécurité Connexion</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400"><Ban size={16} /></div>
                        <div>
                          <p className="text-[11px] font-black text-white">Tentatives Max</p>
                          <p className="text-[9px] text-slate-500">Avant verrouillage</p>
                        </div>
                      </div>
                      <input
                        type="number" min="1" max="10"
                        value={config.maxLoginAttempts}
                        onChange={e => setConfig({ ...config, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                        className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-rose-500/40 outline-none"
                      />
                    </div>
                    <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><Timer size={16} /></div>
                        <div>
                          <p className="text-[11px] font-black text-white">Durée Verrouillage</p>
                          <p className="text-[9px] text-slate-500">En minutes</p>
                        </div>
                      </div>
                      <input
                        type="number" min="5" max="1440"
                        value={config.lockoutDuration}
                        onChange={e => setConfig({ ...config, lockoutDuration: parseInt(e.target.value) || 30 })}
                        className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-amber-500/40 outline-none"
                      />
                    </div>
                    <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400"><Clock size={16} /></div>
                        <div>
                          <p className="text-[11px] font-black text-white">Session Timeout</p>
                          <p className="text-[9px] text-slate-500">En minutes</p>
                        </div>
                      </div>
                      <input
                        type="number" min="5" max="1440"
                        value={config.sessionTimeout}
                        onChange={e => setConfig({ ...config, sessionTimeout: parseInt(e.target.value) || 60 })}
                        className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-blue-500/40 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2FA Toggle */}
                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400"><Fingerprint size={18} /></div>
                      <div>
                        <p className="text-[11px] font-black text-white">Authentification à deux facteurs obligatoire</p>
                        <p className="text-[9px] text-slate-500">Forcer tous les utilisateurs à activer le 2FA</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, requireTwoFactor: !config.requireTwoFactor })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${config.requireTwoFactor ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${config.requireTwoFactor ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>

                {/* Rate Limiting */}
                <div>
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Rate Limiting</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400"><Gauge size={16} /></div>
                        <div>
                          <p className="text-[11px] font-black text-white">Limite Requêtes</p>
                          <p className="text-[9px] text-slate-500">Requêtes max par fenêtre</p>
                        </div>
                      </div>
                      <input
                        type="number" min="10" max="1000"
                        value={config.rateLimit}
                        onChange={e => setConfig({ ...config, rateLimit: parseInt(e.target.value) || 100 })}
                        className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-cyan-500/40 outline-none"
                      />
                    </div>
                    <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400"><Timer size={16} /></div>
                        <div>
                          <p className="text-[11px] font-black text-white">Fenêtre (sec)</p>
                          <p className="text-[9px] text-slate-500">Période de rate limit</p>
                        </div>
                      </div>
                      <input
                        type="number" min="10" max="3600"
                        value={config.rateLimitWindow}
                        onChange={e => setConfig({ ...config, rateLimitWindow: parseInt(e.target.value) || 60 })}
                        className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-violet-500/40 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Geo Blocking */}
                <div>
                  <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Restrictions Géographiques</h2>
                  <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400"><Globe2 size={18} /></div>
                        <div>
                          <p className="text-[11px] font-black text-white">Activer le Geo-blocking</p>
                          <p className="text-[9px] text-slate-500">Bloquer l&apos;accès depuis certains pays</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, geoBlocking: !config.geoBlocking })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${config.geoBlocking ? 'bg-rose-500' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${config.geoBlocking ? 'left-6' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {config.geoBlocking && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Pays bloqués (codes ISO, séparés par virgule)</label>
                        <input
                          type="text"
                          placeholder="KP, IR, SY, CU..."
                          value={config.blockedCountries}
                          onChange={e => setConfig({ ...config, blockedCountries: e.target.value })}
                          className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm focus:border-rose-500/40 outline-none placeholder-slate-600"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* IP Whitelist */}
                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400"><Server size={18} /></div>
                    <div>
                      <p className="text-[11px] font-black text-white">Whitelist IP Admin</p>
                      <p className="text-[9px] text-slate-500">IPs autorisées pour l&apos;accès admin (séparées par virgule)</p>
                    </div>
                  </div>
                  <textarea
                    placeholder="192.168.1.1, 10.0.0.1/24..."
                    value={config.ipWhitelist}
                    onChange={e => setConfig({ ...config, ipWhitelist: e.target.value })}
                    className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500/40 outline-none min-h-[80px] resize-none placeholder-slate-600"
                  />
                </div>

                {/* Active Sessions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px]">Sessions Actives</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSessions([]);
                        toast.success('Toutes les sessions ont été terminées');
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-[9px] font-bold uppercase tracking-wide hover:bg-rose-500/20 transition-all"
                    >
                      <Power size={10} /> Tout déconnecter
                    </button>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl divide-y divide-white/[0.04]">
                    {activeSessions.length > 0 ? activeSessions.map(session => (
                      <div key={session.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400"><MonitorSmartphone size={14} /></div>
                          <div>
                            <p className="text-[11px] font-bold text-white">{session.device}</p>
                            <p className="text-[9px] text-slate-500">{session.ip} - {session.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-slate-500">{session.lastActive}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTerminatingSession(session.id);
                              setTimeout(() => {
                                setActiveSessions(prev => prev.filter(s => s.id !== session.id));
                                setTerminatingSession(null);
                                toast.success('Session terminée');
                              }, 500);
                            }}
                            disabled={terminatingSession === session.id}
                            className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                          >
                            {terminatingSession === session.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-600">
                        <MonitorSmartphone size={24} className="mx-auto mb-2 opacity-30" />
                        <p className="text-[10px] font-bold">Aucune session active</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* SECTION: API KEYS                                   */}
            {/* ════════════════════════════════════════════════════ */}
            {activeSection === 'api' && (
              <div className="space-y-6">
                {/* Info Banner */}
                <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-start gap-3">
                  <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-amber-300/70 leading-relaxed font-medium">
                    Les clés API permettent aux développeurs d&apos;accéder aux fonctionnalités de PimPay. Gardez vos clés secrètes et ne les partagez jamais publiquement.
                  </p>
                </div>

                {/* API Keys List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px]">Clés API</h2>
                    <button
                      type="button"
                      onClick={() => {
                        const newKey = {
                          id: Date.now().toString(),
                          name: 'Nouvelle Clé API',
                          key: `pk_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`,
                          lastUsed: 'Jamais',
                          active: true
                        };
                        setApiKeys([...apiKeys, newKey]);
                        toast.success('Nouvelle clé API créée');
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-[9px] font-bold uppercase tracking-wide transition-all"
                    >
                      <Plus size={10} /> Nouvelle Clé
                    </button>
                  </div>
                  <div className="space-y-3">
                    {apiKeys.map(apiKey => (
                      <div key={apiKey.id} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:border-white/10 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${apiKey.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'}`}>
                              <Key size={14} />
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-white">{apiKey.name}</p>
                              <p className="text-[9px] text-slate-500">Dernière utilisation: {apiKey.lastUsed}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-black px-2 py-1 rounded-lg ${apiKey.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'}`}>
                              {apiKey.active ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5">
                          <input
                            type={showApiKey === apiKey.id ? 'text' : 'password'}
                            value={apiKey.key}
                            readOnly
                            className="flex-1 bg-transparent text-white font-mono text-[11px] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)}
                            className="p-1.5 text-slate-400 hover:text-white transition-colors"
                          >
                            {showApiKey === apiKey.id ? <EyeOff size={12} /> : <EyeIcon size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(apiKey.key);
                              toast.success('Clé copiée!');
                            }}
                            className="p-1.5 text-slate-400 hover:text-white transition-colors"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setApiKeys(apiKeys.map(k => k.id === apiKey.id ? { ...k, active: !k.active } : k));
                              toast.success(apiKey.active ? 'Clé désactivée' : 'Clé activée');
                            }}
                            className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all ${apiKey.active ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                          >
                            {apiKey.active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newKey = `pk_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
                              setApiKeys(apiKeys.map(k => k.id === apiKey.id ? { ...k, key: newKey } : k));
                              toast.success('Clé régénérée');
                            }}
                            className="flex-1 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase tracking-wide hover:bg-blue-500/20 transition-all"
                          >
                            <RefreshCcw size={10} className="inline mr-1" /> Régénérer
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setApiKeys(apiKeys.filter(k => k.id !== apiKey.id));
                              toast.success('Clé supprimée');
                            }}
                            className="py-2 px-3 rounded-lg bg-rose-500/10 text-rose-400 text-[9px] font-bold uppercase tracking-wide hover:bg-rose-500/20 transition-all"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* API Stats */}
                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                  <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Statistiques API</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Requêtes (24h)', value: '12,458', color: 'blue' },
                      { label: 'Taux de succès', value: '99.8%', color: 'emerald' },
                      { label: 'Latence moy.', value: '45ms', color: 'amber' },
                      { label: 'Erreurs', value: '23', color: 'rose' },
                    ].map(stat => (
                      <div key={stat.label} className={`p-3 rounded-xl bg-${stat.color}-500/5 border border-${stat.color}-500/15`}>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                        <p className={`text-lg font-black text-${stat.color}-400 mt-1`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Webhooks */}
                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400"><Wifi size={16} /></div>
                      <div>
                        <p className="text-[11px] font-black text-white">Webhooks</p>
                        <p className="text-[9px] text-slate-500">Recevoir des notifications en temps réel</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-black px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400">Bientôt</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Configurez des webhooks pour recevoir des notifications automatiques lors d&apos;événements importants (transactions, inscriptions, etc.)</p>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* SECTION: SYSTEM                                     */}
            {/* ════════════════════════════════════════════════════ */}
            {activeSection === 'system' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <SystemToolCard
                    icon={<Database size={20} />}
                    label="Base de Données"
                    description="Tables, lignes, historique backups"
                    color="emerald"
                    onClick={fetchDbInfo}
                  />
                  <SystemToolCard
                    icon={<Download size={20} />}
                    label="Backup Manuel"
                    description="Exporter toute la configuration et données"
                    color="amber"
                    onClick={() => setBackupModal(true)}
                  />
                  <SystemToolCard
                    icon={<Shield size={20} />}
                    label="Optimiseur Système"
                    description="Sécurité, vulnérabilités et performances"
                    color="violet"
                    onClick={() => setOptimizerModal(true)}
                  />
                </div>

                {/* System Info */}
                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                  <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-[3px] mb-4">Informations Système</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Runtime', value: 'Next.js 14 (App Router)', icon: <Server size={12} /> },
                      { label: 'Base de données', value: 'PostgreSQL (Neon)', icon: <Database size={12} /> },
                      { label: 'Version déployée', value: config.appVersion || '—', icon: <GitBranch size={12} /> },
                      { label: 'Mode actuel', value: config.maintenanceMode ? 'Maintenance' : config.comingSoonMode ? 'Coming Soon' : 'Production', icon: <Radio size={12} /> },
                      { label: 'Force Update', value: config.forceUpdate ? 'Activé' : 'Désactivé', icon: <Package size={12} /> },
                    ].map(info => (
                      <div key={info.label} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                        <div className="flex items-center gap-2 text-slate-500">
                          {info.icon}
                          <span className="text-[10px] font-bold">{info.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-300">{info.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* SECTION: AUDIT                                      */}
            {/* ════════════════════════════════════════════════════ */}
            {activeSection === 'audit' && (
              <div className="space-y-4">
                {/* Search & Filter bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5">
                    <Search size={13} className="text-slate-500 shrink-0" />
                    <input
                      className="bg-transparent text-white text-[11px] outline-none flex-1 placeholder-slate-600"
                      placeholder="Rechercher un admin, une action..."
                      value={searchAudit}
                      onChange={e => setSearchAudit(e.target.value)}
                    />
                    {searchAudit && (
                      <button type="button" onClick={() => setSearchAudit('')} className="text-slate-500 hover:text-white">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-slate-500 text-[10px] font-bold">
                    <Filter size={12} />
                    <span>{filteredLogs.length} entrées</span>
                  </div>
                </div>

                {/* Audit Logs */}
                <div className="space-y-2">
                  {(showAllAudit ? filteredLogs : filteredLogs.slice(0, 8)).map((log, i) => (
                    <button
                      key={log.id || i}
                      type="button"
                      onClick={() => setSelectedAuditLog(log)}
                      className="w-full flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-[11px] font-black text-blue-400 shrink-0">
                        {log.adminName?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-bold text-white">{log.adminName || 'Admin'}</p>
                          {log.action && (
                            <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 text-slate-500 border border-white/5">{log.action}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">{log.details || '—'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right shrink-0">
                          <p className="text-[9px] font-mono text-slate-500 group-hover:text-slate-300 transition-colors">
                            {new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-[8px] text-slate-600">
                            {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <ExternalLink size={12} className="text-slate-600 group-hover:text-blue-400 transition-colors shrink-0" />
                      </div>
                    </button>
                  ))}
                  {filteredLogs.length === 0 && (
                    <div className="text-center py-16 text-slate-600">
                      <RotateCcw size={24} className="mx-auto mb-3 opacity-30" />
                      <p className="text-[10px] font-bold uppercase tracking-wide">Aucun log trouvé</p>
                    </div>
                  )}
                  {filteredLogs.length > 8 && (
                    <button type="button" onClick={() => setShowAllAudit(!showAllAudit)}
                      className="w-full py-3 border border-white/[0.06] rounded-xl text-[10px] font-bold text-slate-500 hover:text-white hover:border-white/10 transition-all flex items-center justify-center gap-2">
                      <ChevronDown size={13} className={`transition-transform ${showAllAudit ? 'rotate-180' : ''}`} />
                      {showAllAudit ? 'Voir moins' : `Voir ${filteredLogs.length - 8} entrées de plus`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: DATABASE                                         */}
      {/* ════════════════════════════════════════════════════════ */}
      {dbModal && (
        <Modal onClose={() => setDbModal(false)}>
          <div className="p-6 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Database size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">Base de Données</h2>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{dbData?.dbProvider || 'PostgreSQL'}</p>
                </div>
              </div>
              <button onClick={() => setDbModal(false)} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"><X size={15} /></button>
            </div>
            {dbData && (
              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  { label: 'Tables', value: dbData.totalTables, color: 'text-white' },
                  { label: 'Lignes totales', value: dbData.totalRows?.toLocaleString(), color: 'text-emerald-400' },
                  { label: 'Backups', value: dbData.backups?.length || 0, color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-3 text-center">
                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                    <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 overflow-y-auto max-h-[55vh]">
            {dbLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 size={22} className="text-emerald-500 animate-spin mb-3" />
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Connexion en cours...</p>
              </div>
            ) : dbData ? (
              <div className="space-y-6">
<div>
                                  <p className="text-[8px] font-bold text-blue-400 uppercase tracking-[3px] mb-3">Tables ({dbData.tables?.length}) - Cliquez pour voir les données</p>
                                  <div className="space-y-1.5">
                                    {dbData.tables?.map((table) => (
                                      <button
                                        key={table.name}
                                        type="button"
                                        onClick={() => openTableDetails(table)}
                                        className="w-full flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                            <DbIcon name={table.icon} />
                                          </div>
                                          <p className="text-[10px] font-bold text-white uppercase">{table.name}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-black text-white">{table.rows.toLocaleString()}</span>
                                            <span className="text-[8px] font-bold text-slate-500">rows</span>
                                          </div>
                                          <ChevronRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                <div>
                  <p className="text-[8px] font-bold text-blue-400 uppercase tracking-[3px] mb-3">Historique Backups</p>
                  {(dbData.backups?.length ?? 0) > 0 ? (
                    <div className="space-y-1.5">
                      {dbData.backups?.map((bk) => (
                        <div key={bk.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${bk.details?.includes("Cron") ? "bg-blue-500/10" : "bg-amber-500/10"}`}>
                            {bk.details?.includes("Cron") ? <Clock size={11} className="text-blue-400" /> : <Download size={11} className="text-amber-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-white">{bk.details?.includes("Cron") ? "Backup Auto" : "Backup Manuel"}</p>
                            <p className="text-[8px] text-slate-500 truncate">Par {bk.adminName || "Système"}</p>
                          </div>
                          <span className="text-[8px] font-mono text-slate-500">{new Date(bk.createdAt).toLocaleDateString("fr-FR")}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-600">
                      <HardDrive size={20} className="mx-auto mb-2 opacity-30" />
                      <p className="text-[9px] font-bold uppercase tracking-wide">Aucun backup</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: TABLE DETAILS (CRUD)                             */}
      {/* ════════════════════════════════════════════════════════ */}
      {selectedTable && (
        <Modal onClose={() => { setSelectedTable(null); setEditingRecord(null); setAddingRecord(false); }} wide>
          <div className="p-5 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedTable(null); setEditingRecord(null); setAddingRecord(false); }}
                  className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Table size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase">{selectedTable.name}</h2>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{selectedTable.rows} enregistrements</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setAddingRecord(true); setNewRecord({}); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-[9px] font-bold uppercase tracking-wide transition-all"
              >
                <Plus size={12} /> Ajouter
              </button>
            </div>
          </div>
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {tableLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 size={22} className="text-emerald-500 animate-spin mb-3" />
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Chargement des données...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Add new record form */}
                {addingRecord && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wide">Nouvel Enregistrement</p>
                      <button type="button" onClick={() => { setAddingRecord(false); setNewRecord({}); }} className="text-slate-500 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {tableRecords[0] && Object.keys(tableRecords[0]).filter(k => k !== 'id' && k !== 'createdAt').map(key => (
                        <div key={key}>
                          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{key}</label>
                          <input
                            type="text"
                            value={newRecord[key] || ''}
                            onChange={e => setNewRecord({ ...newRecord, [key]: e.target.value })}
                            className="w-full bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2 text-white text-[11px] focus:border-emerald-500/40 outline-none mt-1"
                            placeholder={`Entrer ${key}...`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => { setAddingRecord(false); setNewRecord({}); }}
                        className="flex-1 py-2 rounded-lg bg-white/5 text-slate-400 text-[9px] font-bold uppercase tracking-wide hover:bg-white/10 transition-all"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveRecord}
                        disabled={savingRecord}
                        className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wide hover:bg-emerald-500 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {savingRecord ? <Loader2 size={12} className="animate-spin" /> : <><Save size={12} /> Sauvegarder</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Records list */}
                {tableRecords.map((record) => (
                  <div
                    key={String(record.id)}
                    className={`p-4 rounded-2xl border transition-all ${editingRecord?.id === record.id ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/[0.02] border-white/[0.04] hover:border-white/10'}`}
                  >
                    {editingRecord?.id === record.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-wide">Mode Édition</p>
                          <button type="button" onClick={() => setEditingRecord(null)} className="text-slate-500 hover:text-white">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(editingRecord).filter(([k]) => k !== 'id').map(([key, value]) => (
                            <div key={key}>
                              <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{key}</label>
                              <input
                                type="text"
                                value={String(value)}
                                onChange={e => setEditingRecord({ ...editingRecord, [key]: e.target.value })}
                                className="w-full bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2 text-white text-[11px] focus:border-blue-500/40 outline-none mt-1"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingRecord(null)}
                            className="flex-1 py-2 rounded-lg bg-white/5 text-slate-400 text-[9px] font-bold uppercase tracking-wide hover:bg-white/10 transition-all"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveRecord}
                            disabled={savingRecord}
                            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wide hover:bg-blue-500 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            {savingRecord ? <Loader2 size={12} className="animate-spin" /> : <><Save size={12} /> Sauvegarder</>}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <Hash size={12} className="text-blue-400" />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-white font-mono">ID: {String(record.id)}</p>
                              <p className="text-[8px] text-slate-500">{record.createdAt ? `Créé le ${String(record.createdAt)}` : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingRecord(record)}
                              className="p-2 bg-blue-500/10 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-all"
                              title="Modifier"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(String(record.id))}
                              disabled={deletingRecordId === String(record.id)}
                              className="p-2 bg-rose-500/10 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                              title="Supprimer"
                            >
                              {deletingRecordId === String(record.id) ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(record).filter(([k]) => k !== 'id' && k !== 'createdAt').map(([key, value]) => (
                            <div key={key} className="bg-black/20 rounded-lg px-3 py-2">
                              <p className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">{key}</p>
                              <p className="text-[10px] font-bold text-white truncate mt-0.5">
                                {typeof value === 'boolean' ? (
                                  <span className={value ? 'text-emerald-400' : 'text-rose-400'}>{value ? 'Oui' : 'Non'}</span>
                                ) : (
                                  String(value)
                                )}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {tableRecords.length === 0 && !tableLoading && (
                  <div className="text-center py-16 text-slate-600">
                    <Table size={24} className="mx-auto mb-3 opacity-30" />
                    <p className="text-[10px] font-bold uppercase tracking-wide">Aucun enregistrement</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: AUDIT LOG DETAILS                                */}
      {/* ════════════════════════════════════════════════════════ */}
      {selectedAuditLog && (
        <Modal onClose={() => setSelectedAuditLog(null)}>
          <div className="p-6 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg font-black text-blue-400">
                  {selectedAuditLog.adminName?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">{selectedAuditLog.adminName || 'Administrateur'}</h2>
                  <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Détails de l&apos;action</p>
                </div>
              </div>
              <button onClick={() => setSelectedAuditLog(null)} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {/* Action type */}
            {selectedAuditLog.action && (
              <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Activity size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Type d&apos;action</p>
                    <p className="text-[12px] font-black text-white uppercase">{selectedAuditLog.action}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Details */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                  <FileText size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-2">Description</p>
                  <p className="text-[11px] text-white leading-relaxed font-mono bg-black/30 p-3 rounded-lg break-all">
                    {selectedAuditLog.details || 'Aucune description disponible'}
                  </p>
                </div>
              </div>
            </div>

            {/* Admin info */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <User size={16} />
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Administrateur</p>
                  <p className="text-[12px] font-black text-white">{selectedAuditLog.adminName || 'Non spécifié'}</p>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Date</p>
                    <p className="text-[11px] font-black text-white">
                      {new Date(selectedAuditLog.createdAt).toLocaleDateString('fr-FR', { 
                        day: '2-digit', month: 'long', year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Heure</p>
                    <p className="text-[11px] font-black text-white">
                      {new Date(selectedAuditLog.createdAt).toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', minute: '2-digit', second: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Log ID */}
            <div className="p-3 bg-black/30 border border-white/[0.04] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash size={12} className="text-slate-600" />
                <span className="text-[9px] font-mono text-slate-500">ID: {selectedAuditLog.id}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedAuditLog.id);
                  toast.success('ID copié!');
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: BACKUP                                           */}
      {/* ════════════════════════════════════════════════════════ */}
      {backupModal && (
        <Modal onClose={() => !backupRunning && setBackupModal(false)}>
          <div className="p-6 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Download size={18} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">Backup Manuel</h2>
                  <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Export Complet</p>
                </div>
              </div>
              <button disabled={backupRunning} onClick={() => setBackupModal(false)} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors disabled:opacity-30"><X size={15} /></button>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Cette action exportera toutes les données (utilisateurs, transactions, configurations, logs) dans un fichier JSON chiffré.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Données incluses</p>
              <div className="grid grid-cols-2 gap-2">
                {["Utilisateurs", "Configurations", "Logs Audit", "Transactions"].map(item => (
                  <div key={item} className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-white">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBackupSendEmail(!backupSendEmail)}
              className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${backupSendEmail ? 'bg-blue-500/10 border-blue-500/25' : 'bg-white/[0.02] border-white/[0.06]'}`}
            >
              <div className="flex items-center gap-3">
                <Mail size={14} className={backupSendEmail ? 'text-blue-400' : 'text-slate-500'} />
                <div className="text-left">
                  <p className="text-[10px] font-bold text-white">Envoyer par Email</p>
                  <p className="text-[8px] text-slate-500">Recevoir le backup par email</p>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full relative transition-colors ${backupSendEmail ? 'bg-blue-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${backupSendEmail ? 'left-5' : 'left-1'}`} />
              </div>
            </button>
            <div className="flex gap-3">
              <button type="button" disabled={backupRunning} onClick={() => setBackupModal(false)}
                className="flex-1 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 font-bold text-[10px] uppercase tracking-wide hover:bg-white/8 transition-all disabled:opacity-40">
                Annuler
              </button>
              <button type="button" onClick={runBackup} disabled={backupRunning}
                className="flex-1 h-12 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 disabled:opacity-60">
                {backupRunning ? <><Loader2 size={13} className="animate-spin" /><span>En cours...</span></> : <><Download size={13} /><span>Lancer</span></>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: SYSTEM OPTIMIZER                                 */}
      {/* ════════════════════════════════════════════════════════ */}
      {optimizerModal && (
        <Modal onClose={() => !optimizing && setOptimizerModal(false)} wide>
          <div className="p-6 border-b border-white/[0.06] bg-gradient-to-r from-violet-600/5 via-transparent to-fuchsia-600/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/25 flex items-center justify-center">
                  <Shield size={20} className="text-violet-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center">
                    <Wrench size={8} className="text-fuchsia-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">System Optimizer</h2>
                  <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">Sécurité & Performance Protocol</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {optimizationResults?.scanComplete && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black ${
                    optimizationResults.overallScore >= 90 ? 'bg-emerald-500/10 text-emerald-400' :
                    optimizationResults.overallScore >= 70 ? 'bg-amber-500/10 text-amber-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    <span>{optimizationResults.overallScore}/100</span>
                  </div>
                )}
                <button disabled={optimizing} onClick={() => { setOptimizerModal(false); setOptimizationResults(null); }}
                  className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors disabled:opacity-30"><X size={15} /></button>
              </div>
            </div>

            {/* Score Ring */}
            {optimizationResults?.scanComplete && (
              <div className={`mt-4 flex items-center gap-4 p-4 rounded-xl transition-all ${
                optimizationResults.overallScore >= 90 ? 'bg-emerald-500/5 border border-emerald-500/15' :
                optimizationResults.overallScore >= 70 ? 'bg-amber-500/5 border border-amber-500/15' :
                'bg-red-500/5 border border-red-500/15'
              }`}>
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-slate-800" />
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"
                      className={optimizationResults.overallScore >= 90 ? 'text-emerald-500' : optimizationResults.overallScore >= 70 ? 'text-amber-500' : 'text-red-500'}
                      strokeDasharray={`${(optimizationResults.overallScore / 100) * 175.9} 175.9`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-base font-black ${optimizationResults.overallScore >= 90 ? 'text-emerald-400' : optimizationResults.overallScore >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                      {optimizationResults.overallScore}
                    </span>
                  </div>
                </div>
                <div>
                  <p className={`text-sm font-black ${optimizationResults.overallScore >= 90 ? 'text-emerald-400' : optimizationResults.overallScore >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                    {optimizationResults.overallScore >= 90 ? 'Système Optimisé' : optimizationResults.overallScore >= 70 ? 'Optimisation Partielle' : 'Actions Requises'}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {optimizationResults.vulnerabilities.filter(v => v.status === 'fixed').length}/{optimizationResults.vulnerabilities.length} vulnérabilités corrigées
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="p-5 overflow-y-auto max-h-[60vh]">
            {!optimizationResults ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 p-4 bg-violet-500/5 border border-violet-500/15 rounded-xl">
                  <Shield size={14} className="text-violet-400 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Analyse complète: vulnérabilités de sécurité, optimisation de la base de données, nettoyage du cache et amélioration des temps de réponse.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { icon: <Bug size={12} />, label: "Scan Vulnérabilités", color: "text-red-400" },
                    { icon: <Lock size={12} />, label: "Renforcement Sécurité", color: "text-amber-400" },
                    { icon: <Server size={12} />, label: "Optimisation Serveur", color: "text-blue-400" },
                    { icon: <Database size={12} />, label: "Nettoyage DB", color: "text-emerald-400" },
                    { icon: <Gauge size={12} />, label: "Boost Performance", color: "text-cyan-400" },
                    { icon: <Wifi size={12} />, label: "Optimisation API", color: "text-purple-400" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      <span className={item.color}>{item.icon}</span>
                      <span className="text-[9px] font-bold text-white">{item.label}</span>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={runSystemOptimizer}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20">
                  <Zap size={16} />
                  <span>Lancer l&apos;Optimisation Globale</span>
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Vulnerabilities */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield size={13} className="text-red-400" />
                      <p className="text-[8px] font-bold text-red-400 uppercase tracking-[3px]">Vulnérabilités Sécurité</p>
                    </div>
                    <span className="text-[8px] text-slate-500">{optimizationResults.vulnerabilities.filter(v => v.status === 'fixed').length}/{optimizationResults.vulnerabilities.length} corrigées</span>
                  </div>
                  <div className="space-y-2">
                    {optimizationResults.vulnerabilities.map((vuln, i) => (
                      <div key={i} className={`p-4 border rounded-xl transition-all ${vuln.status === 'fixed' ? 'border-emerald-500/20 bg-emerald-500/3' : vuln.status === 'scanning' ? 'border-amber-500/20' : 'border-red-500/10 bg-white/[0.01]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                              vuln.severity === 'critical' ? 'bg-red-500/10' : vuln.severity === 'high' ? 'bg-orange-500/10' : 'bg-amber-500/10'
                            }`}>
                              {vuln.status === 'fixed' ? <CheckCircle2 size={14} className="text-emerald-400" /> :
                               vuln.status === 'scanning' ? <Loader2 size={14} className="text-amber-400 animate-spin" /> :
                               <FileWarning size={14} className={vuln.severity === 'critical' ? 'text-red-400' : 'text-orange-400'} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="text-[10px] font-black text-white">{vuln.name}</p>
                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded ${
                                  vuln.severity === 'critical' ? 'bg-red-500/10 text-red-400' : vuln.severity === 'high' ? 'bg-orange-500/10 text-orange-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>{vuln.severity}</span>
                              </div>
                              <p className="text-[9px] text-slate-500">{vuln.description}</p>
                              {vuln.currentVersion && vuln.patchedVersion && vuln.status !== 'fixed' && (
                                <div className="flex items-center gap-1.5 mt-2">
                                  <span className="text-[8px] font-mono text-red-400 bg-red-500/8 px-1.5 py-0.5 rounded">v{vuln.currentVersion}</span>
                                  <ChevronRight size={9} className="text-slate-600" />
                                  <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/8 px-1.5 py-0.5 rounded">{vuln.patchedVersion}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            {vuln.status === 'fixed' ? (
                              <span className="text-[8px] font-black px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">Corrigé</span>
                            ) : vuln.status === 'pending' && vuln.category === 'package' ? (
                              <button type="button" onClick={() => applyPatch(vuln.name)} disabled={patchingItem === vuln.name}
                                className="flex items-center gap-1 text-[8px] font-black px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50">
                                {patchingItem === vuln.name ? <><Loader2 size={9} className="animate-spin" /><span>...</span></> : <><Wrench size={9} /><span>Patch</span></>}
                              </button>
                            ) : vuln.status === 'pending' ? (
                              <span className="text-[8px] font-black px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400">Requis</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Gauge size={13} className="text-cyan-400" />
                    <p className="text-[8px] font-bold text-cyan-400 uppercase tracking-[3px]">Optimisations Performance</p>
                  </div>
                  <div className="space-y-2">
                    {optimizationResults.performance.map((perf, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 border rounded-xl transition-all ${perf.status === 'optimized' ? 'border-cyan-500/20' : perf.status === 'scanning' ? 'border-blue-500/20' : 'border-white/[0.04]'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                            {perf.status === 'optimized' ? <CheckCircle2 size={12} className="text-cyan-400" /> :
                             perf.status === 'scanning' ? <Loader2 size={12} className="text-blue-400 animate-spin" /> :
                             <Gauge size={12} className="text-cyan-400" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-white">{perf.name}</p>
                            <p className="text-[8px] text-slate-500">{perf.description}</p>
                          </div>
                        </div>
                        {perf.status === 'optimized' && (
                          <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${perf.improvement.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                            {perf.improvement}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {optimizationResults.scanComplete && (
                  <button type="button" onClick={() => { setOptimizerModal(false); setOptimizationResults(null); }}
                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                    <CheckCircle2 size={14} />
                    <span>Terminé — Fermer</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── SUB-COMPONENTS ─────────────────────────────────────────── */

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className={`bg-[#0D1525] border border-white/[0.07] rounded-t-3xl sm:rounded-2xl w-full shadow-2xl overflow-hidden ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[92vh]`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModeToggleCard({ title, subtitle, description, active, toggling, onToggle, icon, color }: {
  title: string; subtitle: string; description: string;
  active: boolean; toggling: boolean; onToggle: () => void;
  icon: React.ReactNode; color: 'rose' | 'blue';
}) {
  const c = {
    rose: { bg: 'bg-rose-500/8 border-rose-500/25', icon: 'bg-rose-500/15 text-rose-400', badge: 'bg-rose-500/15 border-rose-500/25 text-rose-400', glow: 'bg-rose-500' },
    blue: { bg: 'bg-blue-500/8 border-blue-500/25', icon: 'bg-blue-500/15 text-blue-400', badge: 'bg-blue-500/15 border-blue-500/25 text-blue-400', glow: 'bg-blue-500' },
  }[color];

  return (
    <button type="button" disabled={toggling} onClick={onToggle}
      className={`relative overflow-hidden p-5 rounded-2xl border text-left w-full transition-all active:scale-[0.98]
        ${active ? c.bg : 'bg-white/[0.02] border-white/[0.05] hover:border-white/10'}`}>
      {active && <div className={`absolute top-0 right-0 w-20 h-20 ${c.glow} opacity-10 blur-2xl rounded-full`} />}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-xl transition-colors ${active ? c.icon : 'bg-white/5 text-slate-500'}`}>
          {toggling ? <Loader2 size={16} className="animate-spin" /> : icon}
        </div>
        <div className={`relative w-10 h-5 rounded-full transition-colors ${active ? (color === 'rose' ? 'bg-rose-500' : 'bg-blue-500') : 'bg-slate-700'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${active ? 'left-5' : 'left-0.5'}`} />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[11px] font-black text-white uppercase tracking-wide">{title}</h3>
          {active && <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full border uppercase ${c.badge}`}>Actif</span>}
        </div>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">{subtitle}</p>
        <p className="text-[9px] text-slate-600 mt-2 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}

function FeeRow({ icon, label, sub, value, onChange, accent }: {
  icon: React.ReactNode; label: string; sub: string;
  value: number; onChange: (v: number) => void; accent: string;
}) {
  const accentClass: Record<string, string> = {
    amber: 'text-amber-400', green: 'text-green-400', orange: 'text-orange-400',
    cyan: 'text-cyan-400', blue: 'text-blue-400', purple: 'text-purple-400',
    pink: 'text-pink-400', emerald: 'text-emerald-400',
  };
  const pct = (value * 100).toFixed(2);
  const barWidth = Math.min(value * 1000, 100);

  return (
    <div className="group p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`${accentClass[accent] || 'text-blue-400'}`}>{icon}</span>
          <div>
            <p className="text-[11px] font-bold text-white">{label}</p>
            <p className="text-[9px] text-slate-500">{sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" step="0.001" min="0" max="1" value={value}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className="w-24 bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2 text-white font-mono text-[11px] focus:border-blue-500/40 outline-none text-right"
          />
          <span className={`text-[11px] font-black w-14 text-right ${accentClass[accent] || 'text-blue-400'}`}>{pct}%</span>
        </div>
      </div>
      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all bg-current ${accentClass[accent] || 'text-blue-400'}`}
          style={{ width: `${barWidth}%`, backgroundColor: 'currentColor' }} />
      </div>
    </div>
  );
}

function FeeSummary({ items, title, color }: { items: { label: string; value: number; color: string }[]; title: string; color: string }) {
  const colorMap: Record<string, string> = {
    amber: 'border-amber-500/15 bg-amber-500/5 text-amber-500',
    blue: 'border-blue-500/15 bg-blue-500/5 text-blue-500',
    emerald: 'border-emerald-500/15 bg-emerald-500/5 text-emerald-500',
  };
  const valColor: Record<string, string> = {
    amber: 'text-amber-400', green: 'text-green-400', orange: 'text-orange-400',
    cyan: 'text-cyan-400', blue: 'text-blue-400', purple: 'text-purple-400',
    pink: 'text-pink-400', emerald: 'text-emerald-400',
  };
  return (
    <div className={`p-4 rounded-xl border ${colorMap[color] || colorMap.blue}`}>
      <p className={`text-[8px] font-black uppercase tracking-[3px] mb-3 ${colorMap[color]?.split(' ').pop()}`}>{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-1.5 bg-black/20 rounded-lg px-2.5 py-1.5">
            <span className="text-[8px] font-bold text-slate-500 uppercase">{item.label}</span>
            <span className={`text-[9px] font-black ${valColor[item.color] || 'text-white'}`}>{(item.value * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonetaryCard({ icon, label, sublabel, value, onChange, prefix, suffix, color }: {
  icon: React.ReactNode; label: string; sublabel: string;
  value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; color: string;
}) {
  const colors: Record<string, { border: string; icon: string; val: string }> = {
    amber: { border: 'border-amber-500/15 hover:border-amber-500/25', icon: 'bg-amber-500/10 text-amber-400', val: 'text-amber-400' },
    emerald: { border: 'border-emerald-500/15 hover:border-emerald-500/25', icon: 'bg-emerald-500/10 text-emerald-400', val: 'text-emerald-400' },
    blue: { border: 'border-blue-500/15 hover:border-blue-500/25', icon: 'bg-blue-500/10 text-blue-400', val: 'text-blue-400' },
    rose: { border: 'border-rose-500/15 hover:border-rose-500/25', icon: 'bg-rose-500/10 text-rose-400', val: 'text-rose-400' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`p-5 bg-white/[0.02] border rounded-2xl transition-all ${c.border}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`p-2 rounded-xl ${c.icon}`}>{icon}</div>
        <div>
          <p className="text-[11px] font-black text-white">{label}</p>
          <p className="text-[9px] text-slate-500">{sublabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2.5">
        {prefix && <span className="text-slate-500 font-bold text-sm">{prefix}</span>}
        <input
          type="number" step="any" value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-transparent text-white font-mono text-sm outline-none"
        />
        {suffix && <span className={`font-black text-sm ${c.val}`}>{suffix}</span>}
      </div>
    </div>
  );
}

function ReferralInput({ label, sublabel, value, onChange, icon }: {
  label: string; sublabel: string;
  value: number; onChange: (v: number) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:border-emerald-500/20 transition-all">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">{icon}</div>
        <div>
          <p className="text-[11px] font-black text-white">{label}</p>
          <p className="text-[9px] text-slate-500">{sublabel}</p>
        </div>
      </div>
      <input
        type="text" inputMode="decimal"
        value={value}
        onChange={e => {
          const v = e.target.value;
          if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v === '' ? 0 : parseFloat(v) || 0);
        }}
        placeholder="0.0000000"
        className="w-full bg-black/30 border border-white/[0.06] rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-emerald-500/30 outline-none transition-colors"
      />
      <p className="text-[8px] text-slate-600 mt-2 font-mono">{Number(value).toFixed(10).replace(/\.?0+$/, '')} π</p>
    </div>
  );
}

function SystemToolCard({ icon, label, description, color, onClick }: {
  icon: React.ReactNode; label: string; description: string;
  color: 'emerald' | 'amber' | 'violet'; onClick: () => void;
}) {
  const c = {
    emerald: 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400 hover:bg-emerald-500/10',
    amber: 'bg-amber-500/5 border-amber-500/15 text-amber-400 hover:bg-amber-500/10',
    violet: 'bg-violet-500/5 border-violet-500/15 text-violet-400 hover:bg-violet-500/10',
  }[color];
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-center gap-3 p-5 rounded-2xl border text-center transition-all active:scale-95 ${c}`}>
      {icon}
      <div>
        <p className="text-[11px] font-black text-white mb-1">{label}</p>
        <p className="text-[9px] text-slate-500 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}

function DbIcon({ name }: { name: string }) {
  const map: Record<string, React.ReactNode> = {
    users: <Users size={11} className="text-emerald-400" />,
    transaction: <ArrowUpDown size={11} className="text-blue-400" />,
    session: <Activity size={11} className="text-cyan-400" />,
    wallet: <Wallet size={11} className="text-amber-400" />,
    audit: <RotateCcw size={11} className="text-orange-400" />,
    security: <Shield size={11} className="text-red-400" />,
  };
  return <>{map[name] || <Database size={11} className="text-slate-400" />}</>;
}
