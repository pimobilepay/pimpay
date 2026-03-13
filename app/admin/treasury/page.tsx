"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Landmark,
  Clock,
  AlertTriangle,
  Coins,
  ArrowRightLeft,
  ChevronRight,
  Shield,
  DollarSign,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// --- TYPES ---
type TreasurySummary = {
  totalBalance: number;
  totalTransactionVolume: number;
  pendingVolume: number;
  pendingCount: number;
  totalWallets: number;
};

type CurrencyBreakdown = {
  currency: string;
  balance: number;
  accounts: number;
};

type TransactionByType = {
  type: string;
  volume: number;
  count: number;
};

type ChartDataPoint = {
  day: string;
  deposits: number;
  withdrawals: number;
  transfers: number;
};

type PendingTransaction = {
  id: string;
  amount: number;
  currency: string;
  type: string;
  createdAt: string;
};

type LargeTransaction = {
  id: string;
  amount: number;
  currency: string;
  type: string;
  createdAt: string;
  fromUser?: { username: string | null; email: string | null };
  toUser?: { username: string | null; email: string | null };
};

type TreasuryData = {
  summary: TreasurySummary;
  currencyBreakdown: CurrencyBreakdown[];
  transactionsByType: TransactionByType[];
  chartData: ChartDataPoint[];
  pendingTransactions: PendingTransaction[];
  largeTransactions: LargeTransaction[];
};

// --- CONSTANTS ---
const CURRENCY_COLORS: Record<string, string> = {
  PI: "#f59e0b",
  XAF: "#3b82f6",
  USD: "#10b981",
  EUR: "#8b5cf6",
  USDT: "#22c55e",
  BTC: "#f97316",
  ETH: "#6366f1",
  XRP: "#0ea5e9",
  XLM: "#14b8a6",
  SIDRA: "#ec4899",
  DEFAULT: "#64748b",
};

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Depots",
  WITHDRAW: "Retraits",
  TRANSFER: "Transferts",
  EXCHANGE: "Echanges",
  AIRTIME: "Recharges",
  CARD: "Cartes",
  DEFAULT: "Autres",
};

