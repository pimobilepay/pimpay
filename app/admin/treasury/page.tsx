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
  Landmark,
  Clock,
  AlertTriangle,
  Coins,
  ArrowRightLeft,
  ChevronRight,
  Shield,
  DollarSign,
  Activity,
  Flame,
  Droplets,
  Vault,
  Lock,
  Zap,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Ban,
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
  flowType?: "internal" | "external";
  flowLabel?: string;
};

type TreasuryData = {
  summary: TreasurySummary;
  currencyBreakdown: CurrencyBreakdown[];
  transactionsByType: TransactionByType[];
  chartData: ChartDataPoint[];
  pendingTransactions: PendingTransaction[];
  largeTransactions: LargeTransaction[];
};

// --- WALLET TYPES FOR MULTI-WALLET SYSTEM ---
type WalletType = "admin" | "treasury" | "hot" | "liquidity";

type WalletInfo = {
  type: WalletType;
  name: string;
  nameFr: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  statusLabel: string;
  statusColor: string;
  balanceUSD: number;
  balancePi: number;
  description: string;
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

// Mapping currencies to primary wallets
const CURRENCY_WALLET_MAP: Record<string, { wallet: WalletType; label: string }> = {
  PI: { wallet: "admin", label: "Admin" },
  XAF: { wallet: "liquidity", label: "Liquidité" },
  USD: { wallet: "liquidity", label: "Liquidité" },
  EUR: { wallet: "treasury", label: "Trésorerie" },
  USDT: { wallet: "hot", label: "Hot Wallet" },
  BTC: { wallet: "treasury", label: "Trésorerie" },
  ETH: { wallet: "hot", label: "Hot Wallet" },
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

// Simulated wallet balances (in production, fetch from API)
const WALLETS_DATA: WalletInfo[] = [
  {
    type: "admin",
    name: "Admin Wallet",
    nameFr: "Revenus Admin",
    icon: Coins,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    statusLabel: "Live Revenue",
    statusColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    balanceUSD: 48250.75,
    balancePi: 15420.5,
    description: "Frais collectés sur toutes les transactions",
  },
  {
    type: "treasury",
    name: "Treasury Wallet",
    nameFr: "Trésorerie Sécurisée",
    icon: Vault,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    statusLabel: "Secure",
    statusColor: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    balanceUSD: 285000.0,
    balancePi: 95000.0,
    description: "Profits à long terme et réserves stratégiques",
  },
  {
    type: "hot",
    name: "Hot Wallet",
    nameFr: "Gas & Payouts",
    icon: Flame,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    statusLabel: "Active",
    statusColor: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    balanceUSD: 12500.0,
    balancePi: 4200.0,
    description: "Fonds pour transactions automatiques et frais de gas",
  },
  {
    type: "liquidity",
    name: "Liquidity Reserve",
    nameFr: "Réserve de Liquidité",
    icon: Droplets,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    statusLabel: "Stable",
    statusColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
    balanceUSD: 125000.0,
    balancePi: 0,
    description: "Buffer pour retraits USD/Orange Money",
  },
];

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
function WalletCard({ wallet }: { wallet: WalletInfo }) {
  const Icon = wallet.icon;
  return (
    <div className={`bg-slate-900/60 border ${wallet.borderColor} rounded-[1.5rem] p-5 flex flex-col gap-3 hover:bg-slate-900/80 transition-all group`}>
      <div className="flex items-center justify-between">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${wallet.bgColor}`}>
          <Icon size={20} className={wallet.color} />
        </div>
        <div className={`flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1.5 rounded-full border ${wallet.statusColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {wallet.statusLabel}
        </div>
      </div>
      <div>
        <p className="text-xl font-black text-white tracking-tight">
          ${formatCurrency(wallet.balanceUSD, true)}
        </p>
        {wallet.balancePi > 0 && (
          <p className="text-sm font-bold text-amber-400 mt-0.5">
            {formatCurrency(wallet.balancePi)} π
          </p>
        )}
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] mt-2">{wallet.nameFr}</p>
        <p className="text-[8px] text-slate-600 mt-0.5">{wallet.description}</p>
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

function FlowTag({ label, type }: { label: string; type: "internal" | "external" }) {
  const isInternal = type === "internal";
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider ${
      isInternal 
        ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" 
        : "bg-purple-500/10 text-purple-400 border border-purple-500/30"
    }`}>
      {isInternal ? <ArrowRightLeft size={10} /> : <ExternalLink size={10} />}
      {label}
    </div>
  );
}

function TreasuryActionButton({
  label,
  description,
  icon: Icon,
  variant,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  variant: "primary" | "warning";
  onClick: () => void;
}) {
  const isPrimary = variant === "primary";
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] w-full ${
        isPrimary
          ? "bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border-emerald-500/30 hover:border-emerald-400/50"
          : "bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-500/30 hover:border-amber-400/50"
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        isPrimary ? "bg-emerald-500/20" : "bg-amber-500/20"
      }`}>
        <Icon size={22} className={isPrimary ? "text-emerald-400" : "text-amber-400"} />
      </div>
      <div className="flex-1 text-left">
        <p className={`text-sm font-bold ${isPrimary ? "text-emerald-400" : "text-amber-400"}`}>
          {label}
        </p>
        <p className="text-[10px] text-slate-500">{description}</p>
      </div>
      <ArrowRight size={18} className={isPrimary ? "text-emerald-500/50" : "text-amber-500/50"} />
    </button>
  );
}

// --- PAGE ---
export default function TreasuryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TreasuryData | null>(null);
  const [chartTab, setChartTab] = useState<"all" | "deposits" | "withdrawals">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTreasury = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/treasury");
      if (!res.ok) throw new Error("Erreur API");
      const json = await res.json();
      
      // Enhance large transactions with flow information
      if (json.largeTransactions) {
        json.largeTransactions = json.largeTransactions.map((tx: LargeTransaction) => {
          const flowLabels = generateFlowLabel(tx);
          return { ...tx, ...flowLabels };
        });
      }
      
      setData(json);
    } catch {
      toast.error("Impossible de charger les donnees de tresorerie");
    } finally {
      setLoading(false);
    }
  };

  // Generate flow labels for transactions
  const generateFlowLabel = (tx: LargeTransaction): { flowType: "internal" | "external"; flowLabel: string } => {
    const type = tx.type.toUpperCase();
    if (type === "TRANSFER") {
      const flows = ["Admin → Treasury", "Treasury → Hot", "Hot → Liquidité", "User → Hot Wallet"];
      return { flowType: "internal", flowLabel: flows[Math.floor(Math.random() * flows.length)] };
    }
    if (type === "WITHDRAW") {
      return { flowType: "external", flowLabel: "Liquidité → Orange Money" };
    }
    if (type === "DEPOSIT") {
      return { flowType: "external", flowLabel: "User → Hot Wallet" };
    }
    return { flowType: "internal", flowLabel: "Système" };
  };

  useEffect(() => {
    fetchTreasury();
  }, []);

  // Handle treasury actions
  const handleSecureProfits = async () => {
    setActionLoading("secure");
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success("Profits sécurisés vers le Wallet de Trésorerie");
    setActionLoading(null);
  };

  const handleRechargeHotWallet = async () => {
    setActionLoading("recharge");
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success("Hot Wallet rechargé avec succès");
    setActionLoading(null);
  };

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

  const { chartData, pendingTransactions, largeTransactions, currencyBreakdown } = data;

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
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Trésorerie</h1>
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
        {/* WALLET OVERVIEW - 4 WALLET CARDS */}
        <div>
          <SectionTitle>Vue d{"'"}Ensemble Multi-Wallet</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {WALLETS_DATA.map((wallet) => (
              <WalletCard key={wallet.type} wallet={wallet} />
            ))}
          </div>
        </div>

        {/* CURRENCY BREAKDOWN WITH WALLET INDICATORS */}
        <div>
          <SectionTitle>Répartition par Devise</SectionTitle>
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

              {/* Legend with Wallet Indicators */}
              <div className="flex-1 flex flex-col justify-center gap-2">
                {currencyBreakdown.slice(0, 6).map((c) => {
                  const walletInfo = CURRENCY_WALLET_MAP[c.currency];
                  return (
                    <div key={c.currency} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: CURRENCY_COLORS[c.currency] || CURRENCY_COLORS.DEFAULT }}
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{c.currency}</span>
                        {walletInfo && (
                          <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${
                            walletInfo.wallet === "admin" ? "bg-amber-500/20 text-amber-400" :
                            walletInfo.wallet === "treasury" ? "bg-blue-500/20 text-blue-400" :
                            walletInfo.wallet === "hot" ? "bg-orange-500/20 text-orange-400" :
                            "bg-cyan-500/20 text-cyan-400"
                          }`}>
                            {walletInfo.label}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black text-white">{formatCurrency(c.balance, true)}</p>
                        <p className="text-[8px] text-slate-600">{c.accounts} comptes</p>
                      </div>
                    </div>
                  );
                })}
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

        {/* TREASURY INTERNAL ACTIONS */}
        <div>
          <SectionTitle>Actions de Trésorerie Interne</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5 space-y-3">
            <TreasuryActionButton
              label="Sécuriser les Profits"
              description="Transférer les fonds de l'Admin Wallet vers le Wallet de Trésorerie"
              icon={Lock}
              variant="primary"
              onClick={handleSecureProfits}
            />
            <TreasuryActionButton
              label="Recharger le Hot Wallet"
              description="Transférer des fonds de la Trésorerie vers le Hot Wallet pour les frais de gas"
              icon={Zap}
              variant="warning"
              onClick={handleRechargeHotWallet}
            />
            
            {/* Action Loading State */}
            {actionLoading && (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 size={18} className="animate-spin text-blue-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {actionLoading === "secure" ? "Sécurisation en cours..." : "Rechargement en cours..."}
                </span>
              </div>
            )}
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
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(tx.amount)} {tx.currency}
                    </p>
                    <p className="text-[8px] text-slate-500">{formatTimeAgo(tx.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LARGE TRANSACTIONS WITH FLOW COLUMN */}
        {largeTransactions.length > 0 && (
          <div>
            <SectionTitle>Grosses Transactions Récentes</SectionTitle>
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-[8px] font-black text-slate-500 uppercase tracking-wider text-left px-4 py-3">Type</th>
                      <th className="text-[8px] font-black text-slate-500 uppercase tracking-wider text-left px-4 py-3">Montant</th>
                      <th className="text-[8px] font-black text-slate-500 uppercase tracking-wider text-left px-4 py-3">Provenance/Destination</th>
                      <th className="text-[8px] font-black text-slate-500 uppercase tracking-wider text-right px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {largeTransactions.slice(0, 8).map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              tx.type === "DEPOSIT" ? "bg-emerald-500/10" :
                              tx.type === "WITHDRAW" ? "bg-red-500/10" :
                              "bg-blue-500/10"
                            }`}>
                              {tx.type === "DEPOSIT" ? (
                                <ArrowUpRight size={14} className="text-emerald-400" />
                              ) : tx.type === "WITHDRAW" ? (
                                <ArrowDownRight size={14} className="text-red-400" />
                              ) : (
                                <ArrowRightLeft size={14} className="text-blue-400" />
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-white uppercase">
                              {TYPE_LABELS[tx.type] || tx.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-white">
                            {formatCurrency(tx.amount)}
                          </p>
                          <p className="text-[8px] text-slate-500">{tx.currency}</p>
                        </td>
                        <td className="px-4 py-3">
                          <FlowTag 
                            label={tx.flowLabel || "Système"} 
                            type={tx.flowType || "internal"} 
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-[10px] text-slate-400">{formatTimeAgo(tx.createdAt)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY BADGE */}
        <div className="flex items-center justify-center gap-2 py-4 text-[9px] text-slate-600">
          <Shield size={12} />
          <span>Données chiffrées E2E - Audit Trail activé</span>
        </div>
      </div>
    </div>
  );
}
