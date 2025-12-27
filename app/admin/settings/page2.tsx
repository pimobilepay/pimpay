"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Settings, Cpu, Globe, Wallet, 
  ShieldAlert, Save, RefreshCw, 
  TrendingUp, AlertTriangle, Zap,
  BarChart3, Info
} from "lucide-react";

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/admin/config");
        if (!res.ok) throw new Error("Erreur serveur");
        const data = await res.json();
        setConfig(data);
      } catch (error) {
        toast.error("Échec du chargement du noyau");
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

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
        toast.success("Noyau système synchronisé avec succès");
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
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-[#050505]">
      <div className="relative">
        <div className="w-20 h-20 border-2 border-blue-500/20 rounded-full animate-ping absolute inset-0"></div>
        <div className="w-20 h-20 border-t-2 border-blue-500 rounded-full animate-spin relative z-10"></div>
      </div>
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.5em] text-blue-500 animate-pulse">Decrypting System Core...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-500/30">
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        
        {/* HEADER AREA */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Settings className="text-blue-500" size={24} />
              </div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                System<span className="text-blue-600">Core</span>
              </h1>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              PimPay Mainnet Protocol Settings
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500 font-bold uppercase">Uptime Ratio</p>
              <p className="text-sm font-mono font-bold text-white">99.98%</p>
            </div>
            <div className="h-10 w-px bg-white/10 mx-2"></div>
            <button 
              onClick={() => window.location.reload()}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all active:scale-95"
            >
              <RefreshCw size={20} className="text-slate-400" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMN 1: NETWORK CONFIG */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* SECTION: GLOBAL CONFIG */}
              <div className="group bg-white/[0.02] border border-white/5 hover:border-blue-500/30 p-8 rounded-[2.5rem] transition-all duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                    <Globe size={20} />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Global Protocol</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Version ID</label>
                    <input
                      type="text"
                      value={config.appVersion}
                      onChange={(e) => setConfig({ ...config, appVersion: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-mono focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <label className="w-full bg-black/20 border border-white/5 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all group">
                      <input
                        type="checkbox"
                        checked={config.forceUpdate}
                        onChange={(e) => setConfig({ ...config, forceUpdate: e.target.checked })}
                        className="w-5 h-5 accent-blue-600 rounded-md"
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Force Upgrade Protocol</span>
                    </label>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Network Broadcast Notice</label>
                    <textarea
                      value={config.globalAnnouncement}
                      onChange={(e) => setConfig({ ...config, globalAnnouncement: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-blue-500 outline-none transition-all"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: MAINTENANCE */}
              <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 ${config.maintenanceMode ? 'bg-red-500/5 border-red-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${config.maintenanceMode ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 text-slate-500'}`}>
                      <ShieldAlert size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Firewall Maintenance</h3>
                      <p className="text-xs text-slate-500 max-w-xs">Restrict access to non-admin nodes immediately.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })}
                    className={`px-8 py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all active:scale-95 ${config.maintenanceMode ? 'bg-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.2)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    {config.maintenanceMode ? "OFFLINE" : "ONLINE"}
                  </button>
                </div>
              </div>
            </div>

            {/* COLUMN 2: FINANCIAL CORE */}
            <div className="space-y-8">
              <div className="bg-gradient-to-b from-blue-600/10 to-transparent border border-blue-500/20 p-8 rounded-[2.5rem]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400">
                    <BarChart3 size={20} />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Financial Core</h2>
                </div>

                <div className="space-y-6">
                  <FinancialInput 
                    icon={<Zap size={14}/>} 
                    label="GCV Consensus ($)" 
                    value={config.consensusPrice} 
                    onChange={(v) => setConfig({...config, consensusPrice: v})}
                  />
                  <FinancialInput 
                    icon={<TrendingUp size={14}/>} 
                    label="Staking APY (%)" 
                    value={config.stakingAPY} 
                    onChange={(v) => setConfig({...config, stakingAPY: v})}
                  />
                  <FinancialInput 
                    icon={<Wallet size={14}/>} 
                    label="Fee Percentage (%)" 
                    value={config.transactionFee} 
                    onChange={(v) => setConfig({...config, transactionFee: v})}
                  />
                  <FinancialInput 
                    icon={<AlertTriangle size={14}/>} 
                    label="Min Withdrawal (π)" 
                    value={config.minWithdrawal} 
                    onChange={(v) => setConfig({...config, minWithdrawal: v})}
                  />
                </div>

                <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-3">
                  <Info className="text-blue-500 shrink-0" size={16} />
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">
                    All financial values are applied globally in real-time to every Pi transaction.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full group relative overflow-hidden h-24 rounded-[2.5rem] bg-white transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <div className="relative z-10 flex items-center justify-center gap-4 text-black group-hover:text-white transition-colors">
                  {saving ? <RefreshCw className="animate-spin" /> : <Save size={24} />}
                  <span className="text-lg font-black uppercase tracking-[0.2em] italic">Commit Changes</span>
                </div>
              </button>
            </div>

          </div>

        </form>
      </div>
    </div>
  );
}

// Composant Interne pour les entrées financières stylisées
function FinancialInput({ label, value, onChange, icon }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 ml-1">
        <span className="text-blue-500">{icon}</span>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      </div>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-mono font-bold focus:border-blue-500 outline-none transition-all"
      />
    </div>
  );
}
