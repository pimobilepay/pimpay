"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Settings, Globe, ShieldAlert, Save, RefreshCw, 
  Zap, BarChart3, Info, RotateCcw, TrendingUp, 
  Wallet, AlertTriangle, Database 
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

  // 1. CHARGEMENT CONFIG + LOGS
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

  // 2. SAUVEGARDE DES CHANGEMENTS
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

  // 3. FONCTION ROLLBACK
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

  // 4. FONCTION BACKUP DATABASE
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
      loadData();
    } catch (err) {
      toast.error("Échec du backup");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-[#050505]">
      <div className="w-20 h-20 border-t-2 border-blue-500 rounded-full animate-spin"></div>
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.5em] text-blue-500">Decrypting System Core...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans p-6 selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER AREA */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600/20 rounded-lg"><Settings className="text-blue-500" size={24} /></div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">System<span className="text-blue-600">Core</span></h1>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              PimPay Mainnet Protocol Settings
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              type="button" 
              onClick={handleBackup} 
              className="flex items-center gap-2 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl hover:bg-emerald-500/20 transition-all font-black text-[10px] tracking-widest uppercase"
            >
              <Database size={16} />
              Snapshot DB
            </button>
            <button onClick={loadData} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all"><RefreshCw size={20} className={saving ? "animate-spin" : ""} /></button>
          </div>
        </header>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
                <div className="flex items-center gap-3 mb-8">
                    <Globe size={20} className="text-blue-500" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">Global Protocol</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Version ID</label>
                    <input type="text" value={config.appVersion} onChange={(e) => setConfig({ ...config, appVersion: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div className="flex items-end">
                    <label className="w-full bg-black/20 border border-white/5 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all">
                      <input type="checkbox" checked={config.forceUpdate} onChange={(e) => setConfig({ ...config, forceUpdate: e.target.checked })} className="w-5 h-5 accent-blue-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Force Upgrade Protocol</span>
                    </label>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Network Notice</label>
                    <textarea value={config.globalAnnouncement} onChange={(e) => setConfig({ ...config, globalAnnouncement: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-blue-500 outline-none" rows={3} />
                  </div>
                </div>
              </div>

              <div className={`p-8 rounded-[2.5rem] border transition-all ${config.maintenanceMode ? 'bg-red-500/5 border-red-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${config.maintenanceMode ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 text-slate-500'}`}><ShieldAlert size={28} /></div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase italic">Firewall Maintenance</h3>
                      <p className="text-xs text-slate-500">Lock non-admin access immediately.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })} className={`px-8 py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all ${config.maintenanceMode ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
                    {config.maintenanceMode ? "OFFLINE" : "ONLINE"}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-gradient-to-b from-blue-600/10 to-transparent border border-blue-500/20 p-8 rounded-[2.5rem]">
                <div className="flex items-center gap-3 mb-8">
                  <BarChart3 size={20} className="text-blue-400" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Financial Core</h2>
                </div>
                <div className="space-y-6">
                  <FinancialInput icon={<Zap size={14}/>} label="GCV Consensus ($)" value={config.consensusPrice} onChange={(v: any) => setConfig({...config, consensusPrice: v})} />
                  <FinancialInput icon={<TrendingUp size={14}/>} label="Staking APY (%)" value={config.stakingAPY} onChange={(v: any) => setConfig({...config, stakingAPY: v})} />
                  <FinancialInput icon={<Wallet size={14}/>} label="Fee Percentage (%)" value={config.transactionFee} onChange={(v: any) => setConfig({...config, transactionFee: v})} />
                  <FinancialInput icon={<AlertTriangle size={14}/>} label="Min Withdrawal (π)" value={config.minWithdrawal} onChange={(v: any) => setConfig({...config, minWithdrawal: v})} />
                </div>
              </div>

              <button type="submit" disabled={saving} className="w-full group relative overflow-hidden h-24 rounded-[2.5rem] bg-white transition-all active:scale-95 disabled:opacity-50">
                <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <div className="relative z-10 flex items-center justify-center gap-4 text-black group-hover:text-white transition-colors uppercase italic font-black">
                  {saving ? <RefreshCw className="animate-spin" /> : <Save size={24} />}
                  <span>Commit Changes</span>
                </div>
              </button>
            </div>
          </div>
        </form>

        <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] mt-12">
            <div className="flex items-center gap-3 mb-8">
                <RotateCcw size={20} className="text-orange-500" />
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Noyau Traceability & Rollback</h2>
            </div>
            <div className="space-y-4">
                {auditLogs.length > 0 ? auditLogs.map((log) => (
                    <div key={log.id} className="group flex items-center justify-between p-5 bg-black/40 border border-white/5 rounded-[2rem] hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] font-black text-blue-500 border border-blue-500/20">
                                {log.adminName?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">{log.adminName} <span className="text-slate-500 font-medium">modified protocol</span></p>
                                <p className="text-[10px] font-mono text-blue-500/80 mt-1 max-w-xl truncate">{log.details}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-slate-600 italic">{new Date(log.createdAt).toLocaleTimeString()}</span>
                            <button onClick={() => handleRollback(log.id)} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-blue-600 hover:text-white transition-all"><RotateCcw size={16} /></button>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 text-slate-600 italic text-sm border border-dashed border-white/10 rounded-3xl">No recent core modifications detected.</div>
                )}
            </div>
        </section>
      </div>
    </div>
  );
}

function FinancialInput({ label, value, onChange, icon }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 ml-1">
        <span className="text-blue-500">{icon}</span>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      </div>
      <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-mono focus:border-blue-500 outline-none transition-all" />
    </div>
  );
}
