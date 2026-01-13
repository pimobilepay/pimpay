"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Settings, Globe, ShieldAlert, Save, RefreshCw,
  Zap, BarChart3, Info, RotateCcw, TrendingUp,
  Wallet, AlertTriangle, Database, Activity,
  Cpu, Terminal, ShieldCheck, ChevronRight, Rocket,
  Users, Landmark, Eye
} from "lucide-react";

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // États additionnels pour les nouvelles fonctionnalités
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
    comingSoonMode: false, // Nouvelle fonctionnalité
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
        // Mise à jour locale des cookies pour le middleware immédiat
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-[#020617]">
      <div className="relative">
        <div className="w-24 h-24 border-2 border-blue-500/20 rounded-full animate-ping absolute inset-0"></div>
        <div className="w-24 h-24 border-t-2 border-blue-500 rounded-full animate-spin relative z-10"></div>
      </div>
      <p className="mt-12 font-black text-[10px] uppercase tracking-[0.8em] text-blue-500">
        Authenticating Elara Protocol...
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 md:p-8 lg:p-12 overflow-x-hidden">
      
      {/* EFFETS DE FOND FIXES */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-indigo-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* HEADER ET STATS RAPIDES */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <header className="lg:col-span-2 flex items-center gap-6 bg-white/[0.03] border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-xl">
            <div className="p-4 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl">
              <Cpu className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase italic">PIMPAY<span className="text-blue-500">.CORE</span></h1>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">Elara OS v2.4.0</p>
            </div>
          </header>

          <StatMiniCard icon={<Users size={16}/>} label="Users" value={stats.totalUsers} />
          <StatMiniCard icon={<Activity size={16}/>} label="Live Sessions" value={stats.activeSessions} color="text-emerald-500" />
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLONNE GAUCHE : CONTRÔLE DÉPLOIEMENT */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* MODES DE VISIBILITÉ (Maintenance & Coming Soon) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Maintenance Card */}
              <div className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer ${config.maintenanceMode ? 'bg-rose-500/10 border-rose-500' : 'bg-white/[0.02] border-white/5'}`}
                   onClick={() => setConfig({...config, maintenanceMode: !config.maintenanceMode})}>
                <div className="flex items-center justify-between mb-4">
                  <ShieldAlert className={config.maintenanceMode ? "text-rose-500" : "text-slate-600"} size={24} />
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${config.maintenanceMode ? 'bg-rose-500' : 'bg-slate-800'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.maintenanceMode ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Mode Maintenance</h3>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Verrouillage total du Mainnet</p>
              </div>

              {/* Coming Soon Card */}
              <div className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer ${config.comingSoonMode ? 'bg-blue-500/10 border-blue-500' : 'bg-white/[0.02] border-white/5'}`}
                   onClick={() => setConfig({...config, comingSoonMode: !config.comingSoonMode})}>
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

            {/* KERNEL CONFIG */}
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem] space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Terminal size={18} className="text-blue-500" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Kernel Broadcast</h2>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Version</label>
                    <input 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-mono text-sm focus:border-blue-500 outline-none"
                      value={config.appVersion}
                      onChange={(e) => setConfig({...config, appVersion: e.target.value})}
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={() => setConfig({...config, forceUpdate: !config.forceUpdate})} className={`w-full h-[54px] rounded-2xl border transition-all font-black text-[9px] tracking-widest uppercase ${config.forceUpdate ? 'bg-orange-500/20 border-orange-500/50 text-orange-500' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                      {config.forceUpdate ? "Force Update Active" : "Normal Update Mode"}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Annonce Globale (Alert Banner)</label>
                  <textarea 
                    className="w-full bg-black/40 border border-white/5 rounded-3xl p-5 text-white text-sm focus:border-blue-500 outline-none min-h-[100px] resize-none"
                    placeholder="Message affiché en haut du dashboard..."
                    value={config.globalAnnouncement}
                    onChange={(e) => setConfig({...config, globalAnnouncement: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : PARAMÈTRES FINANCIERS */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gradient-to-b from-blue-600/10 to-transparent border border-blue-500/20 p-8 rounded-[3rem] shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <Landmark size={18} className="text-blue-400" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Monetary Policy</h2>
              </div>

              <div className="space-y-5">
                <FinancialInput icon={<Zap size={14}/>} label="GCV Price (USD)" value={config.consensusPrice} onChange={(v: any) => setConfig({...config, consensusPrice: v})} />
                <FinancialInput icon={<TrendingUp size={14}/>} label="Staking APY %" value={config.stakingAPY} onChange={(v: any) => setConfig({...config, stakingAPY: v})} />
                <FinancialInput icon={<Wallet size={14}/>} label="Fees %" value={config.transactionFee} onChange={(v: any) => setConfig({...config, transactionFee: v})} />
                <FinancialInput icon={<AlertTriangle size={14}/>} label="Min Withdrawal" value={config.minWithdrawal} onChange={(v: any) => setConfig({...config, minWithdrawal: v})} />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-8 group relative overflow-hidden h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                <div className="relative z-10 flex items-center justify-center gap-3 text-white uppercase italic font-black text-xs tracking-widest">
                  {saving ? <RefreshCw className="animate-spin" /> : <Save size={18} />}
                  <span>{saving ? "SYNCING..." : "DEPLOY CHANGES"}</span>
                </div>
              </button>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={loadData} className="h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 transition-all">
                <RefreshCw size={20} />
              </button>
              <button type="button" className="h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 transition-all">
                <Database size={20} />
              </button>
            </div>
          </div>
        </form>

        {/* SECTION LOGS (RESTRICTION VISUELLE) */}
        <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-8">
           <div className="flex items-center gap-3 mb-8">
              <RotateCcw size={18} className="text-orange-500" />
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Audit Trail</h2>
           </div>
           
           <div className="space-y-3">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl hover:bg-white/[0.02] transition-all group">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-blue-500 border border-white/5">
                        {log.adminName?.[0]}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white uppercase">{log.adminName}</p>
                        <p className="text-[9px] text-slate-500 font-mono line-clamp-1">{log.details}</p>
                      </div>
                   </div>
                   <p className="text-[9px] font-mono text-slate-600 group-hover:text-blue-500 transition-colors">
                    {new Date(log.createdAt).toLocaleTimeString()}
                   </p>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
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

function FinancialInput({ label, value, onChange, icon }: any) {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center gap-2 ml-1">
        <span className="text-slate-500 group-focus-within:text-blue-500 transition-colors">{icon}</span>
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      </div>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-950/50 border border-white/5 rounded-xl p-4 text-white font-mono focus:border-blue-500/50 outline-none transition-all shadow-inner"
      />
    </div>
  );
}
