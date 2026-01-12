"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Settings, Globe, ShieldAlert, Save, RefreshCw,
  Zap, BarChart3, Info, RotateCcw, TrendingUp,
  Wallet, AlertTriangle, Database, Activity,
  Cpu, Terminal, ShieldCheck, ChevronRight
} from "lucide-react";

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [config, setConfig] = useState({
    appVersion: "",
    globalAnnouncement: "",
    transactionFee: 0,
    maintenanceMode: false,
    minWithdrawal: 0,
    maxWithdrawal: 0,
    consensusPrice: 0,
    stakingAPY: 0,
    forceUpdate: false,
  });

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      const { auditLogs: logs, ...currentConfig } = data;
      setConfig(currentConfig);
      setAuditLogs(logs || []);
    } catch (error) {
      toast.error("Échec du chargement du noyau");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...config,
      transactionFee: Number(config.transactionFee),
      consensusPrice: Number(config.consensusPrice),
      minWithdrawal: Number(config.minWithdrawal),
      stakingAPY: Number(config.stakingAPY),
    };

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Noyau système synchronisé");
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

  const handleRollback = async (logId: string) => {
    if (!confirm("Voulez-vous restaurer cet état système ?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      });
      if (res.ok) {
        toast.success("Protocole restauré avec succès");
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur de rollback");
      }
    } catch (err) {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config/backup");
      if (!res.ok) throw new Error("Erreur de génération");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pimpay_core_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Backup Snapshot téléchargé");
    } catch (err) {
      toast.error("Échec du backup");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-[#020617]">
      <div className="relative">
        <div className="w-24 h-24 border-2 border-blue-500/20 rounded-full animate-ping absolute inset-0"></div>
        <div className="w-24 h-24 border-t-2 border-blue-500 rounded-full animate-spin relative z-10"></div>
      </div>
      <p className="mt-12 font-black text-[10px] uppercase tracking-[0.8em] text-blue-500 animate-pulse">
        Initializing PimPay Core
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 md:p-10 selection:bg-blue-500/30 overflow-x-hidden transition-all duration-700">
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">

        {/* HEADER AREA */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/[0.03] border border-white/5 p-8 md:p-10 rounded-[3rem] backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
              <div className="relative p-5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-3xl shadow-xl">
                <Cpu className="text-white" size={32} />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">
                System<span className="text-blue-500">Core</span>
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Mainnet Engine v2.4</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleBackup}
              className="flex items-center gap-2 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl hover:bg-emerald-500/20 transition-all font-black text-[10px] tracking-widest uppercase active:scale-95"
            >
              <Database size={16} /> Snapshot
            </button>
            <button onClick={loadData} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all active:rotate-180 duration-500">
              <RefreshCw size={20} className={saving ? "animate-spin text-blue-500" : "text-slate-400"} />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT COLUMN - CONFIG */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* PROTOCOL SETTINGS */}
            <div className="group bg-white/[0.02] border border-white/5 p-8 md:p-10 rounded-[3rem] hover:border-blue-500/20 transition-all duration-500">
              <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><Terminal size={20} /></div>
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">Global Deployment</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Kernel Version</label>
                  <input 
                    type="text" 
                    value={config.appVersion} 
                    onChange={(e) => setConfig({ ...config, appVersion: e.target.value })} 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white font-mono focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" 
                  />
                </div>
                <div className="flex items-end">
                  <label className="w-full bg-blue-500/5 border border-blue-500/10 p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-blue-500/10 transition-all group/toggle">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Force Upgrade Mode</span>
                    <input 
                      type="checkbox" 
                      checked={config.forceUpdate} 
                      onChange={(e) => setConfig({ ...config, forceUpdate: e.target.checked })} 
                      className="w-6 h-6 accent-blue-600 rounded-lg cursor-pointer" 
                    />
                  </label>
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Broadcast Message (Emergency)</label>
                  <textarea 
                    value={config.globalAnnouncement} 
                    onChange={(e) => setConfig({ ...config, globalAnnouncement: e.target.value })} 
                    className="w-full bg-black/40 border border-white/5 rounded-[2rem] p-6 text-white text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all min-h-[120px] resize-none" 
                  />
                </div>
              </div>
            </div>

            {/* FIREWALL / MAINTENANCE */}
            <div className={`p-8 md:p-10 rounded-[3rem] border-2 transition-all duration-700 ${config.maintenanceMode ? 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_50px_-12px_rgba(244,63,94,0.3)]' : 'bg-white/[0.02] border-white/5'}`}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={`p-5 rounded-3xl transition-all duration-500 ${config.maintenanceMode ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/50' : 'bg-white/5 text-slate-500'}`}>
                    <ShieldAlert size={32} />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Mainnet Lockdown</h3>
                    <p className={`text-xs mt-1 font-medium ${config.maintenanceMode ? 'text-rose-400' : 'text-slate-500'}`}>
                      {config.maintenanceMode ? "SYSTEM IS CURRENTLY RESTRICTED TO ADMINS ONLY" : "Public access is currently enabled and monitored."}
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })} 
                  className={`relative overflow-hidden px-10 py-5 rounded-2xl font-black text-[11px] tracking-[0.3em] transition-all active:scale-95 ${config.maintenanceMode ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {config.maintenanceMode ? "DISABLE LOCKDOWN" : "INITIATE LOCKDOWN"}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - FINANCIALS */}
          <div className="lg:col-span-4 space-y-6">
            <div className="relative group overflow-hidden bg-gradient-to-b from-blue-600/20 to-transparent border border-blue-500/20 p-8 rounded-[2.5rem]">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={80} className="text-blue-500" />
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><BarChart3 size={18} /></div>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Financial Logic</h2>
              </div>
              
              <div className="space-y-6 relative z-10">
                <FinancialInput icon={<Zap size={14}/>} label="GCV Consensus (USD)" value={config.consensusPrice} onChange={(v: any) => setConfig({...config, consensusPrice: v})} />
                <FinancialInput icon={<TrendingUp size={14}/>} label="Staking APY (%)" value={config.stakingAPY} onChange={(v: any) => setConfig({...config, stakingAPY: v})} />
                <FinancialInput icon={<Wallet size={14}/>} label="Network Fee (%)" value={config.transactionFee} onChange={(v: any) => setConfig({...config, transactionFee: v})} />
                <FinancialInput icon={<AlertTriangle size={14}/>} label="Min Withdrawal (PI)" value={config.minWithdrawal} onChange={(v: any) => setConfig({...config, minWithdrawal: v})} />
              </div>
            </div>

            {/* SYNC BUTTON - OPTIMIZED SIZE & COLOR */}
            <button 
              type="submit" 
              disabled={saving} 
              className="w-full group relative overflow-hidden h-20 rounded-[2rem] bg-blue-600 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-600/20"
            >
              <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <div className="relative z-10 flex items-center justify-center gap-3 text-white uppercase italic font-black text-sm tracking-widest">
                {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                <span>{saving ? "Syncing..." : "Sync Core"}</span>
              </div>
            </button>
          </div>
        </form>

        {/* AUDIT LOGS / ROLLBACK */}
        <section className="bg-white/[0.01] border border-white/5 p-8 md:p-10 rounded-[3.5rem] mt-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500"><RotateCcw size={20} /></div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">System Traceability</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Snapshot History & Rollback Points</p>
                  </div>
              </div>
            </div>

            <div className="space-y-4">
                {auditLogs.length > 0 ? auditLogs.map((log) => (
                    <div key={log.id} className="group flex flex-col md:flex-row items-center justify-between p-6 bg-black/40 border border-white/5 rounded-[2.5rem] hover:border-blue-500/40 hover:bg-blue-500/[0.02] transition-all duration-300">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-xs font-black text-blue-500 border border-white/10 group-hover:border-blue-500/50 transition-colors">
                                  {log.adminName?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-black text-white uppercase tracking-tight">{log.adminName}</p>
                                  <ShieldCheck size={14} className="text-blue-500" />
                                </div>
                                <p className="text-[10px] font-mono text-slate-500 mt-1 max-w-md line-clamp-1 group-hover:text-slate-300 transition-colors italic">{log.details}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-600">{new Date(log.createdAt).toLocaleDateString()}</p>
                              <p className="text-[10px] font-mono text-blue-500/80 mt-0.5">{new Date(log.createdAt).toLocaleTimeString()}</p>
                            </div>
                            <button 
                              onClick={() => handleRollback(log.id)} 
                              className="p-4 bg-white/5 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-600/20 transition-all active:scale-90"
                            >
                              <RotateCcw size={18} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 border-2 border-dashed border-white/5 rounded-[3rem] text-center">
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-600 text-center">No core history found</p>
                    </div>
                )}
            </div>
        </section>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-10 opacity-30 border-t border-white/5">
          <p className="text-[9px] font-black uppercase tracking-[0.5em]">PimPay Kernel Stability: 99.98%</p>
          <div className="flex items-center gap-6">
            <p className="text-[9px] font-black uppercase tracking-[0.5em]">Auth: GCV-Standard</p>
            <p className="text-[9px] font-black uppercase tracking-[0.5em]">Encrypted: AES-256</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialInput({ label, value, onChange, icon }: any) {
  return (
    <div className="space-y-3 group/input">
      <div className="flex items-center gap-2 ml-2">
        <span className="text-blue-500 group-focus-within/input:scale-125 transition-transform">{icon}</span>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] group-focus-within/input:text-blue-400 transition-colors">{label}</label>
      </div>
      <div className="relative">
        <input 
          type="number" 
          step="any" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white font-mono text-lg focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all pr-12 shadow-inner" 
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
}
