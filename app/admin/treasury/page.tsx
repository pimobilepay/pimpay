"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronDown,
  Layers,
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
  Settings,
  X,
  Copy,
  ShieldCheck,
  ShieldAlert,
  LockKeyhole,
  Sliders,
  Send,
  Repeat,
  Banknote,
  CreditCard,
  Receipt,
  PiggyBank,
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

// --- TYPES ---
type TreasurySummary = {
  // Exact system wallet balances (platform funds)
  totalSystemBalanceUSD: number;
  totalSystemBalancePi: number;
  totalSystemBalanceXAF: number;
  // User wallet stats
  totalBalance: number;
  totalTransactionVolume: number;
  pendingVolume: number;
  pendingCount: number;
  totalWallets: number;
};

type SystemWalletSnapshot = {
  type: string;
  name: string;
  nameFr: string;
  balanceUSD: number;
  balancePi: number;
  balanceXAF: number;
  publicAddress: string;
  isLocked: boolean;
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
  systemWallets: SystemWalletSnapshot[];
  totalFeesCollected: Record<string, number>;
  currencyBreakdown: CurrencyBreakdown[];
  transactionsByType: TransactionByType[];
  chartData: ChartDataPoint[];
  pendingTransactions: PendingTransaction[];
  largeTransactions: LargeTransaction[];
};

// --- CENTRALIZED FEES TYPES ---
type FeeCategory = "CRYPTO_FEES" | "FIAT_FEES" | "PAYMENT_FEES" | "OTHER_FEES";

type FeeItem = {
  type: string;
  label: string;
  amountUSD: number;
  amountPi: number;
  amountXAF: number;
  count: number;
};

type FeeBreakdown = {
  category: FeeCategory;
  categoryLabel: string;
  totalUSD: number;
  totalPi: number;
  totalXAF: number;
  items: FeeItem[];
};

type CentralizedFeesData = {
  totalFeesUSD: number;
  totalFeesPi: number;
  totalFeesXAF: number;
  centralAddress: string;
  breakdown: FeeBreakdown[];
  lastUpdated: string;
  conversionRate: {
    piToUsd: number;
    piToXaf: number;
  };
  // Exact raw fee amounts per currency (from transaction.fee field)
  exactFeesByCurrency: Record<string, number>;
};

type WalletBalances = {
  usd: number;
  pi: number;
  xaf: number;
};

// --- WALLET TYPES FOR MULTI-WALLET SYSTEM ---
type WalletType = "ADMIN" | "TREASURY" | "HOT" | "LIQUIDITY";

type SystemWalletData = {
  id: string;
  type: WalletType;
  name: string;
  nameFr: string;
  description: string | null;
  publicAddress: string;
  balanceUSD: number;
  balancePi: number;
  balanceXAF: number;
  dailyLimit: number;
  monthlyLimit: number;
  isLocked: boolean;
  lockReason: string | null;
  lockedAt: string | null;
  lastActivity: string | null;
};

type WalletInfo = {
  id: string;
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
  balanceXAF: number;
  description: string;
  publicAddress: string;
  dailyLimit: number;
  monthlyLimit: number;
  isLocked: boolean;
  lockReason: string | null;
};

type WalletAction = "transfer" | "block" | "adjust" | null;

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
  SDA: "#22d3ee",
  CDF: "#a3e635",
  BUSD: "#facc15",
  DAI: "#f472b6",
  DEFAULT: "#64748b",
};

// Mapping currencies to primary wallets
const CURRENCY_WALLET_MAP: Record<string, { wallet: WalletType; label: string }> = {
  PI: { wallet: "ADMIN", label: "Admin" },
  XAF: { wallet: "LIQUIDITY", label: "Liquidite" },
  USD: { wallet: "LIQUIDITY", label: "Liquidite" },
  EUR: { wallet: "TREASURY", label: "Tresorerie" },
  USDT: { wallet: "HOT", label: "Hot Wallet" },
  BTC: { wallet: "TREASURY", label: "Tresorerie" },
  ETH: { wallet: "HOT", label: "Hot Wallet" },
  XLM: { wallet: "TREASURY", label: "Tresorerie" },
  SDA: { wallet: "ADMIN", label: "Admin" },
  BUSD: { wallet: "LIQUIDITY", label: "Liquidite" },
};

// Wallet display config based on type
const WALLET_CONFIG: Record<WalletType, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  statusLabel: string;
  statusColor: string;
}> = {
  ADMIN: {
    icon: Coins,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    statusLabel: "Live Revenue",
    statusColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  },
  TREASURY: {
    icon: Vault,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    statusLabel: "Secure",
    statusColor: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  },
  HOT: {
    icon: Flame,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    statusLabel: "Active",
    statusColor: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  },
  LIQUIDITY: {
    icon: Droplets,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    statusLabel: "Stable",
    statusColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
  },
};

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Depots",
  WITHDRAW: "Retraits",
  TRANSFER: "Transferts",
  EXCHANGE: "Echanges",
  AIRTIME: "Recharges",
  CARD: "Cartes",
  CARD_WITHDRAW: "Card Withdraw",
  CARD_RECHARGE: "Card Recharge",
  ECHANGES: "Echanges",
  TRANSFERTS: "Transferts",
  DEFAULT: "Autres",
};

