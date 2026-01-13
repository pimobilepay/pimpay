"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Info, LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// Couleurs basées sur l'image
const COLORS = ["#3b82f6", "#10b981", "#6366f1", "#f59e0b", "#06b6d4"];

const pieData = [
  { name: "Paiements envoyés", value: 300, color: "#3b82f6" },
  { name: "Paiements reçus", value: 500, color: "#10b981" },
  { name: "Swaps (Échanges)", value: 973, color: "#6366f1" },
  { name: "Recharge Mobile", value: 636, color: "#f59e0b" },
];

export default function MPayStatisticsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] px-6 pt-10 pb-28 font-sans text-white">
      
      {/* HEADER SECTION (Top Image) */}
      <header className="mb-10 p-6 rounded-[32px] bg-slate-900/40 border border-white/10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-2xl font-black tracking-tighter uppercase">Statistiques</h1>
            <button className="p-2 rounded-full bg-white/5 border border-white/10">
               <LayoutGrid size={18} className="text-slate-400" />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
             <button
                onClick={() => router.back()}
                className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/20 active:scale-95 transition-all"
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Next Navigation Active</p>
                 <h2 className="text-lg font-black uppercase italic tracking-tighter">ANALYSE_BOLD <span className="text-blue-500">PimPay</span></h2>
              </div>
          </div>
        </div>
      </header>

      {/* MAIN CHART CARD (Middle Image) */}
      <section className="p-6 rounded-[32px] border border-white/10 bg-slate-900/40 backdrop-blur-2xl shadow-2xl relative mb-6">
        <button className="absolute top-6 right-6 p-2 rounded-full bg-white/5">
           <Info size={16} className="text-slate-500" />
        </button>

        <div className="mb-8">
          <h2 className="text-xl font-black tracking-tight">Répartition des transactions</h2>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black italic">π #29.000</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total</span>
          </div>
          <p className="text-[9px] font-bold text-blue-500/60 uppercase tracking-widest mt-1">Total Flotte Id: 0.5</p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Pie Chart Animé */}
          <div className="w-full h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '15px', background: '#0f172a', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre du cercle */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black">88%</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
            </div>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full p-4 rounded-3xl bg-black/20 border border-white/5">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-bold text-slate-400">{item.name}</span>
                </div>
                <span className="text-[10px] font-black text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GRID INFOS COMPLÉMENTAIRES (Bottom Image) */}
      <section className="p-6 rounded-[32px] border border-white/10 bg-slate-900/40 relative">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Grid Info Complémentaire</h3>
           <LayoutGrid size={16} className="text-slate-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Volume Transaction / H</p>
            <p className="text-xl font-black text-emerald-400">+24%</p>
          </div>
          <div className="space-y-1 border-l border-white/5 pl-6">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Volume Transaction / Mois</p>
            <p className="text-xl font-black text-emerald-400">+24%</p>
          </div>
          <div className="space-y-1 border-l border-white/5 pl-6">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Engagement net / Mois</p>
            <p className="text-xl font-black text-blue-500">π 22.1</p>
          </div>
        </div>
      </section>
    </div>
  );
}
