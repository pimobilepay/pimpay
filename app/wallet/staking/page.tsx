"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft, Lock, TrendingUp, Clock, CheckCircle2, ChevronRight,
  Zap, Info, RefreshCcw, Shield, BarChart3, Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { toast } from "sonner";

// ----- Types -----
interface StakingPool {
  id: string;
  asset: string;
  symbol: string;
  logo: React.ReactNode;
  apy: number;
  minStake: number;
  lockDays: number;
  totalStaked: number;
  description: string;
  color: string;
  borderColor: string;
}

interface ActiveStake {
  id: string;
  asset: string;
  symbol: string;
  amount: number;
  apy: number;
  startDate: string;
  endDate: string;
  earned: number;
  status: "ACTIVE" | "PENDING" | "COMPLETED";
}

// ----- Logos -----
const PiLogo = () => (
  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center border border-white/10 p-2">
    <img src="/pi.png" alt="Pi" className="w-full h-full object-contain" />
  </div>
);
const SdaLogo = () => (
  <div className="w-10 h-10 rounded-2xl bg-[#1e293b] flex items-center justify-center border border-emerald-500/20 p-2">
    <img src="/sda.png" alt="SDA" className="w-full h-full object-contain" />
  </div>
);

// ----- Staking Pools Data -----
const STAKING_POOLS: StakingPool[] = [
  {
    id: "pi-flex",
    asset: "Pi Network",
    symbol: "PI",
    logo: <PiLogo />,
    apy: 8.5,
    minStake: 1,
    lockDays: 30,
    totalStaked: 1240000,
    description: "Stakez vos Pi et gagnez des récompenses passives tous les jours.",
    color: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    id: "pi-locked",
    asset: "Pi Network",
    symbol: "PI",
    logo: <PiLogo />,
    apy: 14.2,
    minStake: 10,
    lockDays: 90,
    totalStaked: 860000,
    description: "Blocage 90 jours pour un rendement optimisé et des bonus exclusifs.",
    color: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
  },
  {
    id: "sda-flex",
    asset: "Sidra Chain",
    symbol: "SDA",
    logo: <SdaLogo />,
    apy: 12.0,
    minStake: 5,
    lockDays: 30,
    totalStaked: 420000,
    description: "Stakez SDA et profitez des récompenses du réseau Sidra Chain.",
    color: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
];

// ----- Stake Modal -----
function StakeModal({
  pool,
  onClose,
  onSuccess,
}: {
  pool: StakingPool;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const estimatedYearly =
    amount && !isNaN(parseFloat(amount))
      ? ((parseFloat(amount) * pool.apy) / 100).toFixed(4)
      : "0.0000";

  const handleStake = async () => {
    const val = parseFloat(amount);
    if (!val || val < pool.minStake) {
      toast.error(`Montant minimum : ${pool.minStake} ${pool.symbol}`);
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    toast.success(`${val} ${pool.symbol} mis en staking avec succès !`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0a0f1a] rounded-t-3xl border-t border-white/10 p-6 pb-10">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
        <div className="flex items-center gap-3 mb-6">
          {pool.logo}
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Staker {pool.symbol}
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase">
              {pool.apy}% APY · {pool.lockDays} jours
            </p>
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 mb-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            Montant
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder={`Min. ${pool.minStake}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-2xl font-black text-white outline-none placeholder:text-slate-700"
              autoFocus
            />
            <span className="text-sm font-black text-slate-400">{pool.symbol}</span>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 mb-5 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">APY</span>
            <span className="font-bold text-emerald-400">{pool.apy}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Durée de blocage</span>
            <span className="font-bold text-white">{pool.lockDays} jours</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Revenus estimés / an</span>
            <span className="font-bold text-emerald-400">
              {estimatedYearly} {pool.symbol}
            </span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex items-center gap-1.5">
            <Info size={11} className="text-slate-600" />
            <span className="text-[10px] text-slate-600">
              Les récompenses sont distribuées chaque jour
            </span>
          </div>
        </div>

        <button
          onClick={handleStake}
          disabled={loading}
          className="w-full bg-blue-600 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
        >
          {loading ? (
            <RefreshCcw size={16} className="animate-spin" />
          ) : (
            <Lock size={16} />
          )}
          Confirmer le Staking
        </button>
        <button
          onClick={onClose}
          className="w-full mt-3 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// ----- Main Page -----
export default function StakingPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [activeStakes, setActiveStakes] = useState<ActiveStake[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pools" | "my-stakes">("pools");

  const totalEarned = activeStakes.reduce((sum, s) => sum + s.earned, 0);
  const totalStakedValue = activeStakes.reduce((sum, s) => sum + s.amount, 0);

  const loadStakes = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    // Mock active stakes (to be replaced with real API)
    setActiveStakes([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    loadStakes();
  }, [loadStakes]);

  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen w-full bg-[#020617] text-white font-sans flex flex-col overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="px-5 pt-10 max-w-md mx-auto flex-grow w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 bg-white/5 rounded-xl border border-white/10 active:scale-95 transition-all"
            >
              <ArrowLeft size={18} className="text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter">
                <span className="text-blue-500">Staking</span>
              </h1>
              <p className="text-[9px] font-black text-blue-400/70 uppercase tracking-[0.2em] mt-0.5">
                Gagnez des revenus passifs
              </p>
            </div>
          </div>
          <button
            onClick={loadStakes}
            disabled={loading}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
          </button>
        </div>

        {/* Stats Banner */}
        <div className="relative w-full mb-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-emerald-500/10 to-blue-600/20 rounded-[2rem] blur-xl" />
          <div className="relative bg-gradient-to-br from-[#0c1629] to-[#0f172a] rounded-[1.75rem] p-5 border border-blue-500/10 overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="relative z-10 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  En Staking
                </p>
                <p className="text-lg font-black text-white">
                  {totalStakedValue.toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-600 font-bold">PI / SDA</p>
              </div>
              <div className="text-center border-x border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Revenus
                </p>
                <p className="text-lg font-black text-emerald-400">
                  +{totalEarned.toFixed(4)}
                </p>
                <p className="text-[9px] text-slate-600 font-bold">Cumulés</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  APY Max
                </p>
                <p className="text-lg font-black text-blue-400">14.2%</p>
                <p className="text-[9px] text-slate-600 font-bold">Annuel</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
          <button
            onClick={() => setActiveTab("pools")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "pools" ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Layers size={14} />
            Pools
          </button>
          <button
            onClick={() => setActiveTab("my-stakes")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "my-stakes" ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
          >
            <BarChart3 size={14} />
            Mes Stakes
          </button>
        </div>

        {/* Pools Tab */}
        {activeTab === "pools" && (
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between px-1 mb-1">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Pools disponibles
              </h3>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-emerald-400 uppercase">Live</span>
              </div>
            </div>

            {STAKING_POOLS.map((pool) => (
              <button
                key={pool.id}
                onClick={() => setSelectedPool(pool)}
                className={`w-full p-4 rounded-2xl border ${pool.color} ${pool.borderColor} text-left active:scale-[0.98] transition-all group`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {pool.logo}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-black text-white uppercase tracking-tight">
                          {pool.symbol}
                        </p>
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          {pool.apy}% APY
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        {pool.asset}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
                </div>

                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                  {pool.description}
                </p>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Clock size={10} className="text-slate-600" />
                    <span className="text-[10px] font-bold text-slate-500">
                      {pool.lockDays} jours
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield size={10} className="text-slate-600" />
                    <span className="text-[10px] font-bold text-slate-500">
                      Min. {pool.minStake} {pool.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={10} className="text-slate-600" />
                    <span className="text-[10px] font-bold text-slate-500">
                      {(pool.totalStaked / 1000).toFixed(0)}K stakés
                    </span>
                  </div>
                </div>
              </button>
            ))}

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl mt-2">
              <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Le staking vous permet de bloquer vos actifs pour une période donnée et de recevoir des récompenses quotidiennes. Les fonds peuvent être retirés à la fin de la période.
              </p>
            </div>
          </div>
        )}

        {/* My Stakes Tab */}
        {activeTab === "my-stakes" && (
          <div className="mb-8">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/10" />
                      <div className="flex-1">
                        <div className="h-3 w-24 bg-white/10 rounded mb-2" />
                        <div className="h-2 w-16 bg-white/5 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeStakes.length > 0 ? (
              <div className="space-y-3">
                {activeStakes.map((stake) => (
                  <div
                    key={stake.id}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Lock size={14} className="text-blue-400" />
                        <span className="text-[12px] font-black text-white uppercase">
                          {stake.amount} {stake.symbol}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${stake.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : stake.status === "PENDING" ? "bg-yellow-500/10 text-yellow-400" : "bg-slate-500/10 text-slate-400"}`}>
                        {stake.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mb-0.5">APY</p>
                        <p className="text-[11px] font-black text-emerald-400">{stake.apy}%</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mb-0.5">Gagné</p>
                        <p className="text-[11px] font-black text-white">+{stake.earned.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mb-0.5">Fin</p>
                        <p className="text-[11px] font-black text-white">{new Date(stake.endDate).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                  <Lock size={28} className="text-slate-700" />
                </div>
                <p className="text-[13px] font-black text-slate-500 uppercase tracking-wide mb-1">
                  Aucun staking actif
                </p>
                <p className="text-[11px] text-slate-600 mb-5">
                  Commencez à staker pour gagner des récompenses.
                </p>
                <button
                  onClick={() => setActiveTab("pools")}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-600 rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Zap size={14} fill="currentColor" className="text-yellow-400" />
                  Voir les pools
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedPool && (
        <StakeModal
          pool={selectedPool}
          onClose={() => setSelectedPool(null)}
          onSuccess={loadStakes}
        />
      )}

      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}