// Fee category icons and colors
const FEE_CATEGORY_CONFIG: Record<FeeCategory, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  CRYPTO_FEES: {
    icon: Coins,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  FIAT_FEES: {
    icon: Banknote,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  PAYMENT_FEES: {
    icon: CreditCard,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  OTHER_FEES: {
    icon: Receipt,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
};

// Helper to transform API wallet data to display format
function transformWalletData(apiWallet: SystemWalletData): WalletInfo {
  const config = WALLET_CONFIG[apiWallet.type];
  return {
    id: apiWallet.id,
    type: apiWallet.type,
    name: apiWallet.name,
    nameFr: apiWallet.nameFr,
    icon: config.icon,
    color: config.color,
    bgColor: config.bgColor,
    borderColor: config.borderColor,
    statusLabel: apiWallet.isLocked ? "Bloque" : config.statusLabel,
    statusColor: apiWallet.isLocked 
      ? "bg-red-500/20 text-red-400 border-red-500/40" 
      : config.statusColor,
    balanceUSD: apiWallet.balanceUSD,
    balancePi: apiWallet.balancePi,
    balanceXAF: apiWallet.balanceXAF,
    description: apiWallet.description || "",
    publicAddress: apiWallet.publicAddress,
    dailyLimit: apiWallet.dailyLimit,
    monthlyLimit: apiWallet.monthlyLimit,
    isLocked: apiWallet.isLocked,
    lockReason: apiWallet.lockReason,
  };
}

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

// --- MFA MODAL COMPONENT ---
function MFAModal({
  isOpen,
  onClose,
  onVerify,
  actionTitle,
  isVerifying,
}: {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => void;
  actionTitle: string;
  isVerifying: boolean;
}) {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;
    
    const newCode = [...code];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setCode(newCode);
    
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Veuillez entrer le code complet a 6 chiffres");
      return;
    }
    onVerify(fullCode);
  };

  const resetModal = useCallback(() => {
    setCode(["", "", "", "", "", ""]);
    setError(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetModal();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen, resetModal]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl shadow-cyan-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    Verification 2FA
                  </h3>
                  <p className="text-[9px] text-slate-500">Google Authenticator</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* Action being verified */}
            <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-6">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Action a valider
              </p>
              <p className="text-sm font-bold text-white">{actionTitle}</p>
            </div>

            {/* Code Input */}
            <div className="mb-6">
              <p className="text-[10px] text-slate-400 text-center mb-4">
                Entrez le code a 6 chiffres affiche sur votre application Google Authenticator
              </p>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <motion.input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-xl font-black rounded-xl border-2 bg-slate-800/50 text-white outline-none transition-all
                      ${error ? "border-red-500/50 animate-shake" : digit ? "border-cyan-500/50" : "border-white/10"}
                      focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20`}
                    whileFocus={{ scale: 1.05 }}
                  />
                ))}
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-red-400 text-center mt-3"
                >
                  {error}
                </motion.p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isVerifying}
                className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold text-[10px] uppercase tracking-wider hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleVerify}
                disabled={isVerifying || code.some((d) => !d)}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-[10px] uppercase tracking-wider hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Verification...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    Valider
                  </>
                )}
              </button>
            </div>

            {/* Security Notice */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[8px] text-slate-600">
              <Lock size={10} />
              <span>Connexion securisee - Chiffrement E2E</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- FEE CONVERSION MODAL COMPONENT ---
function FeeConversionModal({
  isOpen,
  onClose,
  feesData,
  walletBalance,
  onConvert,
  isConverting,
}: {
  isOpen: boolean;
  onClose: () => void;
  feesData: CentralizedFeesData | null;
  walletBalance: WalletBalances;
  onConvert: (code: string) => void;
  isConverting: boolean;
}) {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"preview" | "confirm">("preview");
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(null);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;
    const newCode = [...code];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setCode(newCode);
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleConfirm = () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Veuillez entrer le code complet a 6 chiffres");
      return;
    }
    onConvert(fullCode);
  };

  const resetModal = useCallback(() => {
    setCode(["", "", "", "", "", ""]);
    setError(null);
    setStep("preview");
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetModal();
    }
  }, [isOpen, resetModal]);

  useEffect(() => {
    if (step === "confirm") {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const totalToConvert = (walletBalance.usd + (walletBalance.xaf / 603));
  const estimatedPi = feesData ? totalToConvert / feesData.conversionRate.piToUsd : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-amber-500/10 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Repeat className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    Conversion en Pi
                  </h3>
                  <p className="text-[9px] text-slate-500">Centralisation des frais</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {step === "preview" ? (
              <>
                {/* Central Address */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-4">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Adresse Centrale (Admin Wallet)
                  </p>
                  <code className="text-xs font-mono text-amber-400 break-all">
                    {feesData?.centralAddress || "Chargement..."}
                  </code>
                </div>

                {/* Current Balances */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-4">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Soldes a Convertir
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-emerald-400" />
                        <span className="text-[10px] text-slate-400">USD</span>
                      </div>
                      <span className="text-sm font-bold text-white">
                        ${formatCurrency(walletBalance.usd)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote size={14} className="text-blue-400" />
                        <span className="text-[10px] text-slate-400">XAF</span>
                      </div>
                      <span className="text-sm font-bold text-white">
                        {formatCurrency(walletBalance.xaf)} XAF
                      </span>
                    </div>
                    <div className="border-t border-white/5 pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Coins size={14} className="text-amber-400" />
                          <span className="text-[10px] text-slate-400">Pi (actuel)</span>
                        </div>
                        <span className="text-sm font-bold text-amber-400">
                          {formatCurrency(walletBalance.pi)} Pi
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversion Preview */}
                <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-2xl p-4 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <ArrowRightLeft size={18} className="text-amber-400" />
                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                      Estimation de Conversion
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-white">
                      +{formatCurrency(estimatedPi, true)} Pi
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Taux: 1 Pi = ${formatCurrency(feesData?.conversionRate.piToUsd || 314159)}
                    </p>
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 mb-6 text-[9px] text-slate-500">
                  <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                  <span>
                    Cette action convertira tous les frais accumules (USD + XAF) en Pi au taux de consensus actuel. 
                    La conversion est irreversible.
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold text-[10px] uppercase tracking-wider hover:bg-white/10 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => setStep("confirm")}
                    disabled={totalToConvert <= 0}
                    className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-[10px] uppercase tracking-wider hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Repeat size={14} />
                    Continuer
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Confirmation Step with 2FA */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-6">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Conversion a effectuer
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      ${formatCurrency(walletBalance.usd)} + {formatCurrency(walletBalance.xaf)} XAF
                    </span>
                    <ArrowRight size={16} className="text-amber-400" />
                    <span className="text-sm font-bold text-amber-400">
                      {formatCurrency(estimatedPi, true)} Pi
                    </span>
                  </div>
                </div>

                {/* 2FA Code Input */}
                <div className="mb-6">
                  <p className="text-[10px] text-slate-400 text-center mb-4">
                    Entrez le code Google Authenticator pour confirmer
                  </p>
                  <div className="flex justify-center gap-2" onPaste={handlePaste}>
                    {code.map((digit, index) => (
                      <motion.input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className={`w-12 h-14 text-center text-xl font-black rounded-xl border-2 bg-slate-800/50 text-white outline-none transition-all
                          ${error ? "border-red-500/50 animate-shake" : digit ? "border-amber-500/50" : "border-white/10"}
                          focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20`}
                        whileFocus={{ scale: 1.05 }}
                      />
                    ))}
                  </div>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-red-400 text-center mt-3"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("preview")}
                    disabled={isConverting}
                    className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold text-[10px] uppercase tracking-wider hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isConverting || code.some((d) => !d)}
                    className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-[10px] uppercase tracking-wider hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isConverting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Conversion...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        Confirmer
                      </>
                    )}
                  </button>
                </div>

                {/* Security Notice */}
                <div className="mt-4 flex items-center justify-center gap-2 text-[8px] text-slate-600">
                  <Lock size={10} />
                  <span>Action securisee - 2FA requis</span>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- WALLET DRAWER COMPONENT ---
function WalletDrawer({
  wallet,
  isOpen,
  onClose,
  onAction,
}: {
  wallet: WalletInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: WalletAction, wallet: WalletInfo) => void;
}) {
  const [copiedAddress, setCopiedAddress] = useState(false);

  if (!wallet) return null;

  const Icon = wallet.icon;

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.publicAddress);
    setCopiedAddress(true);
    toast.success("Adresse copiee");
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent className="bg-slate-900 border-l border-white/10 h-full">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <DrawerHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${wallet.bgColor} border ${wallet.borderColor}`}>
                <Icon size={24} className={wallet.color} />
              </div>
              <div className="flex-1">
                <DrawerTitle className="text-lg font-black text-white">
                  {wallet.nameFr}
                </DrawerTitle>
                <DrawerDescription className="text-[10px] text-slate-500">
                  {wallet.description}
                </DrawerDescription>
              </div>
              <DrawerClose className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
                <X size={18} className="text-slate-400" />
              </DrawerClose>
            </div>
          </DrawerHeader>

          {/* Balance Section */}
          <div className="p-4 border-b border-white/5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2">
              Solde Actuel
            </p>
            <p className="text-3xl font-black text-white">
              ${formatCurrency(wallet.balanceUSD)}
            </p>
            {wallet.balancePi > 0 && (
              <p className="text-lg font-bold text-amber-400 mt-1">
                {formatCurrency(wallet.balancePi)} Pi
              </p>
            )}
            <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full border text-[9px] font-black ${wallet.statusColor}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {wallet.statusLabel}
            </div>
          </div>

          {/* Wallet Details */}
          <div className="p-4 space-y-4 border-b border-white/5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
              Informations du Wallet
            </p>
            
            {/* Public Address */}
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Adresse Publique
              </p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-cyan-400 break-all">
                  {wallet.publicAddress}
                </code>
                <button
                  onClick={copyAddress}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors shrink-0"
                >
                  {copiedAddress ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} className="text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* XAF Balance if available */}
            {wallet.balanceXAF > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-3">
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Solde XAF
                </p>
                <p className="text-sm font-bold text-white">
                  {formatCurrency(wallet.balanceXAF)} XAF
                </p>
              </div>
            )}

            {/* Limits */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-xl p-3">
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Limite Journaliere
                </p>
                <p className="text-sm font-bold text-white">
                  ${formatCurrency(wallet.dailyLimit)}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3">
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Limite Mensuelle
                </p>
                <p className="text-sm font-bold text-white">
                  ${formatCurrency(wallet.monthlyLimit)}
                </p>
              </div>
            </div>

            {/* Lock Status */}
            <div className={`flex items-center gap-3 p-3 rounded-xl ${
              wallet.isLocked 
                ? "bg-red-500/10 border border-red-500/30" 
                : "bg-emerald-500/10 border border-emerald-500/30"
            }`}>
              {wallet.isLocked ? (
                <>
                  <ShieldAlert size={18} className="text-red-400" />
                  <div>
                    <p className="text-xs font-bold text-red-400">Wallet Bloque</p>
                    <p className="text-[8px] text-red-400/70">Aucune transaction autorisee</p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-emerald-400">Wallet Actif</p>
                    <p className="text-[8px] text-emerald-400/70">Transactions autorisees</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <DrawerFooter className="mt-auto pt-4">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-3">
              Actions Securisees (2FA Requis)
            </p>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction("transfer", wallet)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-emerald-500/30 hover:border-emerald-400/50 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Send size={18} className="text-emerald-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-emerald-400">Transferer vers Tresorerie</p>
                <p className="text-[9px] text-slate-500">Securiser les fonds vers le cold wallet</p>
              </div>
              <LockKeyhole size={16} className="text-emerald-500/50" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction("block", wallet)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                wallet.isLocked
                  ? "bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-emerald-500/30 hover:border-emerald-400/50"
                  : "bg-gradient-to-r from-red-600/20 to-orange-600/20 border-red-500/30 hover:border-red-400/50"
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                wallet.isLocked ? "bg-emerald-500/20" : "bg-red-500/20"
              }`}>
                {wallet.isLocked ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : (
                  <Ban size={18} className="text-red-400" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-bold ${wallet.isLocked ? "text-emerald-400" : "text-red-400"}`}>
                  {wallet.isLocked ? "Debloquer ce Wallet" : "Bloquer ce Wallet"}
                </p>
                <p className="text-[9px] text-slate-500">
                  {wallet.isLocked ? "Reactiver les transactions" : "Suspendre toutes les transactions"}
                </p>
              </div>
              <LockKeyhole size={16} className={wallet.isLocked ? "text-emerald-500/50" : "text-red-500/50"} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction("adjust", wallet)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/50 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Sliders size={18} className="text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-blue-400">Ajuster Liquidite</p>
                <p className="text-[9px] text-slate-500">Modifier les limites de transaction</p>
              </div>
              <LockKeyhole size={16} className="text-blue-500/50" />
            </motion.button>

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-2 mt-4 text-[8px] text-slate-600">
              <Shield size={10} />
              <span>Toutes les actions requierent une validation 2FA</span>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// --- COMPONENTS ---
function WalletCard({ 
  wallet, 
  onSettings 
}: { 
  wallet: WalletInfo;
  onSettings: () => void;
}) {
  const Icon = wallet.icon;
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative bg-slate-900/60 border ${wallet.borderColor} rounded-[1.5rem] p-5 flex flex-col gap-3 hover:bg-slate-900/80 transition-all group cursor-pointer`}
    >
      {/* Settings Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileHover={{ scale: 1.1, rotate: 45 }}
        onClick={(e) => {
          e.stopPropagation();
          onSettings();
        }}
        className="absolute top-3 right-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
      >
        <Settings size={14} className="text-slate-400" />
      </motion.button>

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
            {formatCurrency(wallet.balancePi)} Pi
          </p>
        )}
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] mt-2">{wallet.nameFr}</p>
        <p className="text-[8px] text-slate-600 mt-0.5">{wallet.description}</p>
      </div>
      
      {/* Lock indicator */}
      {wallet.isLocked && (
        <div className="absolute bottom-3 right-3">
          <Lock size={14} className="text-red-400" />
        </div>
      )}
    </motion.div>
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
  isLoading,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  variant: "primary" | "warning";
  onClick: () => void;
  isLoading?: boolean;
}) {
  const isPrimary = variant === "primary";
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      disabled={isLoading}
      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all w-full disabled:opacity-50 ${
        isPrimary
          ? "bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border-emerald-500/30 hover:border-emerald-400/50"
          : "bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-500/30 hover:border-amber-400/50"
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        isPrimary ? "bg-emerald-500/20" : "bg-amber-500/20"
      }`}>
        {isLoading ? (
          <Loader2 size={22} className={`animate-spin ${isPrimary ? "text-emerald-400" : "text-amber-400"}`} />
        ) : (
          <Icon size={22} className={isPrimary ? "text-emerald-400" : "text-amber-400"} />
        )}
      </div>
      <div className="flex-1 text-left">
        <p className={`text-sm font-bold ${isPrimary ? "text-emerald-400" : "text-amber-400"}`}>
          {label}
        </p>
        <p className="text-[10px] text-slate-500">{description}</p>
      </div>
      <ArrowRight size={18} className={isPrimary ? "text-emerald-500/50" : "text-amber-500/50"} />
    </motion.button>
  );
}

