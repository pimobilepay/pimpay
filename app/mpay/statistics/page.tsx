"use client";

import { useState, useEffect, useMemo } from "react";
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

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  type: string;
  status: string;
  createdAt: string;
  fromUserId: string;
  toUserId: string;
  fromUser?: { username: string; name: string };
  toUser?: { username: string; name: string };
}

type Period = "jour" | "semaine" | "mois";

export default function MPayStatisticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("semaine");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch user profile to get userId
        const profileRes = await fetch("/api/user/profile");
        const profileData = await profileRes.json();
        if (profileData.success && profileData.user) {
          setUserId(profileData.user.id);
        }

        // Fetch transactions
        const txRes = await fetch("/api/transaction/history");
        const txData = await txRes.json();
        if (Array.isArray(txData)) {
          setTransactions(txData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "jour":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "semaine":
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start of week
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
        break;
      case "mois":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    return transactions.filter((tx) => new Date(tx.createdAt) >= startDate);
  }, [transactions, period]);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    if (!userId || filteredTransactions.length === 0) {
      return {
        totalSent: 0,
        totalReceived: 0,
        txCount: 0,
        recentTx: [],
        pieData: [
          { name: "Envoyes", value: 0, color: "#3b82f6" },
          { name: "Recus", value: 0, color: "#10b981" },
        ],
        barData: [],
      };
    }

    let totalSent = 0;
    let totalReceived = 0;
    const recentTx: { type: string; name: string; amount: string; time: string }[] = [];
    const dayData: Record<string, { sent: number; received: number }> = {};
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

    filteredTransactions.forEach((tx) => {
      const isSent = tx.fromUserId === userId;
      const amount = tx.amount || 0;
      const date = new Date(tx.createdAt);
      const dayName = dayNames[date.getDay()];

      if (isSent) {
        totalSent += amount;
      } else {
        totalReceived += amount;
      }

      // Build day data for bar chart
      if (!dayData[dayName]) {
        dayData[dayName] = { sent: 0, received: 0 };
      }
      if (isSent) {
        dayData[dayName].sent += amount;
      } else {
        dayData[dayName].received += amount;
      }

      // Build recent transactions (first 4)
      if (recentTx.length < 4) {
        const contactName = isSent 
          ? (tx.toUser?.name || tx.toUser?.username || "Utilisateur")
          : (tx.fromUser?.name || tx.fromUser?.username || "Utilisateur");
        recentTx.push({
          type: isSent ? "sent" : "received",
          name: contactName,
          amount: amount.toFixed(1),
          time: date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        });
      }
    });

    // Build bar data ordered by day
    const orderedDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const barData = orderedDays.map((day) => ({
      name: day,
      sent: Math.round(dayData[day]?.sent || 0),
      received: Math.round(dayData[day]?.received || 0),
    }));

    return {
      totalSent: Math.round(totalSent * 100) / 100,
      totalReceived: Math.round(totalReceived * 100) / 100,
      txCount: transactions.length,
      recentTx,
      pieData: [
        { name: "Envoyes", value: Math.round(totalSent), color: "#3b82f6" },
        { name: "Recus", value: Math.round(totalReceived), color: "#10b981" },
      ],
      barData,
    };
  }, [filteredTransactions, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const totalVolume = stats.pieData.reduce((acc, item) => acc + item.value, 0);

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
            <p className="text-2xl font-black tracking-tight">{stats.totalReceived} <span className="text-sm text-blue-500">Pi</span></p>
            <p className="text-[9px] font-bold text-emerald-400 mt-1">{stats.txCount} transactions</p>
          </div>
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-red-500/10 rounded-xl flex items-center justify-center">
                <TrendingDown size={14} className="text-red-400" />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Envoye</span>
            </div>
            <p className="text-2xl font-black tracking-tight">{stats.totalSent} <span className="text-sm text-blue-500">Pi</span></p>
            <p className="text-[9px] font-bold text-slate-400 mt-1">Total envoye</p>
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
                    data={stats.pieData}
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
                    {stats.pieData.map((entry, index) => (
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
                <span className="text-2xl font-black">{totalVolume > 0 ? Math.round((stats.totalReceived / totalVolume) * 100) : 0}%</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Recu</span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {stats.pieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[9px] font-bold text-slate-400">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-black">{item.value} Pi</span>
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
              <BarChart data={stats.barData} barGap={2}>
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
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-tight mb-1">Total Volume</p>
              <p className="text-lg font-black text-emerald-400">{totalVolume} Pi</p>
            </div>
            <div className="text-center border-l border-white/5">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-tight mb-1">Transactions</p>
              <p className="text-lg font-black text-blue-500">{stats.txCount}</p>
            </div>
            <div className="text-center border-l border-white/5">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-tight mb-1">Net</p>
              <p className={`text-lg font-black ${stats.totalReceived - stats.totalSent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {stats.totalReceived - stats.totalSent >= 0 ? "+" : ""}{(stats.totalReceived - stats.totalSent).toFixed(1)} Pi
              </p>
            </div>
          </div>
        </section>

        {/* Recent Transactions Mini */}
        <section className="bg-slate-900/40 border border-white/10 rounded-[2rem] overflow-hidden animate-in fade-in duration-500 delay-300">
          <div className="p-6 pb-3">
            <h2 className="text-sm font-black uppercase tracking-tight">Dernieres Transactions</h2>
          </div>
          <div className="divide-y divide-white/5">
            {stats.recentTx.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Aucune transaction</p>
              </div>
            ) : (
              stats.recentTx.map((tx, i) => (
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
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