// --- HELPERS ---
function formatCurrency(amount: number, compact = false): string {
  if (compact && amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  }
  if (compact && amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

// --- COMPONENTS ---
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  color: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5 flex flex-col gap-3 hover:bg-slate-900/80 transition-all">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${
              trend === "up"
                ? "bg-emerald-500/10 text-emerald-400"
                : trend === "down"
                ? "bg-red-500/10 text-red-400"
                : "bg-slate-500/10 text-slate-400"
            }`}
          >
            {trend === "up" ? <ArrowUpRight size={12} /> : trend === "down" ? <ArrowDownRight size={12} /> : null}
            {trend === "up" ? "Hausse" : trend === "down" ? "Baisse" : "Stable"}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-white tracking-tight">{value}</p>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] mt-1">{label}</p>
        {subValue && <p className="text-[9px] text-slate-600 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[3px] mb-4">{children}</h2>;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl p-3 shadow-2xl">
      <p className="text-[10px] font-bold text-slate-400 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px]">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-bold">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl p-3 shadow-2xl">
      <div className="flex items-center gap-2 text-[10px]">
        <div className="w-2 h-2 rounded-full" style={{ background: d.payload.fill }} />
        <span className="text-slate-400">{d.name}:</span>
        <span className="text-white font-bold">{formatCurrency(d.value)}</span>
      </div>
    </div>
  );
}

// --- PAGE ---
export default function TreasuryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TreasuryData | null>(null);
  const [chartTab, setChartTab] = useState<"all" | "deposits" | "withdrawals">("all");

  const fetchTreasury = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/treasury");
      if (!res.ok) throw new Error("Erreur API");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Impossible de charger les donnees de tresorerie");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasury();
  }, []);

  // Prepare pie chart data
  const pieData = useMemo(() => {
    if (!data) return [];
    return data.currencyBreakdown
      .filter((c) => c.balance > 0)
      .map((c) => ({
        name: c.currency,
        value: c.balance,
        fill: CURRENCY_COLORS[c.currency] || CURRENCY_COLORS.DEFAULT,
      }));
  }, [data]);

  // Prepare bar chart data for transaction types
  const typeBarData = useMemo(() => {
    if (!data) return [];
    return data.transactionsByType.map((t) => ({
      type: TYPE_LABELS[t.type] || TYPE_LABELS.DEFAULT,
      volume: t.volume,
      count: t.count,
      fill: t.type === "DEPOSIT" ? "#10b981" : t.type === "WITHDRAW" ? "#ef4444" : "#3b82f6",
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[5px]">Chargement Tresorerie...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6">
        <div className="bg-slate-900/60 border border-red-500/20 rounded-[1.5rem] p-8 text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Landmark size={24} className="text-red-400" />
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-wider mb-2">Erreur de chargement</h2>
          <p className="text-[10px] text-slate-500 mb-6">
            Impossible de charger les donnees de tresorerie. Veuillez reessayer.
          </p>
          <button
            onClick={fetchTreasury}
            className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            <RefreshCw size={14} />
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  const { summary, chartData, pendingTransactions, largeTransactions, currencyBreakdown } = data;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32" translate="no">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.push("/admin")}
            className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-[4px]">PimPay</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Tresorerie</h1>
          </div>
          <button
            onClick={fetchTreasury}
            className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-8">
        {/* SUMMARY CARDS */}
        <div>
          <SectionTitle>Vue d{"'"}Ensemble</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={PiggyBank}
              label="Solde Total"
              value={formatCurrency(summary.totalBalance, true)}
              subValue={`${summary.totalWallets} portefeuilles`}
              color="bg-amber-500/10 text-amber-400"
              trend="up"
            />
            <StatCard
              icon={TrendingUp}
              label="Volume Total"
              value={formatCurrency(summary.totalTransactionVolume, true)}
              subValue="Transactions reussies"
              color="bg-emerald-500/10 text-emerald-400"
              trend="up"
            />
            <StatCard
              icon={Clock}
              label="En Attente"
              value={formatCurrency(summary.pendingVolume, true)}
              subValue={`${summary.pendingCount} transactions`}
              color="bg-orange-500/10 text-orange-400"
              trend={summary.pendingCount > 5 ? "down" : "neutral"}
            />
            <StatCard
              icon={Wallet}
              label="Portefeuilles"
              value={summary.totalWallets.toLocaleString("fr-FR")}
              subValue={`${currencyBreakdown.length} devises`}
              color="bg-blue-500/10 text-blue-400"
              trend="neutral"
            />
          </div>
        </div>

        {/* CURRENCY BREAKDOWN */}
        <div>
          <SectionTitle>Repartition par Devise</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Pie Chart */}
              <div className="flex-1 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex-1 flex flex-col justify-center gap-2">
                {currencyBreakdown.slice(0, 6).map((c) => (
                  <div key={c.currency} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: CURRENCY_COLORS[c.currency] || CURRENCY_COLORS.DEFAULT }}
                      />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{c.currency}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black text-white">{formatCurrency(c.balance, true)}</p>
                      <p className="text-[8px] text-slate-600">{c.accounts} comptes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* VOLUME CHART */}
        <div>
          <SectionTitle>Volume 7 Jours</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
            {/* Tabs */}
            <div className="flex gap-2 mb-5">
              {(
                [
                  { key: "all", label: "Tout" },
                  { key: "deposits", label: "Depots" },
                  { key: "withdrawals", label: "Retraits" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setChartTab(t.key)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                    chartTab === t.key
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white/5 text-slate-500 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradDeposits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradWithdrawals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradTransfers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#475569", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  {(chartTab === "all" || chartTab === "deposits") && (
                    <Area
                      type="monotone"
                      dataKey="deposits"
                      name="Depots"
                      stroke="#10b981"
                      fill="url(#gradDeposits)"
                      strokeWidth={2}
                    />
                  )}
                  {(chartTab === "all" || chartTab === "withdrawals") && (
                    <Area
                      type="monotone"
                      dataKey="withdrawals"
                      name="Retraits"
                      stroke="#ef4444"
                      fill="url(#gradWithdrawals)"
                      strokeWidth={2}
                    />
                  )}
                  {chartTab === "all" && (
                    <Area
                      type="monotone"
                      dataKey="transfers"
                      name="Transferts"
                      stroke="#3b82f6"
                      fill="url(#gradTransfers)"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* TRANSACTION TYPES */}
        <div>
          <SectionTitle>Volume par Type</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="type"
                    tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="volume" name="Volume" radius={[0, 8, 8, 0]}>
                    {typeBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PENDING TRANSACTIONS */}
        {pendingTransactions.length > 0 && (
          <div>
            <SectionTitle>
              <span className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-orange-400" />
                Transactions en Attente ({pendingTransactions.length})
              </span>
            </SectionTitle>
            <div className="space-y-2">
              {pendingTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-slate-900/60 border border-orange-500/10 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <Clock size={16} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white uppercase">{tx.type}</p>
                      <p className="text-[8px] text-slate-500 font-mono">{tx.id.slice(0, 12)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-orange-400">
                      {formatCurrency(tx.amount)} {tx.currency}
                    </p>
                    <p className="text-[8px] text-slate-600">{formatTimeAgo(tx.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push("/admin/transactions")}
              className="w-full mt-4 py-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-orange-400 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              Gerer les transactions <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* LARGE TRANSACTIONS */}
        <div>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <Activity size={12} className="text-blue-400" />
              Grosses Transactions Recentes
            </span>
          </SectionTitle>
          {largeTransactions.length > 0 ? (
            <div className="space-y-2">
              {largeTransactions.slice(0, 8).map((tx) => (
                <div
                  key={tx.id}
                  className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between hover:bg-slate-900/80 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.type === "DEPOSIT"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : tx.type === "WITHDRAW"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {tx.type === "DEPOSIT" ? (
                        <TrendingUp size={16} />
                      ) : tx.type === "WITHDRAW" ? (
                        <TrendingDown size={16} />
                      ) : (
                        <ArrowRightLeft size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white uppercase">{TYPE_LABELS[tx.type] || tx.type}</p>
                      <p className="text-[8px] text-slate-500">
                        {tx.fromUser?.username || tx.toUser?.username || tx.fromUser?.email || tx.toUser?.email || "User"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-black ${
                        tx.type === "DEPOSIT"
                          ? "text-emerald-400"
                          : tx.type === "WITHDRAW"
                          ? "text-red-400"
                          : "text-blue-400"
                      }`}
                    >
                      {tx.type === "WITHDRAW" ? "-" : "+"}
                      {formatCurrency(tx.amount)} {tx.currency}
                    </p>
                    <p className="text-[8px] text-slate-600">{formatTimeAgo(tx.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Coins size={20} className="text-slate-600" />
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Aucune grosse transaction recente
              </p>
            </div>
          )}
        </div>

        {/* SECURITY FOOTER */}
        <div className="flex flex-col items-center gap-2 opacity-20 pt-8">
          <Shield size={14} />
          <p className="text-[8px] font-black uppercase tracking-[0.4em]">PimPay Treasury Secure v1.0</p>
        </div>
      </div>
    </div>
  );
}