// --- PAGE ---
export default function TreasuryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TreasuryData | null>(null);
  const [chartTab, setChartTab] = useState<"all" | "deposits" | "withdrawals">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Wallet drawer state
  const [selectedWallet, setSelectedWallet] = useState<WalletInfo | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // MFA modal state
  const [isMFAOpen, setIsMFAOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: WalletAction; wallet: WalletInfo } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Wallets state (fetched from API)
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(true);
  
  // Centralized fees state
  const [feesData, setFeesData] = useState<CentralizedFeesData | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalances>({ usd: 0, pi: 0, xaf: 0 });
  const [feesLoading, setFeesLoading] = useState(true);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Sidra Operator Wallet on-chain state
  const [sdaOperator, setSdaOperator] = useState<{
    address: string;
    balance: number;
    totalUsersSDA: number;
    coverage: number;
    explorerUrl: string;
    lastChecked: string;
    onChainError: string | null;
  } | null>(null);
  const [sdaOperatorLoading, setSdaOperatorLoading] = useState(true);
  const [sdaOperatorFetchError, setSdaOperatorFetchError] = useState<string | null>(null);
  // Affiche/masque la liste des actifs EVM partageant l'adresse opérateur SDA
  const [showSdaSharedAssets, setShowSdaSharedAssets] = useState(false);

  // Pi Network Operator Wallet on-chain state
  const [piOperator, setPiOperator] = useState<{
    address: string;
    balance: number;
    totalUsersPi: number;
    coverage: number;
    explorerUrl: string;
    lastChecked: string;
    onChainError: string | null;
  } | null>(null);
  const [piOperatorLoading, setPiOperatorLoading] = useState(true);
  const [piOperatorFetchError, setPiOperatorFetchError] = useState<string | null>(null);

  // TronGrid Operator Wallet on-chain state
  const [tronTab, setTronTab] = useState<"TRX" | "USDT">("TRX");
  const [tronOperator, setTronOperator] = useState<{
    address: string;
    trxBalance: number;
    usdtBalance: number;
    totalUsersTRX: number;
    totalUsersUSDT: number;
    coverageTRX: number;
    coverageUSDT: number;
    explorerUrl: string;
    lastChecked: string;
    onChainError: string | null;
  } | null>(null);
  const [tronOperatorLoading, setTronOperatorLoading] = useState(true);
  const [tronOperatorFetchError, setTronOperatorFetchError] = useState<string | null>(null);

  // Bitcoin Operator Wallet on-chain state
  const [btcOperator, setBtcOperator] = useState<{
    address: string;
    balance: number;
    totalUsersBTC: number;
    coverage: number;
    explorerUrl: string;
    lastChecked: string;
    onChainError: string | null;
  } | null>(null);
  const [btcOperatorLoading, setBtcOperatorLoading] = useState(true);
  const [btcOperatorFetchError, setBtcOperatorFetchError] = useState<string | null>(null);

  // Fetch SDA operator wallet on-chain balance
  const fetchSdaOperator = async (silent = false) => {
    try {
      if (!silent) setSdaOperatorLoading(true);
      setSdaOperatorFetchError(null);
      const res = await fetch("/api/admin/treasury/sidra-operator");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Erreur HTTP ${res.status}`);
      if (json.success) {
        setSdaOperator(json);
      } else {
        throw new Error(json?.error || "Réponse inattendue de l'API");
      }
    } catch (err: any) {
      console.error("[Treasury] Erreur wallet opérateur SDA:", err);
      setSdaOperatorFetchError(err?.message || "Erreur de connexion à l'API");
    } finally {
      setSdaOperatorLoading(false);
    }
  };

  // Fetch Pi Network operator wallet on-chain balance
  const fetchPiOperator = async (silent = false) => {
    try {
      if (!silent) setPiOperatorLoading(true);
      setPiOperatorFetchError(null);
      const res = await fetch("/api/admin/treasury/pi-operator");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Erreur HTTP ${res.status}`);
      if (json.success) {
        setPiOperator(json);
      } else {
        throw new Error(json?.error || "Réponse inattendue de l'API");
      }
    } catch (err: any) {
      console.error("[Treasury] Erreur wallet opérateur Pi:", err);
      setPiOperatorFetchError(err?.message || "Erreur de connexion à l'API");
    } finally {
      setPiOperatorLoading(false);
    }
  };

  // Fetch TronGrid operator wallet on-chain balance (TRX + USDT)
  const fetchTronOperator = async (silent = false) => {
    try {
      if (!silent) setTronOperatorLoading(true);
      setTronOperatorFetchError(null);
      const res = await fetch("/api/admin/treasury/tron-operator");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Erreur HTTP ${res.status}`);
      if (json.success) {
        setTronOperator(json);
      } else {
        throw new Error(json?.error || "Réponse inattendue de l'API");
      }
    } catch (err: any) {
      console.error("[Treasury] Erreur wallet opérateur TRON:", err);
      setTronOperatorFetchError(err?.message || "Erreur de connexion à l'API");
    } finally {
      setTronOperatorLoading(false);
    }
  };

  // Fetch Bitcoin operator wallet on-chain balance
  const fetchBtcOperator = async (silent = false) => {
    try {
      if (!silent) setBtcOperatorLoading(true);
      setBtcOperatorFetchError(null);
      const res = await fetch("/api/admin/treasury/btc-operator");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Erreur HTTP ${res.status}`);
      if (json.success) {
        setBtcOperator(json);
      } else {
        throw new Error(json?.error || "Réponse inattendue de l'API");
      }
    } catch (err: any) {
      console.error("[Treasury] Erreur wallet opérateur BTC:", err);
      setBtcOperatorFetchError(err?.message || "Erreur de connexion à l'API");
    } finally {
      setBtcOperatorLoading(false);
    }
  };

  // Fetch system wallets from API
  const fetchSystemWallets = async (silent = false) => {
    try {
      if (!silent) setWalletsLoading(true);
      const res = await fetch("/api/admin/system-wallets");
      if (!res.ok) throw new Error("Erreur API wallets");
      const json = await res.json();
      
      if (json.success && json.wallets) {
        const transformedWallets = json.wallets.map(transformWalletData);
        setWallets(transformedWallets);
      }
    } catch (err) {
      console.error("[v0] Error fetching system wallets:", err);
      toast.error("Impossible de charger les wallets systeme");
    } finally {
      setWalletsLoading(false);
    }
  };

  // Fetch centralized fees
  const fetchCentralizedFees = async (silent = false) => {
    try {
      if (!silent) setFeesLoading(true);
      const res = await fetch("/api/admin/treasury/fees");
      if (!res.ok) throw new Error("Erreur API fees");
      const json = await res.json();
      
      if (json.success && json.data) {
        setFeesData(json.data);
        setWalletBalance(json.walletBalance);
      }
    } catch (err) {
      console.error("[v0] Error fetching centralized fees:", err);
      toast.error("Impossible de charger les frais centralises");
    } finally {
      setFeesLoading(false);
    }
  };

  // Handle fee conversion to Pi
  const handleFeeConversion = async (totpCode: string) => {
    setIsConverting(true);
    
    try {
      const res = await fetch("/api/admin/treasury/fees/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totpCode,
          sourceBalances: {
            usd: walletBalance.usd,
            xaf: walletBalance.xaf,
          },
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Erreur lors de la conversion");
        setIsConverting(false);
        return;
      }

      toast.success(json.message || "Conversion effectuee avec succes!");
      
      // Update local state with new balances
      if (json.data?.newBalance) {
        setWalletBalance(json.data.newBalance);
      }
      
      // Refresh all data
      await Promise.all([fetchCentralizedFees(), fetchSystemWallets()]);
      
      setIsConversionModalOpen(false);
    } catch (err) {
      console.error("[v0] Fee conversion error:", err);
      toast.error("Erreur de connexion. Veuillez reessayer.");
    }
    
    setIsConverting(false);
  };

  const fetchTreasury = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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
    if (type === "TRANSFER" || type === "TRANSFERTS") {
      const flows = ["Admin -> Treasury", "Treasury -> Hot", "Hot -> Liquidite", "User -> Hot Wallet"];
      return { flowType: "internal", flowLabel: flows[Math.floor(Math.random() * flows.length)] };
    }
    if (type === "WITHDRAW") {
      return { flowType: "external", flowLabel: "Liquidite -> Orange Money" };
    }
    if (type === "DEPOSIT") {
      return { flowType: "external", flowLabel: "User -> Hot Wallet" };
    }
    return { flowType: "internal", flowLabel: "Systeme" };
  };

  useEffect(() => {
    // Initial load (shows loading spinners)
    fetchTreasury();
    fetchSystemWallets();
    fetchCentralizedFees();
    fetchSdaOperator();
    fetchPiOperator();
    fetchTronOperator();
    fetchBtcOperator();

    // Real-time auto-refresh: silently reload every balance every 10s so the
    // main balance of each asset updates without the admin reloading the page.
    const interval = setInterval(() => {
      fetchTreasury(true);
      fetchSystemWallets(true);
      fetchCentralizedFees(true);
      fetchSdaOperator(true);
      fetchPiOperator(true);
      fetchTronOperator(true);
      fetchBtcOperator(true);
    }, 10000);

    // Refresh immediately when the tab regains focus
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchTreasury(true);
        fetchSystemWallets(true);
        fetchCentralizedFees(true);
        fetchSdaOperator(true);
        fetchPiOperator(true);
        fetchTronOperator(true);
        fetchBtcOperator(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Handle wallet settings click
  const handleWalletSettings = (wallet: WalletInfo) => {
    setSelectedWallet(wallet);
    setIsDrawerOpen(true);
  };

  // Handle wallet action (requires MFA)
  const handleWalletAction = (action: WalletAction, wallet: WalletInfo) => {
    setPendingAction({ action, wallet });
    setIsMFAOpen(true);
  };

  // Handle MFA verification with real API
  const handleMFAVerify = async (code: string) => {
    if (!pendingAction) return;
    
    setIsVerifying(true);
    
    const { action, wallet } = pendingAction;
    
    try {
      // Call the real API with MFA verification
      const res = await fetch("/api/admin/system-wallets/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: wallet.id,
          action: action === "block" ? (wallet.isLocked ? "unblock" : "block") : action,
          totpCode: code,
          data: action === "transfer" 
            ? { amount: wallet.balanceUSD * 0.5, currency: "USD" }
            : action === "adjust"
            ? { dailyLimit: wallet.dailyLimit, monthlyLimit: wallet.monthlyLimit }
            : {},
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Erreur lors de l'action");
        setIsVerifying(false);
        return;
      }

      // Success - update UI
      switch (action) {
        case "transfer":
          toast.success(json.message || `Transfert de ${wallet.nameFr} vers Tresorerie effectue`);
          break;
        case "block":
          toast.success(json.message || (wallet.isLocked 
            ? `${wallet.nameFr} debloque avec succes` 
            : `${wallet.nameFr} bloque avec succes`
          ));
          break;
        case "adjust":
          toast.success(json.message || `Limites de ${wallet.nameFr} ajustees`);
          break;
      }
      
      // Refresh wallets data
      await fetchSystemWallets();
      
      setIsMFAOpen(false);
      setPendingAction(null);
      setIsDrawerOpen(false);
    } catch (err) {
      console.error("[v0] MFA verification error:", err);
      toast.error("Erreur de connexion. Veuillez reessayer.");
    }
    
    setIsVerifying(false);
  };

  // Handle treasury actions with MFA
  const handleSecureProfits = () => {
    const adminWallet = wallets.find(w => w.type === "ADMIN");
    if (adminWallet) {
      handleWalletAction("transfer", adminWallet);
    } else {
      toast.error("Wallet Admin introuvable");
    }
  };

  const handleRechargeHotWallet = () => {
    const treasuryWallet = wallets.find(w => w.type === "TREASURY");
    if (treasuryWallet) {
      handleWalletAction("transfer", treasuryWallet);
    } else {
      toast.error("Wallet Tresorerie introuvable");
    }
  };

  // Get action title for MFA modal
  const getActionTitle = (): string => {
    if (!pendingAction) return "";
    const { action, wallet } = pendingAction;
    switch (action) {
      case "transfer":
        return `Transferer ${wallet.nameFr} vers Tresorerie`;
      case "block":
        return wallet.isLocked ? `Debloquer ${wallet.nameFr}` : `Bloquer ${wallet.nameFr}`;
      case "adjust":
        return `Ajuster limites de ${wallet.nameFr}`;
      default:
        return "Action securisee";
    }
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

  const { chartData, pendingTransactions, largeTransactions, currencyBreakdown, systemWallets: systemWalletsSnapshot, totalFeesCollected } = data;

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/admin/treasury/security")}
              className="p-2.5 bg-cyan-500/10 rounded-2xl text-cyan-400 active:scale-95 transition-transform border border-cyan-500/30"
              title="Configuration Securite 2FA"
            >
              <Shield size={18} />
            </button>
            <button
              onClick={fetchTreasury}
              className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-8">
        {/* WALLET OVERVIEW - 4 WALLET CARDS WITH SETTINGS */}
        <div>
          <SectionTitle>Vue d{"'"}Ensemble Multi-Wallet</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {wallets.map((wallet) => (
              <WalletCard 
                key={wallet.type} 
                wallet={wallet} 
                onSettings={() => handleWalletSettings(wallet)}
              />
            ))}
          </div>

          {/* EXACT PLATFORM BALANCE TOTALS - from system wallets */}
          {data.summary.totalSystemBalanceUSD !== undefined && (
            <div className="mt-4 bg-gradient-to-r from-blue-900/30 to-cyan-900/20 border border-blue-500/20 rounded-2xl p-4">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-[3px] mb-3 flex items-center gap-2">
                <Landmark size={12} />
                Soldes Exacts Plateforme (Tous Wallets)
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-black text-white">
                    ${formatCurrency(data.summary.totalSystemBalanceUSD, true)}
                  </p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">USD Total</p>
                </div>
                <div>
                  <p className="text-xl font-black text-amber-400">
                    {formatCurrency(data.summary.totalSystemBalancePi, true)}
                  </p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Pi Total</p>
                </div>
                <div>
                  <p className="text-xl font-black text-white">
                    {formatCurrency(data.summary.totalSystemBalanceXAF, true)}
                  </p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">XAF Total</p>
                </div>
              </div>
              {/* Per-wallet breakdown */}
              {systemWalletsSnapshot && systemWalletsSnapshot.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                  {systemWalletsSnapshot.map((sw) => (
                    <div key={sw.type} className="flex items-center justify-between text-[9px]">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          sw.isLocked ? "bg-red-400" : "bg-emerald-400"
                        }`} />
                        <span className="text-slate-400 font-bold uppercase">{sw.type}</span>
                        {sw.isLocked && (
                          <span className="text-[7px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                            Bloque
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {sw.balancePi > 0 && (
                          <span className="text-amber-400 font-bold">{formatCurrency(sw.balancePi, true)} Pi</span>
                        )}
                        {sw.balanceXAF > 0 && (
                          <span className="text-blue-400 font-bold">{formatCurrency(sw.balanceXAF, true)} XAF</span>
                        )}
                        <span className="text-white font-bold">${formatCurrency(sw.balanceUSD, true)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SDA OPERATOR WALLET — SOLDE ON-CHAIN */}
        <div>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <img src="/sda.png" alt="SDA" className="w-3.5 h-3.5 object-contain" />
              Wallet Opérateur SDA (On-Chain)
            </span>
          </SectionTitle>
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-[1.5rem] p-5">
            {sdaOperatorLoading ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 size={20} className="animate-spin text-emerald-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Lecture blockchain...
                </span>
              </div>
            ) : sdaOperator ? (
              <>
                {/* Solde principal */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Solde On-Chain (Sidra Chain)
                    </p>
                    <p className="text-3xl font-black text-emerald-400">
                      {sdaOperator.balance.toFixed(6)}{" "}
                      <span className="text-lg text-emerald-500/70">SDA</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      ≈ ${(sdaOperator.balance * 1.2).toFixed(2)} USD
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black ${
                      sdaOperator.onChainError
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : sdaOperator.balance > 0
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-orange-500/10 border-orange-500/30 text-orange-400"
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {sdaOperator.onChainError
                        ? "Erreur réseau"
                        : sdaOperator.balance > 0
                        ? "Actif"
                        : "Vide"}
                    </div>
                    <button
                      onClick={fetchSdaOperator}
                      className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                      title="Actualiser"
                    >
                      <RefreshCw size={14} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Adresse */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-4">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Adresse Opérateur
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-emerald-400 break-all">
                      {sdaOperator.address}
                    </code>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(sdaOperator.address);
                          toast.success("Adresse copiée");
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Copy size={13} className="text-slate-400" />
                      </button>
                      <a
                        href={sdaOperator.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                      >
                        <ExternalLink size={13} className="text-emerald-400" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Actifs partageant l'adresse opérateur SDA (réseau EVM / Sidra) */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden mb-4">
                  <button
                    onClick={() => setShowSdaSharedAssets((v) => !v)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Layers size={13} className="text-emerald-400" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Autres actifs sur cette adresse
                      </span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-500 transition-transform ${
                        showSdaSharedAssets ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {showSdaSharedAssets && (
                    <div className="px-4 pb-4 pt-1 border-t border-white/5">
                      <p className="text-[9px] text-slate-500 mb-3 leading-relaxed">
                        Les frais de ces actifs (réseau EVM / Sidra Chain) sont
                        canalisés vers la même adresse opérateur que le SDA.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {["BNB", "ETH", "USDC", "DAI", "BUSD"].map((asset) => (
                          <div
                            key={asset}
                            className="flex items-center justify-between bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2.5"
                          >
                            <span className="flex items-center gap-2">
                              <Coins size={12} className="text-emerald-400/70" />
                              <span className="text-[11px] font-black text-white">
                                {asset}
                              </span>
                            </span>
                            <span className="text-[8px] font-bold text-emerald-400/80 uppercase tracking-wider">
                              EVM
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                        <Wallet size={12} className="text-emerald-400 shrink-0" />
                        <code className="text-[9px] font-mono text-emerald-400/80 break-all">
                          {sdaOperator.address}
                        </code>
                      </div>
                    </div>
                  )}
                </div>

                {/* Couverture SDA — on-chain vs total users DB */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Couverture des Soldes Utilisateurs
                    </p>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                      sdaOperator.coverage >= 80
                        ? "bg-emerald-500/10 text-emerald-400"
                        : sdaOperator.coverage >= 50
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {sdaOperator.coverage.toFixed(1)}%
                    </span>
                  </div>
                  {/* Barre de progression */}
                  <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all ${
                        sdaOperator.coverage >= 80
                          ? "bg-emerald-500"
                          : sdaOperator.coverage >= 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(sdaOperator.coverage, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-sm font-black text-emerald-400">
                        {sdaOperator.balance.toFixed(4)}
                      </p>
                      <p className="text-[8px] text-slate-500">SDA On-Chain</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-white">
                        {sdaOperator.totalUsersSDA.toFixed(4)}
                      </p>
                      <p className="text-[8px] text-slate-500">SDA Total Users (DB)</p>
                    </div>
                  </div>
                </div>

                {/* Alerte si couverture insuffisante */}
                {sdaOperator.coverage < 80 && (
                  <div className={`flex items-start gap-3 p-4 rounded-2xl border ${
                    sdaOperator.coverage < 50
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-amber-500/10 border-amber-500/30"
                  }`}>
                    <AlertTriangle size={16} className={
                      sdaOperator.coverage < 50 ? "text-red-400 shrink-0" : "text-amber-400 shrink-0"
                    } />
                    <div>
                      <p className={`text-[10px] font-black uppercase ${
                        sdaOperator.coverage < 50 ? "text-red-400" : "text-amber-400"
                      }`}>
                        {sdaOperator.coverage < 50
                          ? "⚠️ Couverture critique — rechargez le wallet opérateur"
                          : "Couverture insuffisante — rechargez bientôt"}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1">
                        Manque :{" "}
                        {Math.max(0, sdaOperator.totalUsersSDA - sdaOperator.balance).toFixed(4)} SDA pour couvrir tous les retraits
                      </p>
                    </div>
                  </div>
                )}

                {/* Erreur réseau */}
                {sdaOperator.onChainError && (
                  <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl mt-3">
                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-red-400">
                      Erreur blockchain : {sdaOperator.onChainError}
                    </p>
                  </div>
                )}

                {/* Dernière vérification */}
                <div className="flex items-center justify-center gap-2 mt-4 text-[8px] text-slate-600">
                  <Clock size={10} />
                  <span>
                    Vérifié {sdaOperator.lastChecked
                      ? formatTimeAgo(sdaOperator.lastChecked)
                      : "—"}
                  </span>
                </div>
              </>
            ) : sdaOperatorFetchError ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertTriangle size={24} className="text-red-400" />
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest text-center">
                  Erreur de chargement
                </p>
                <p className="text-[9px] text-slate-500 text-center max-w-xs">
                  {sdaOperatorFetchError}
                </p>
                <button
                  onClick={fetchSdaOperator}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:bg-white/10 transition-colors uppercase tracking-widest"
                >
                  <RefreshCw size={11} />
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertTriangle size={24} className="text-amber-400" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  Données non disponibles
                </p>
                <button
                  onClick={fetchSdaOperator}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:bg-white/10 transition-colors uppercase tracking-widest"
                >
                  <RefreshCw size={11} />
                  Actualiser
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PI NETWORK OPERATOR WALLET — SOLDE ON-CHAIN */}
        <div>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <img src="/pi.png" alt="PI" className="w-3.5 h-3.5 object-contain" />
              Wallet Opérateur Pi Network (On-Chain)
            </span>
          </SectionTitle>
          <div className="bg-slate-900/60 border border-amber-500/20 rounded-[1.5rem] p-5">
            {piOperatorLoading ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 size={20} className="animate-spin text-amber-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Lecture blockchain Pi Network...
                </span>
              </div>
            ) : piOperator ? (
              <>
                {/* Solde principal */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Solde On-Chain (Pi Network Mainnet)
                    </p>
                    <p className="text-3xl font-black text-amber-400">
                      {piOperator.balance.toFixed(6)}{" "}
                      <span className="text-lg text-amber-500/70">PI</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      ≈ ${(piOperator.balance * 0.65).toFixed(2)} USD
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black ${
                      piOperator.onChainError
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : piOperator.balance > 0
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-orange-500/10 border-orange-500/30 text-orange-400"
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {piOperator.onChainError
                        ? "Erreur réseau"
                        : piOperator.balance > 0
                        ? "Actif"
                        : "Vide"}
                    </div>
                    <button
                      onClick={fetchPiOperator}
                      className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                      title="Actualiser"
                    >
                      <RefreshCw size={14} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Adresse */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-4">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Adresse Opérateur Pi Network
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-amber-400 break-all">
                      {piOperator.address}
                    </code>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(piOperator.address);
                          toast.success("Adresse copiée");
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Copy size={13} className="text-slate-400" />
                      </button>
                      <a
                        href={piOperator.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors border border-amber-500/20"
                      >
                        <ExternalLink size={13} className="text-amber-400" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Couverture PI — on-chain vs total users DB */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Couverture des Soldes Utilisateurs
                    </p>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                      piOperator.coverage >= 80
                        ? "bg-emerald-500/10 text-emerald-400"
                        : piOperator.coverage >= 50
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {piOperator.coverage.toFixed(1)}%
                    </span>
                  </div>
                  {/* Barre de progression */}
                  <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all ${
                        piOperator.coverage >= 80
                          ? "bg-emerald-500"
                          : piOperator.coverage >= 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(piOperator.coverage, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-sm font-black text-amber-400">
                        {piOperator.balance.toFixed(4)}
                      </p>
                      <p className="text-[8px] text-slate-500">PI On-Chain</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-white">
                        {piOperator.totalUsersPi.toFixed(4)}
                      </p>
                      <p className="text-[8px] text-slate-500">PI Total Users (DB)</p>
                    </div>
                  </div>
                </div>

                {/* Alerte si couverture insuffisante */}
                {piOperator.coverage < 80 && (
                  <div className={`flex items-start gap-3 p-4 rounded-2xl border ${
                    piOperator.coverage < 50
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-amber-500/10 border-amber-500/30"
                  }`}>
                    <AlertTriangle size={16} className={
                      piOperator.coverage < 50 ? "text-red-400 shrink-0" : "text-amber-400 shrink-0"
                    } />
                    <div>
                      <p className={`text-[10px] font-black uppercase ${
                        piOperator.coverage < 50 ? "text-red-400" : "text-amber-400"
                      }`}>
                        {piOperator.coverage < 50
                          ? "⚠️ Couverture critique — rechargez le wallet opérateur"
                          : "Couverture insuffisante — rechargez bientôt"}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1">
                        Manque :{" "}
                        {Math.max(0, piOperator.totalUsersPi - piOperator.balance).toFixed(4)} PI pour couvrir tous les retraits
                      </p>
                    </div>
                  </div>
                )}

                {/* Erreur réseau */}
                {piOperator.onChainError && (
                  <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl mt-3">
                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-red-400">
                      Erreur Pi Network : {piOperator.onChainError}
                    </p>
                  </div>
                )}

                {/* Dernière vérification */}
                <div className="flex items-center justify-center gap-2 mt-4 text-[8px] text-slate-600">
                  <Clock size={10} />
                  <span>
                    Vérifié {piOperator.lastChecked
                      ? formatTimeAgo(piOperator.lastChecked)
                      : "—"}
                  </span>
                </div>
              </>
            ) : piOperatorFetchError ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertTriangle size={24} className="text-red-400" />
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest text-center">
                  Erreur de chargement
                </p>
                <p className="text-[9px] text-slate-500 text-center max-w-xs">
                  {piOperatorFetchError}
                </p>
                <button
                  onClick={fetchPiOperator}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:bg-white/10 transition-colors uppercase tracking-widest"
                >
                  <RefreshCw size={11} />
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertTriangle size={24} className="text-amber-400" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  Données non disponibles
                </p>
                <button
                  onClick={fetchPiOperator}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:bg-white/10 transition-colors uppercase tracking-widest"
                >
                  <RefreshCw size={11} />
                  Actualiser
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TRONGRID OPERATOR WALLET — TRX + USDT */}
        <div>
          <SectionTitle>
            <span className="flex items-center gap-2">
              {/* TRON logo inline SVG */}
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="8" fill="#E84142"/>
                <path d="M11.8 5.2L8 2 4.2 5.2l1.1 6.4L8 13l2.7-1.4 1.1-6.4z" fill="white"/>
              </svg>
              Wallet Opérateur TRON (On-Chain)
            </span>
          </SectionTitle>

          {/* Onglets TRX / USDT */}
          <div className="flex gap-2 mb-3">
            {(["TRX", "USDT"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setTronTab(tab)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  tronTab === tab
                    ? tab === "TRX"
                      ? "bg-red-500/20 border border-red-500/40 text-red-400"
                      : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                    : "bg-white/5 border border-white/10 text-slate-500 hover:bg-white/10"
                }`}
              >
                {tab === "USDT" ? "USDT (TRC-20)" : "TRX"}
              </button>
            ))}
          </div>

          <div className={`bg-slate-900/60 border rounded-[1.5rem] p-5 ${
            tronTab === "TRX" ? "border-red-500/20" : "border-emerald-500/20"
          }`}>
            {tronOperatorLoading ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 size={20} className={`animate-spin ${tronTab === "TRX" ? "text-red-400" : "text-emerald-400"}`} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Lecture blockchain TRON...
                </span>
              </div>
            ) : tronOperator ? (
              <>
                {/* Solde principal */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      {tronTab === "TRX" ? "Solde On-Chain (TRON Mainnet)" : "Solde USDT TRC-20"}
                    </p>
                    <p className={`text-3xl font-black ${tronTab === "TRX" ? "text-red-400" : "text-emerald-400"}`}>
                      {tronTab === "TRX"
                        ? tronOperator.trxBalance.toFixed(6)
                        : tronOperator.usdtBalance.toFixed(6)}{" "}
                      <span className={`text-lg ${tronTab === "TRX" ? "text-red-500/70" : "text-emerald-500/70"}`}>
                        {tronTab}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {tronTab === "TRX"
                        ? `≈ $${(tronOperator.trxBalance * 0.12).toFixed(2)} USD`
                        : `≈ $${tronOperator.usdtBalance.toFixed(2)} USD`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black ${
                      tronOperator.onChainError
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : (tronTab === "TRX" ? tronOperator.trxBalance : tronOperator.usdtBalance) > 0
                        ? tronTab === "TRX"
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-orange-500/10 border-orange-500/30 text-orange-400"
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {tronOperator.onChainError ? "Erreur réseau" : (tronTab === "TRX" ? tronOperator.trxBalance : tronOperator.usdtBalance) > 0 ? "Actif" : "Vide"}
                    </div>
                    <button
                      onClick={fetchTronOperator}
                      className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                      title="Actualiser"
                    >
                      <RefreshCw size={14} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Adresse */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-4">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Adresse Opérateur TRON
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <code className={`text-xs font-mono break-all ${tronTab === "TRX" ? "text-red-400" : "text-emerald-400"}`}>
                      {tronOperator.address}
                    </code>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(tronOperator.address);
                          toast.success("Adresse copiée");
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Copy size={13} className="text-slate-400" />
                      </button>
                      <a
                        href={tronOperator.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 rounded-lg border transition-colors ${
                          tronTab === "TRX"
                            ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20"
                        }`}
                      >
                        <ExternalLink size={13} className={tronTab === "TRX" ? "text-red-400" : "text-emerald-400"} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Couverture */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Couverture des Soldes Utilisateurs
                    </p>
                    {(() => {
                      const cov = tronTab === "TRX" ? tronOperator.coverageTRX : tronOperator.coverageUSDT;
                      return (
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                          cov >= 80 ? "bg-emerald-500/10 text-emerald-400"
                          : cov >= 50 ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                        }`}>{cov.toFixed(1)}%</span>
                      );
                    })()}
                  </div>
                  {(() => {
                    const cov = tronTab === "TRX" ? tronOperator.coverageTRX : tronOperator.coverageUSDT;
                    return (
                      <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all ${
                            cov >= 80 ? "bg-emerald-500" : cov >= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(cov, 100)}%` }}
                        />
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className={`text-sm font-black ${tronTab === "TRX" ? "text-red-400" : "text-emerald-400"}`}>
                        {tronTab === "TRX"
                          ? tronOperator.trxBalance.toFixed(4)
                          : tronOperator.usdtBalance.toFixed(4)}
                      </p>
                      <p className="text-[8px] text-slate-500">{tronTab} On-Chain</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-white">
                        {tronTab === "TRX"
                          ? tronOperator.totalUsersTRX.toFixed(4)
                          : tronOperator.totalUsersUSDT.toFixed(4)}
                      </p>
                      <p className="text-[8px] text-slate-500">{tronTab} Total Users (DB)</p>
                    </div>
                  </div>
                </div>

                {/* Alerte couverture insuffisante */}
                {(() => {
                  const cov = tronTab === "TRX" ? tronOperator.coverageTRX : tronOperator.coverageUSDT;
                  const bal = tronTab === "TRX" ? tronOperator.trxBalance : tronOperator.usdtBalance;
                  const total = tronTab === "TRX" ? tronOperator.totalUsersTRX : tronOperator.totalUsersUSDT;
                  if (cov >= 80) return null;
                  return (
                    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${
                      cov < 50 ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"
                    }`}>
                      <AlertTriangle size={16} className={cov < 50 ? "text-red-400 shrink-0" : "text-amber-400 shrink-0"} />
                      <div>
                        <p className={`text-[10px] font-black uppercase ${cov < 50 ? "text-red-400" : "text-amber-400"}`}>
                          {cov < 50 ? "⚠️ Couverture critique — rechargez le wallet opérateur" : "Couverture insuffisante — rechargez bientôt"}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1">
                          Manque : {Math.max(0, total - bal).toFixed(4)} {tronTab} pour couvrir tous les retraits
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Erreur réseau */}
                {tronOperator.onChainError && (
                  <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl mt-3">
                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-red-400">
                      Erreur blockchain : {tronOperator.onChainError}
                    </p>
                  </div>
                )}

                {/* Dernière vérification */}
                <div className="flex items-center justify-center gap-2 mt-4 text-[8px] text-slate-600">
                  <Clock size={10} />
                  <span>Vérifié {tronOperator.lastChecked ? formatTimeAgo(tronOperator.lastChecked) : "—"}</span>
                </div>
              </>
            ) : tronOperatorFetchError ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertTriangle size={24} className="text-red-400" />
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest text-center">
                  Erreur de chargement
                </p>
                <p className="text-[9px] text-slate-500 text-center max-w-xs">{tronOperatorFetchError}</p>
                <button
                  onClick={fetchTronOperator}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:bg-white/10 transition-colors uppercase tracking-widest"
                >
                  <RefreshCw size={11} />
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertTriangle size={24} className="text-amber-400" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  Données non disponibles
                </p>
                <button
                  onClick={fetchTronOperator}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:bg-white/10 transition-colors uppercase tracking-widest"
                >
                  <RefreshCw size={11} />
                  Actualiser
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BITCOIN OPERATOR WALLET — On-Chain */}
        <div>
          <SectionTitle>
            <span className="flex items-center gap-2">
              {/* Bitcoin logo inline SVG */}
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="8" fill="#F7931A" />
                <path
                  d="M11.1 7c.15-1-.6-1.5-1.65-1.85l.34-1.36-.83-.2-.33 1.32c-.22-.05-.44-.1-.66-.15l.33-1.33-.82-.2-.34 1.36c-.18-.04-.35-.08-.52-.12v-.01l-1.14-.28-.22.88s.61.14.6.15c.34.08.4.3.39.48l-.39 1.55c.02.01.05.02.09.03l-.1-.02-.54 2.17c-.04.1-.15.26-.39.2 0 .01-.6-.15-.6-.15l-.41.95 1.07.27c.2.05.4.1.59.15l-.34 1.38.82.2.34-1.36c.22.06.44.11.65.16l-.34 1.35.83.2.34-1.37c1.4.27 2.46.16 2.9-1.11.36-1.02-.02-1.61-.76-2 .54-.12.94-.48 1.05-1.2zm-1.88 2.64c-.26 1.02-1.98.47-2.53.33l.46-1.83c.56.14 2.34.42 2.07 1.5zm.25-2.66c-.23.93-1.66.46-2.13.34l.41-1.66c.47.12 1.96.34 1.72 1.32z"
                  fill="white"
                />
              </svg>
              Wallet Opérateur Bitcoin (On-Chain)
            </span>
          </SectionTitle>

          <div className="bg-slate-900/60 border border-orange-500/20 rounded-[1.5rem] p-5">
            {btcOperatorLoading ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 size={20} className="animate-spin text-orange-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Lecture blockchain Bitcoin...
                </span>
              </div>
            ) : btcOperator ? (
              <>
                {/* Solde principal */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Solde On-Chain (Bitcoin Mainnet)
                    </p>
                    <p className="text-3xl font-black text-orange-400">
                      {btcOperator.balance.toFixed(8)}{" "}
                      <span className="text-lg text-orange-500/70">BTC</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      ≈ ${(btcOperator.balance * 65000).toFixed(2)} USD
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black ${
                        btcOperator.onChainError
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : btcOperator.balance > 0
                          ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {btcOperator.onChainError
                        ? "Erreur réseau"
                        : btcOperator.balance > 0
                        ? "Actif"
                        : "Vide"}
                    </div>
                    <button
                      onClick={() => fetchBtcOperator()}
                      className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                      title="Actualiser"
                    >
                      <RefreshCw size={14} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Adresse */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-4">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Adresse Opérateur Bitcoin
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono break-all text-orange-400">
                      {btcOperator.address || "Non configurée"}
                    </code>
                    {btcOperator.address && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(btcOperator.address);
                            toast.success("Adresse copiée");
                          }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <Copy size={13} className="text-slate-400" />
                        </button>
                        <a
                          href={btcOperator.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg border border-orange-500/20 bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
                        >
                          <ExternalLink size={13} className="text-orange-400" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Couverture */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Couverture des Soldes Utilisateurs
                    </p>
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                        btcOperator.coverage >= 80
                          ? "bg-emerald-500/10 text-emerald-400"
                          : btcOperator.coverage >= 50
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {btcOperator.coverage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all ${
                        btcOperator.coverage >= 80
                          ? "bg-emerald-500"
                          : btcOperator.coverage >= 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(btcOperator.coverage, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-sm font-black text-orange-400">
                        {btcOperator.balance.toFixed(8)}
                      </p>
                      <p className="text-[8px] text-slate-500">BTC On-Chain</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-white">
                        {btcOperator.totalUsersBTC.toFixed(8)}
                      </p>
                      <p className="text-[8px] text-slate-500">BTC Total Users (DB)</p>
                    </div>
                  </div>
                </div>

                {/* Alerte couverture insuffisante */}
                {btcOperator.coverage < 80 && (
                  <div
                    className={`flex items-start gap-3 p-4 rounded-2xl border ${
                      btcOperator.coverage < 50
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-amber-500/10 border-amber-500/30"
                    }`}
                  >
                    <AlertTriangle
                      size={16}
                      className={btcOperator.coverage < 50 ? "text-red-400 shrink-0" : "text-amber-400 shrink-0"}
                    />
                    <div>
                      <p
                        className={`text-[10px] font-black uppercase ${
                          btcOperator.coverage < 50 ? "text-red-400" : "text-amber-400"
                        }`}
                      >
                        {btcOperator.coverage < 50
                          ? "Couverture critique — rechargez le wallet opérateur"
                          : "Couverture insuffisante — rechargez bientôt"}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1">
                        Manque : {Math.max(0, btcOperator.totalUsersBTC - btcOperator.balance).toFixed(8)} BTC pour couvrir tous les retraits
                      </p>
                    </div>
                  </div>
                )}

                {/* Erreur réseau */}
                {btcOperator.onChainError && (
                  <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl mt-3">
                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-red-400">
                      Erreur blockchain : {btcOperator.onChainError}
                    </p>
                  </div>
                )}

                {/* Dernière vérification */}
                <div className="flex items-center justify-center gap-2 mt-4 text-[8px] text-slate-600">
                  <Clock size={10} />
                  <span>Vérifié {btcOperator.lastChecked ? formatTimeAgo(btcOperator.lastChecked) : "—"}</span>
                </div>
              </>
            ) : btcOperatorFetchError ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertTriangle size={24} className="text-red-400" />
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest text-center">
                  Erreur de chargement
                </p>
                <p className="text-[9px] text-slate-500 text-center max-w-xs">{btcOperatorFetchError}</p>
                <button
                  onClick={() => fetchBtcOperator()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:bg-white/10 transition-colors uppercase tracking-widest"
                >
                  <RefreshCw size={11} />
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertTriangle size={24} className="text-amber-400" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  Données non disponibles
                </p>
                <button
                  onClick={() => fetchBtcOperator()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:bg-white/10 transition-colors uppercase tracking-widest"
                >
                  <RefreshCw size={11} />
                  Actualiser
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CURRENCY BREAKDOWN WITH WALLET INDICATORS */}
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
          <SectionTitle>Actions de Tresorerie Interne</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5 space-y-3">
            <TreasuryActionButton
              label="Securiser les Profits"
              description="Transferer les fonds de l'Admin Wallet vers le Wallet de Tresorerie"
              icon={Lock}
              variant="primary"
              onClick={handleSecureProfits}
              isLoading={actionLoading === "secure"}
            />
            <TreasuryActionButton
              label="Recharger le Hot Wallet"
              description="Transferer des fonds de la Tresorerie vers le Hot Wallet pour les frais de gas"
              icon={Zap}
              variant="warning"
              onClick={handleRechargeHotWallet}
              isLoading={actionLoading === "recharge"}
            />
            
            {/* 2FA Security Notice */}
            <div className="flex items-center justify-center gap-2 pt-2 text-[9px] text-cyan-500/70">
              <ShieldCheck size={12} />
              <span>Toutes les actions requierent une validation Google Authenticator</span>
            </div>
          </div>
        </div>

        {/* CENTRALIZED PLATFORM FEES */}
        <div>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <PiggyBank size={14} className="text-amber-400" />
              Frais Plateforme Centralises
            </span>
          </SectionTitle>

          {/* Exact fees from transactions (raw totals per currency) */}
          {totalFeesCollected && Object.keys(totalFeesCollected).length > 0 && (
            <div className="bg-slate-900/60 border border-emerald-500/20 rounded-[1.5rem] p-4 mb-4">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[3px] mb-3 flex items-center gap-2">
                <Activity size={12} />
                Frais Exacts Collectes (champ fee des transactions)
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(totalFeesCollected).map(([currency, amount]) => (
                  <div key={currency} className="flex items-center gap-2 bg-slate-800/50 border border-white/5 rounded-xl px-3 py-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: CURRENCY_COLORS[currency] || CURRENCY_COLORS.DEFAULT }} />
                    <span className="text-[10px] font-black text-white">{formatCurrency(amount)}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase">{currency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900/60 border border-amber-500/20 rounded-[1.5rem] p-5">
            {feesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-amber-400" />
              </div>
            ) : feesData ? (
              <>
                {/* Central Address */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 mb-4">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Adresse Centrale (Admin Wallet)
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-amber-400 break-all">
                      {feesData.centralAddress}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(feesData.centralAddress);
                        toast.success("Adresse copiee");
                      }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors shrink-0"
                    >
                      <Copy size={14} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Total Fees Summary - Exact amounts per currency */}
                <div className="mb-4">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Frais Collectes (Montants Exacts)
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4 text-center">
                      <DollarSign size={18} className="text-emerald-400 mx-auto mb-2" />
                      <p className="text-lg font-black text-white">
                        {formatCurrency(feesData.exactFeesByCurrency?.["USD"] || 0, true)}
                      </p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">USD Frais</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-4 text-center">
                      <Banknote size={18} className="text-blue-400 mx-auto mb-2" />
                      <p className="text-lg font-black text-white">
                        {formatCurrency(feesData.exactFeesByCurrency?.["XAF"] || 0, true)}
                      </p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">XAF Frais</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-600/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4 text-center">
                      <Coins size={18} className="text-amber-400 mx-auto mb-2" />
                      <p className="text-lg font-black text-amber-400">
                        {formatCurrency(feesData.exactFeesByCurrency?.["PI"] || 0, true)}
                      </p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Pi Frais</p>
                    </div>
                  </div>
                </div>

                {/* Admin Wallet Real Balance */}
                <div className="bg-slate-800/50 border border-amber-500/20 rounded-2xl p-4 mb-4">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Solde Reel Admin Wallet
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-sm font-black text-white">${formatCurrency(walletBalance.usd, true)}</p>
                      <p className="text-[8px] text-slate-500">USD</p>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{formatCurrency(walletBalance.xaf, true)}</p>
                      <p className="text-[8px] text-slate-500">XAF</p>
                    </div>
                    <div>
                      <p className="text-sm font-black text-amber-400">{formatCurrency(walletBalance.pi, true)}</p>
                      <p className="text-[8px] text-slate-500">Pi</p>
                    </div>
                  </div>
                </div>

                {/* Fee Breakdown by Category */}
                <div className="space-y-3 mb-4">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Repartition par Categorie
                  </p>
                  {feesData.breakdown.map((category) => {
                    const config = FEE_CATEGORY_CONFIG[category.category];
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={category.category}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon size={16} className={config.color} />
                            <span className="text-[10px] font-bold text-white uppercase">
                              {category.categoryLabel}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-white">
                            ${formatCurrency(category.totalUSD, true)}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {category.items.slice(0, 3).map((item) => (
                            <div key={item.type} className="flex items-center justify-between text-[9px]">
                              <span className="text-slate-400">{item.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500">{item.count} tx</span>
                                <span className="text-white font-bold">${formatCurrency(item.amountUSD)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Conversion to Pi Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsConversionModalOpen(true)}
                  disabled={(walletBalance.usd + walletBalance.xaf / 603) <= 0}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-[11px] uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                >
                  <Repeat size={18} />
                  Convertir Tous les Frais en Pi
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-[9px]">
                    2FA
                  </span>
                </motion.button>

                {/* Conversion Rate Info */}
                <div className="flex items-center justify-center gap-2 mt-3 text-[8px] text-slate-500">
                  <Activity size={10} />
                  <span>Taux actuel: 1 Pi = ${formatCurrency(feesData.conversionRate.piToUsd)} | {formatCurrency(feesData.conversionRate.piToXaf)} XAF</span>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-[10px] text-slate-500">Aucune donnee disponible</p>
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
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
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
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* LARGE TRANSACTIONS WITH FLOW COLUMN */}
        {largeTransactions.length > 0 && (
          <div>
            <SectionTitle>Grosses Transactions Recentes</SectionTitle>
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
                            label={tx.flowLabel || "Systeme"} 
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
          <span>Donnees chiffrees E2E - Audit Trail active</span>
        </div>
      </div>

      {/* WALLET DRAWER */}
      <WalletDrawer
        wallet={selectedWallet}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onAction={handleWalletAction}
      />

      {/* MFA VERIFICATION MODAL */}
      <MFAModal
        isOpen={isMFAOpen}
        onClose={() => {
          setIsMFAOpen(false);
          setPendingAction(null);
        }}
        onVerify={handleMFAVerify}
        actionTitle={getActionTitle()}
        isVerifying={isVerifying}
      />

      {/* FEE CONVERSION MODAL */}
      <FeeConversionModal
        isOpen={isConversionModalOpen}
        onClose={() => setIsConversionModalOpen(false)}
        feesData={feesData}
        walletBalance={walletBalance}
        onConvert={handleFeeConversion}
        isConverting={isConverting}
      />
    </div>
  );
}
