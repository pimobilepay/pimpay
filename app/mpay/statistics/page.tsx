"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, BarChart3, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const pieData = [
  { name: "Paiements envoyes", value: 300, color: "#3b82f6" },
  { name: "Paiements recus", value: 500, color: "#10b981" },
  { name: "Swaps", value: 973, color: "#6366f1" },
  { name: "Recharge Mobile", value: 636, color: "#f59e0b" },
];

const barData = [
  { name: "Lun", sent: 12, received: 8 },
  { name: "Mar", sent: 19, received: 15 },
  { name: "Mer", sent: 8, received: 22 },
  { name: "Jeu", sent: 25, received: 12 },
  { name: "Ven", sent: 14, received: 30 },
  { name: "Sam", sent: 32, received: 18 },
  { name: "Dim", sent: 10, received: 5 },
];

const recentTx = [
  { type: "sent", name: "PimShop", amount: "2.5", time: "14:30" },
  { type: "received", name: "Amadou", amount: "10.0", time: "12:15" },
  { type: "sent", name: "PiFood", amount: "8.0", time: "20:45" },
  { type: "received", name: "Ibrahim", amount: "25.0", time: "09:30" },
];

type Period = "jour" | "semaine" | "mois";

export default function MPayStatisticsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState<Period>("semaine");

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

  const totalVolume = pieData.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button onClick={() => router.back()} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">Statistiques</h1>
          <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase">mPay Analytics</p>
        </div>
        <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-500">
          <BarChart3 size={18} />
        </div>
      </header>

      <main className="px-6 pt-6 pb-28 space-y-6">
        {/* Period Selector */}
        <div className="flex gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-2xl">
          {(["jour", "semaine", "mois"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                period === p ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp size={14} className="text-emerald-500" />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Recu</span>
            </div>
            <p className="text-2xl font-black tracking-tight">500 <span className="text-sm text-blue-500">Pi</span></p>
            <p className="text-[9px] font-bold text-emerald-400 mt-1">+24% vs sem. derniere</p>
          </div>
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-red-500/10 rounded-xl flex items-center justify-center">
                <TrendingDown size={14} className="text-red-400" />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Envoye</span>
            </div>
            <p className="text-2xl font-black tracking-tight">300 <span className="text-sm text-blue-500">Pi</span></p>
            <p className="text-[9px] font-bold text-red-400 mt-1">-8% vs sem. derniere</p>
          </div>
        </div>

        {/* Pie Chart */}
        <section className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight">Repartition</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total: {totalVolume.toLocaleString()} Pi</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-slate-500" />
              <span className="text-[9px] font-bold text-slate-500 uppercase">{period}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="w-full h-52 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1200}
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "1rem",
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black">{Math.round((500 / totalVolume) * 100)}%</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Recu</span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[9px] font-bold text-slate-400">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-black">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bar Chart - Weekly Activity */}
        <section className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-6 animate-in fade-in duration-500 delay-100">
          <h2 className="text-sm font-black uppercase tracking-tight mb-1">Activite Hebdomadaire</h2>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-6">Envoye vs Recu (Pi)</p>

          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "1rem",
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                />
                <Bar dataKey="sent" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Envoye" />
                <Bar dataKey="received" fill="#10b981" radius={[6, 6, 0, 0]} name="Recu" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-[9px] font-bold text-slate-400">Envoye</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-bold text-slate-400">Recu</span>
            </div>
          </div>
        </section>

        {/* Quick Stats Grid */}
        <section className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-6 animate-in fade-in duration-500 delay-200">
          <h2 className="text-sm font-black uppercase tracking-tight mb-4">Metriques Cles</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-tight mb-1">Volume / Heure</p>
              <p className="text-lg font-black text-emerald-400">+24%</p>
            </div>
            <div className="text-center border-l border-white/5">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-tight mb-1">Tx / Mois</p>
              <p className="text-lg font-black text-blue-500">142</p>
            </div>
            <div className="text-center border-l border-white/5">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-tight mb-1">Net / Mois</p>
              <p className="text-lg font-black text-emerald-400">+200 Pi</p>
            </div>
          </div>
        </section>

        {/* Recent Transactions Mini */}
        <section className="bg-slate-900/40 border border-white/10 rounded-[2rem] overflow-hidden animate-in fade-in duration-500 delay-300">
          <div className="p-6 pb-3">
            <h2 className="text-sm font-black uppercase tracking-tight">Dernieres Transactions</h2>
          </div>
          <div className="divide-y divide-white/5">
            {recentTx.map((tx, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === "sent" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                  {tx.type === "sent" ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black uppercase tracking-tight">{tx.name}</p>
                  <p className="text-[9px] font-bold text-slate-600">{tx.time}</p>
                </div>
                <p className={`text-sm font-black ${tx.type === "sent" ? "text-red-400" : "text-emerald-400"}`}>
                  {tx.type === "sent" ? "-" : "+"}{tx.amount} Pi
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
