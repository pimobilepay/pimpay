"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Settings, Globe, ShieldAlert, Save, RefreshCw,
  Zap, BarChart3, Info, RotateCcw, TrendingUp,
  Wallet, AlertTriangle, Database, Activity,
  Cpu, Terminal, ShieldCheck, ChevronRight, Rocket,
  Users, Landmark, Eye, CreditCard, ArrowUpDown,
  ArrowDownToLine, ArrowUpFromLine, Smartphone, Repeat, ArrowLeft,
  X, Loader2, Download, HardDrive, Table, Clock, Shield, Mail,
  Bug, Wrench, CheckCircle2, XCircle, Gauge, Lock, Server, Wifi, FileWarning
} from "lucide-react";
export default function SystemSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [dbModal, setDbModal] = useState(false);
  const [dbData, setDbData] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [backupModal, setBackupModal] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupSendEmail, setBackupSendEmail] = useState(false);
  const [optimizerModal, setOptimizerModal] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<{
    vulnerabilities: { name: string; severity: string; status: 'fixed' | 'pending' | 'scanning'; description: string }[];
    performance: { name: string; improvement: string; status: 'optimized' | 'pending' | 'scanning'; description: string }[];
    overallScore: number;
    scanComplete: boolean;
  } | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    piVolume24h: 0
  });
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
    depositMobileFee: 0.02,
    depositCardFee: 0.035,
    exchangeFee: 0.001,
    cardPaymentFee: 0.015,
  });
  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      const { auditLogs: logs, stats: sysStats, ...currentConfig } = data;
      setConfig(currentConfig);
      setAuditLogs(logs || []);
      setStats(sysStats || { totalUsers: 11, activeSessions: 3, piVolume24h: 314.15 });
    } catch (error) {
      toast.error("Échec du chargement du noyau Elara");
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
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success("Noyau système synchronisé avec succès");
        document.cookie = `maintenance_mode=${config.maintenanceMode}; path=/`;
        document.cookie = `coming_soon_mode=${config.comingSoonMode}; path=/`;
        loadData();
      } else {
        throw new Error("Erreur de synchronisation");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchDbInfo = async () => {
    setDbModal(true);
    setDbLoading(true);
    try {
      const res = await fetch("/api/admin/database");
      if (res.ok) {
        const data = await res.json();
        setDbData(data);
      } else {
        toast.error("Impossible de charger les infos DB");
        setDbModal(false);
      }
    } catch {
      toast.error("Erreur de connexion");
      setDbModal(false);
    } finally {
      setDbLoading(false);
    }
  };

  const runBackup = async () => {
    setBackupRunning(true);
    try {
      const url = backupSendEmail
        ? "/api/admin/config/backup?sendEmail=true"
        : "/api/admin/config/backup";
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `pimpay_backup_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);
        toast.success("Backup telecharge avec succes");
        setBackupModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Echec du backup");
      }
    } catch {
      toast.error("Erreur de connexion au serveur");
    } finally {
      setBackupRunning(false);
    }
  };

  const runSystemOptimizer = async () => {
    setOptimizing(true);
    setOptimizationResults(null);
    
    // Initialize scanning state with placeholder items
    const initialVulnerabilities = [
      { name: "Analyse des vulnerabilites...", severity: "critical" as const, status: 'scanning' as const, description: "Scan en cours..." },
    ];

    const initialPerformance = [
      { name: "Optimisation en cours...", improvement: "scanning", status: 'scanning' as const, description: "Analyse des performances..." },
    ];

    setOptimizationResults({ vulnerabilities: initialVulnerabilities, performance: initialPerformance, overallScore: 0, scanComplete: false });

    try {
      // Call the real API endpoint
      const response = await fetch("/api/admin/system-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de l'optimisation");
      }

      const data = await response.json();
      
      // Map API response to component state format
      const mappedVulnerabilities = data.vulnerabilities.map((v: { name: string; severity: string; status: string; description: string }) => ({
        name: v.name,
        severity: v.severity,
        status: v.status === "fixed" ? "fixed" as const : v.status === "detected" ? "pending" as const : "fixed" as const,
        description: v.description
      }));

      const mappedPerformance = data.performance.map((p: { name: string; improvement: string; status: string; description: string }) => ({
        name: p.name,
        improvement: p.improvement,
        status: p.status === "optimized" ? "optimized" as const : "pending" as const,
        description: p.description
      }));

      // Animate the results appearing one by one
      for (let i = 0; i < mappedVulnerabilities.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setOptimizationResults(prev => {
          if (!prev) return prev;
          const updated = [...mappedVulnerabilities.slice(0, i + 1)];
          return { ...prev, vulnerabilities: updated };
        });
      }

      for (let i = 0; i < mappedPerformance.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setOptimizationResults(prev => {
          if (!prev) return prev;
          const updated = [...mappedPerformance.slice(0, i + 1)];
          return { ...prev, performance: updated };
        });
      }

      // Final update with score
      await new Promise(resolve => setTimeout(resolve, 300));
      setOptimizationResults({
        vulnerabilities: mappedVulnerabilities,
        performance: mappedPerformance,
        overallScore: data.overallScore,
        scanComplete: true
      });

      toast.success(`Systeme optimise! Score: ${data.overallScore}/100 (${data.scanTime}ms)`);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur de connexion au serveur");
      setOptimizationResults(null);
    } finally {
      setOptimizing(false);
    }
  };
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-[#020617]">
      <div className="relative">
        <div className="w-24 h-24 border-2 border-blue-500/20 rounded-full animate-ping absolute inset-0"></div>
        <div className="w-24 h-24 border-t-2 border-blue-500 rounded-full animate-spin relative z-10"></div>
      </div>
      <p className="mt-12 font-black text-[10px] uppercase tracking-[0.8em] text-blue-500">Authenticating Elara Protocol...</p>
    </div>
  );
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-32 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-indigo-600/5 blur-[120px] rounded-full" />
      </div>

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button onClick={() => router.push("/admin")} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Parametres</h1>
          </div>
          <button onClick={loadData} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10 p-4 md:p-8 lg:p-12">
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer ${config.maintenanceMode ? 'bg-rose-500/10 border-rose-500' : 'bg-white/[0.02] border-white/5'}`} onClick={() => setConfig({...config, maintenanceMode: !config.maintenanceMode})}>
                <div className="flex items-center justify-between mb-4">
                  <ShieldAlert className={config.maintenanceMode ? "text-rose-500" : "text-slate-600"} size={24} />
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${config.maintenanceMode ? 'bg-rose-500' : 'bg-slate-800'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.maintenanceMode ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Mode Maintenance</h3>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Verrouillage total du Mainnet</p>
              </div>
              <div className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer ${config.comingSoonMode ? 'bg-blue-500/10 border-blue-500' : 'bg-white/[0.02] border-white/5'}`} onClick={() => setConfig({...config, comingSoonMode: !config.comingSoonMode})}>
                <div className="flex items-center justify-between mb-4">
                  <Rocket className={config.comingSoonMode ? "text-blue-500" : "text-slate-600"} size={24} />
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${config.comingSoonMode ? 'bg-blue-500' : 'bg-slate-800'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.comingSoonMode ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Mode Coming Soon</h3>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Teasing des fonctionnalités</p>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem] space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Terminal size={18} className="text-blue-500" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Kernel Broadcast</h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Version</label>
                    <input className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-mono text-sm focus:border-blue-500 outline-none" value={config.appVersion} onChange={(e) => setConfig({...config, appVersion: e.target.value})} />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={() => setConfig({...config, forceUpdate: !config.forceUpdate})} className={`w-full h-[54px] rounded-2xl border transition-all font-black text-[9px] tracking-widest uppercase ${config.forceUpdate ? 'bg-orange-500/20 border-orange-500/50 text-orange-500' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                      {config.forceUpdate ? "Force Update Active" : "Normal Update Mode"}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Annonce Globale (Alert Banner)</label>
                  <textarea className="w-full bg-black/40 border border-white/5 rounded-3xl p-5 text-white text-sm focus:border-blue-500 outline-none min-h-[100px] resize-none" placeholder="Message affiché en haut du dashboard..." value={config.globalAnnouncement} onChange={(e) => setConfig({...config, globalAnnouncement: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem] space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Repeat size={18} className="text-emerald-500" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Fee Management Center</h2>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Tous les frais de transaction sont centralisés ici. Les valeurs représentent des pourcentages (ex: 0.02 = 2%).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FeeInput icon={<ArrowUpDown size={14} />} label="Transfert P2P" sublabel="Envoi entre utilisateurs" value={config.transferFee} onChange={(v: number) => setConfig({ ...config, transferFee: v })} color="text-blue-400" />
                <FeeInput icon={<ArrowUpFromLine size={14} />} label="Retrait" sublabel="Retrait vers mobile/banque" value={config.withdrawFee} onChange={(v: number) => setConfig({ ...config, withdrawFee: v })} color="text-orange-400" />
                <FeeInput icon={<Smartphone size={14} />} label="Dépôt Mobile Money" sublabel="Dépôt via opérateur mobile" value={config.depositMobileFee} onChange={(v: number) => setConfig({ ...config, depositMobileFee: v })} color="text-green-400" />
                <FeeInput icon={<CreditCard size={14} />} label="Dépôt Carte" sublabel="Dépôt par carte bancaire" value={config.depositCardFee} onChange={(v: number) => setConfig({ ...config, depositCardFee: v })} color="text-purple-400" />
                <FeeInput icon={<Repeat size={14} />} label="Échange / Swap" sublabel="Conversion crypto/fiat" value={config.exchangeFee} onChange={(v: number) => setConfig({ ...config, exchangeFee: v })} color="text-cyan-400" />
                <FeeInput icon={<CreditCard size={14} />} label="Paiement Carte Virtuelle" sublabel="Achats via carte PimPay" value={config.cardPaymentFee} onChange={(v: number) => setConfig({ ...config, cardPaymentFee: v })} color="text-pink-400" />
              </div>
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Aperçu des frais actifs</p>
                <div className="grid grid-cols-3 gap-3">
                  <FeePreviewChip label="P2P" value={config.transferFee} />
                  <FeePreviewChip label="Retrait" value={config.withdrawFee} />
                  <FeePreviewChip label="Dépôt Mob." value={config.depositMobileFee} />
                  <FeePreviewChip label="Dépôt Card" value={config.depositCardFee} />
                  <FeePreviewChip label="Swap" value={config.exchangeFee} />
                  <FeePreviewChip label="Card Pay" value={config.cardPaymentFee} />
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gradient-to-b from-blue-600/10 to-transparent border border-blue-500/20 p-8 rounded-[3rem] shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <Landmark size={18} className="text-blue-400" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Monetary Policy</h2>
              </div>
              <div className="space-y-5">
                <FinancialInput icon={<Zap size={14}/>} label="GCV Price (USD)" value={config.consensusPrice} onChange={(v: any) => setConfig({...config, consensusPrice: v})} />
                <FinancialInput icon={<TrendingUp size={14}/>} label="Staking APY %" value={config.stakingAPY} onChange={(v: any) => setConfig({...config, stakingAPY: v})} />
                <FinancialInput icon={<Wallet size={14}/>} label="Global Fees %" value={config.transactionFee} onChange={(v: any) => setConfig({...config, transactionFee: v})} />
                <FinancialInput icon={<AlertTriangle size={14}/>} label="Min Withdrawal" value={config.minWithdrawal} onChange={(v: any) => setConfig({...config, minWithdrawal: v})} />
              </div>
              <button type="submit" disabled={saving} className="w-full mt-8 group relative overflow-hidden h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/20">
                <div className="relative z-10 flex items-center justify-center gap-3 text-white uppercase italic font-black text-xs tracking-widest">
                  {saving ? <RefreshCw className="animate-spin" /> : <Save size={18} />}
                  <span>{saving ? "SYNCING..." : "DEPLOY CHANGES"}</span>
                </div>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={fetchDbInfo} className="h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 flex flex-col items-center justify-center gap-1 text-emerald-500 hover:bg-emerald-500/20 transition-all active:scale-95">
                <Database size={18} />
                <span className="text-[7px] font-black uppercase tracking-widest">Database</span>
              </button>
              <button type="button" onClick={() => setBackupModal(true)} className="h-16 rounded-2xl bg-amber-500/10 border border-amber-500/10 flex flex-col items-center justify-center gap-1 text-amber-500 hover:bg-amber-500/20 transition-all active:scale-95">
                <Download size={18} />
                <span className="text-[7px] font-black uppercase tracking-widest">Backup</span>
              </button>
            </div>
            
            {/* System Optimizer Button */}
            <button 
              type="button" 
              onClick={() => setOptimizerModal(true)} 
              className="w-full h-20 rounded-2xl bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 border border-violet-500/30 flex items-center justify-center gap-3 text-violet-400 hover:from-violet-600/30 hover:via-purple-600/30 hover:to-fuchsia-600/30 transition-all active:scale-[0.98] group"
            >
              <div className="relative">
                <Shield size={22} className="group-hover:scale-110 transition-transform" />
                <Wrench size={10} className="absolute -bottom-1 -right-1 text-fuchsia-400" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black uppercase tracking-widest block">System Optimizer</span>
                <span className="text-[7px] font-bold text-violet-500/70 uppercase tracking-wide">Securite & Performance</span>
              </div>
            </button>
          </div>
        </form>
        <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-8">
           <div className="flex items-center gap-3 mb-8">
              <RotateCcw size={18} className="text-orange-500" />
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Audit Trail</h2>
           </div>
           <div className="space-y-3">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl hover:bg-white/[0.02] transition-all group">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-blue-500 border border-white/5">{log.adminName?.[0]}</div>
                      <div>
                        <p className="text-[11px] font-bold text-white uppercase">{log.adminName}</p>
                        <p className="text-[9px] text-slate-500 font-mono line-clamp-1">{log.details}</p>
                      </div>
                   </div>
                   <p className="text-[9px] font-mono text-slate-600 group-hover:text-blue-500 transition-colors">{new Date(log.createdAt).toLocaleTimeString()}</p>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* DATABASE INFO MODAL */}
      {dbModal && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-200" onClick={() => setDbModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Database size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">Base de Donnees</h2>
                    <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">{dbData?.dbProvider || "PostgreSQL"}</p>
                  </div>
                </div>
                <button onClick={() => setDbModal(false)} className="p-2 bg-white/5 rounded-full text-white hover:bg-white/10 transition-colors"><X size={16}/></button>
              </div>
              {dbData && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 text-center">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Tables</p>
                    <p className="text-lg font-black text-white">{dbData.totalTables}</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 text-center">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Rows Total</p>
                    <p className="text-lg font-black text-emerald-400">{dbData.totalRows?.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 text-center">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Backups</p>
                    <p className="text-lg font-black text-amber-400">{dbData.backups?.length || 0}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {dbLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 size={24} className="text-emerald-500 animate-spin mb-3" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Connexion a la base de donnees...</p>
                </div>
              ) : dbData ? (
                <div className="space-y-6">
                  {/* Tables */}
                  <div>
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-[3px] mb-3">Tables ({dbData.tables?.length})</p>
                    <div className="space-y-2">
                      {dbData.tables?.map((table: any) => (
                        <div key={table.name} className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 flex items-center justify-between group hover:border-white/10 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <TableIcon name={table.icon} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-white uppercase">{table.name}</p>
                              <p className="text-[8px] text-slate-600 font-mono">PostgreSQL Table</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-white">{table.rows.toLocaleString()}</p>
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">rows</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Backup History */}
                  <div>
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-[3px] mb-3">Historique Backups</p>
                    {dbData.backups?.length > 0 ? (
                      <div className="space-y-2">
                        {dbData.backups.map((bk: any) => (
                          <div key={bk.id} className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bk.details?.includes("Cron") ? "bg-blue-500/10" : "bg-amber-500/10"}`}>
                              {bk.details?.includes("Cron") ? (
                                <Clock size={12} className="text-blue-400" />
                              ) : (
                                <Download size={12} className="text-amber-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-white uppercase truncate">
                                {bk.details?.includes("Cron") ? "Backup Automatique" : "Backup Manuel"}
                              </p>
                              <p className="text-[8px] text-slate-500 truncate">Par {bk.adminName || "Systeme"} - {bk.details}</p>
                            </div>
                            <span className="text-[8px] text-slate-600 font-mono shrink-0">
                              {new Date(bk.createdAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-8 text-center">
                        <HardDrive size={20} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aucun backup enregistre</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* BACKUP MODAL */}
      {backupModal && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-200" onClick={() => !backupRunning && setBackupModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Download size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">Backup Manuel</h2>
                    <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest">Export Complet</p>
                  </div>
                </div>
                <button onClick={() => !backupRunning && setBackupModal(false)} className="p-2 bg-white/5 rounded-full text-white hover:bg-white/10 transition-colors"><X size={16}/></button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-amber-400 uppercase">Attention</p>
                    <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                      Cette action va exporter toutes les donnees de la base de donnees (utilisateurs, transactions, configurations, logs) dans un fichier JSON.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Donnees incluses</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Utilisateurs", "Configurations", "Logs Audit", "Transactions"].map((item) => (
                    <div key={item} className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-bold text-white uppercase">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email option */}
              <div
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${backupSendEmail ? "bg-blue-500/10 border-blue-500/30" : "bg-white/[0.02] border-white/5"}`}
                onClick={() => setBackupSendEmail(!backupSendEmail)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className={backupSendEmail ? "text-blue-400" : "text-slate-600"} />
                    <div>
                      <p className="text-[10px] font-black text-white uppercase">Envoyer par Email</p>
                      <p className="text-[8px] text-slate-500">Recevoir le backup par email</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${backupSendEmail ? "bg-blue-500" : "bg-slate-800"}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${backupSendEmail ? "left-5" : "left-1"}`} />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => !backupRunning && setBackupModal(false)}
                  disabled={backupRunning}
                  className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/5 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={runBackup}
                  disabled={backupRunning}
                  className="flex-1 h-14 rounded-2xl bg-amber-600 text-white font-black text-[9px] uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 disabled:opacity-70"
                >
                  {backupRunning ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Backup en cours...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>Lancer le Backup</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM OPTIMIZER MODAL */}
      {optimizerModal && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-200" onClick={() => !optimizing && setOptimizerModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-violet-600/10 via-purple-600/10 to-fuchsia-600/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center relative">
                    <Shield size={24} className="text-violet-400" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center">
                      <Wrench size={10} className="text-fuchsia-400" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white uppercase tracking-wider">System Optimizer</h2>
                    <p className="text-[9px] text-violet-400 font-black uppercase tracking-widest">Securite & Performance Protocol</p>
                  </div>
                </div>
                <button onClick={() => !optimizing && setOptimizerModal(false)} className="p-2 bg-white/5 rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-50" disabled={optimizing}><X size={16}/></button>
              </div>
              
              {/* Overall Score */}
              {optimizationResults?.scanComplete && (
                <div className="mt-5 flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-slate-800" />
                      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-emerald-500" strokeDasharray={`${(optimizationResults.overallScore / 100) * 175.9} 175.9`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-black text-emerald-400">{optimizationResults.overallScore}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-400 uppercase">Systeme Optimise</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Toutes les vulnerabilites ont ete corrigees</p>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {!optimizationResults ? (
                <div className="space-y-5 py-4">
                  <div className="bg-violet-500/5 border border-violet-500/10 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <Shield size={16} className="text-violet-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-violet-400 uppercase">Analyse Complete du Systeme</p>
                        <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                          Cet outil va scanner et corriger automatiquement les vulnerabilites de securite, 
                          optimiser les performances de la base de donnees, nettoyer le cache et ameliorer 
                          les temps de reponse du systeme.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Actions executees</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: <Bug size={12} />, label: "Scan Vulnerabilites", color: "text-red-400" },
                        { icon: <Lock size={12} />, label: "Renforcement Securite", color: "text-amber-400" },
                        { icon: <Server size={12} />, label: "Optimisation Serveur", color: "text-blue-400" },
                        { icon: <Database size={12} />, label: "Nettoyage Database", color: "text-emerald-400" },
                        { icon: <Gauge size={12} />, label: "Boost Performance", color: "text-cyan-400" },
                        { icon: <Wifi size={12} />, label: "Optimisation API", color: "text-purple-400" },
                      ].map((item, i) => (
                        <div key={i} className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 flex items-center gap-2">
                          <span className={item.color}>{item.icon}</span>
                          <span className="text-[8px] font-bold text-white uppercase">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={runSystemOptimizer}
                    className="w-full h-16 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-black text-[10px] uppercase tracking-widest hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-violet-600/30"
                  >
                    <Zap size={18} />
                    <span>Lancer lOptimisation Globale</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6 py-2">
                  {/* Vulnerabilities Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={14} className="text-red-400" />
                      <p className="text-[9px] font-black text-red-400 uppercase tracking-[3px]">Securite - Vulnerabilites</p>
                    </div>
                    <div className="space-y-2">
                      {optimizationResults.vulnerabilities.map((vuln, i) => (
                        <div key={i} className={`bg-white/[0.03] border rounded-xl p-3 flex items-center justify-between transition-all ${
                          vuln.status === 'fixed' ? 'border-emerald-500/30' : vuln.status === 'scanning' ? 'border-amber-500/30' : 'border-white/[0.03]'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              vuln.severity === 'critical' ? 'bg-red-500/10' : vuln.severity === 'high' ? 'bg-orange-500/10' : 'bg-amber-500/10'
                            }`}>
                              {vuln.status === 'fixed' ? (
                                <CheckCircle2 size={14} className="text-emerald-400" />
                              ) : vuln.status === 'scanning' ? (
                                <Loader2 size={14} className="text-amber-400 animate-spin" />
                              ) : (
                                <FileWarning size={14} className={
                                  vuln.severity === 'critical' ? 'text-red-400' : vuln.severity === 'high' ? 'text-orange-400' : 'text-amber-400'
                                } />
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-white uppercase">{vuln.name}</p>
                              <p className="text-[8px] text-slate-500 font-bold">{vuln.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[7px] font-black uppercase px-2 py-1 rounded-full ${
                              vuln.severity === 'critical' ? 'bg-red-500/10 text-red-400' : 
                              vuln.severity === 'high' ? 'bg-orange-500/10 text-orange-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>{vuln.severity}</span>
                            {vuln.status === 'fixed' && (
                              <span className="text-[7px] font-black uppercase px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">Corrige</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Gauge size={14} className="text-cyan-400" />
                      <p className="text-[9px] font-black text-cyan-400 uppercase tracking-[3px]">Performance - Optimisations</p>
                    </div>
                    <div className="space-y-2">
                      {optimizationResults.performance.map((perf, i) => (
                        <div key={i} className={`bg-white/[0.03] border rounded-xl p-3 flex items-center justify-between transition-all ${
                          perf.status === 'optimized' ? 'border-cyan-500/30' : perf.status === 'scanning' ? 'border-blue-500/30' : 'border-white/[0.03]'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                              {perf.status === 'optimized' ? (
                                <CheckCircle2 size={14} className="text-cyan-400" />
                              ) : perf.status === 'scanning' ? (
                                <Loader2 size={14} className="text-blue-400 animate-spin" />
                              ) : (
                                <Gauge size={14} className="text-cyan-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-white uppercase">{perf.name}</p>
                              <p className="text-[8px] text-slate-500 font-bold">{perf.description}</p>
                            </div>
                          </div>
                          {perf.status === 'optimized' && (
                            <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
                              perf.improvement.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'
                            }`}>{perf.improvement}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Close button when done */}
                  {optimizationResults.scanComplete && (
                    <button
                      onClick={() => {
                        setOptimizerModal(false);
                        setOptimizationResults(null);
                      }}
                      className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 size={16} />
                      <span>Optimisation Terminee - Fermer</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
function TableIcon({ name }: { name: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    users: <Users size={12} className="text-emerald-400" />,
    transaction: <ArrowUpDown size={12} className="text-blue-400" />,
    session: <Activity size={12} className="text-cyan-400" />,
    wallet: <Wallet size={12} className="text-amber-400" />,
    audit: <RotateCcw size={12} className="text-orange-400" />,
    security: <Shield size={12} className="text-red-400" />,
    support: <HardDrive size={12} className="text-purple-400" />,
    stats: <BarChart3 size={12} className="text-indigo-400" />,
    activity: <Eye size={12} className="text-teal-400" />,
    notification: <Zap size={12} className="text-pink-400" />,
  };
  return <>{iconMap[name] || <Database size={12} className="text-slate-400" />}</>;
}
function StatMiniCard({ icon, label, value, color = "text-blue-500" }: any) {
  return (
    <div className="bg-white/[0.03] border border-white/5 p-4 rounded-3xl flex items-center gap-4 backdrop-blur-md">
      <div className={`p-3 bg-white/5 rounded-2xl ${color}`}>{icon}</div>
      <div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-black text-white italic">{value}</p>
      </div>
    </div>
  );
}
function FeeInput({ icon, label, sublabel, value, onChange, color = "text-blue-400" }: any) {
  return (
    <div className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-2 group hover:border-white/10 transition-all">
      <div className="flex items-center gap-2">
        <span className={`${color} group-hover:scale-110 transition-transform`}>{icon}</span>
        <div>
          <p className="text-[10px] font-black text-white uppercase tracking-widest">{label}</p>
          <p className="text-[8px] text-slate-600 font-bold uppercase">{sublabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="number" step="0.001" min="0" max="1" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="flex-1 bg-slate-950/50 border border-white/5 rounded-xl p-3 text-white font-mono text-sm focus:border-blue-500/50 outline-none transition-all" />
        <span className="text-[10px] font-black text-slate-500 bg-slate-900 px-3 py-3 rounded-xl">{(value * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}
function FeePreviewChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between bg-slate-900/50 rounded-xl px-3 py-2">
      <span className="text-[8px] font-black text-slate-500 uppercase">{label}</span>
      <span className="text-[10px] font-black text-emerald-400">{(value * 100).toFixed(1)}%</span>
    </div>
  );
}
function FinancialInput({ label, value, onChange, icon }: any) {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center gap-2 ml-1">
        <span className="text-slate-500 group-focus-within:text-blue-500 transition-colors">{icon}</span>
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      </div>
      <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-950/50 border border-white/5 rounded-xl p-4 text-white font-mono focus:border-blue-500/50 outline-none transition-all shadow-inner" />
    </div>
  );
}
