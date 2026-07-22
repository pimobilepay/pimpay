"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Coins, Loader2, RefreshCcw } from "lucide-react";
import { PimMiner } from "@/components/PimMiner";
import { BottomNav } from "@/components/bottom-nav";

export default function PimCoinsPage() {
  const router = useRouter();
  const [pimBalance, setPimBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/pim/mine", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPimBalance(data.balance || 0);
      }
    } catch (error) {
      console.error("Error fetching PIM balance:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    checkAuth();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-amber-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold">Minage PIM</h1>
            <p className="text-xs text-slate-500">Minez vos PIM Coins toutes les 24h</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Rafraichir"
        >
          <RefreshCcw size={20} className={isRefreshing ? "animate-spin" : ""} />
        </button>
      </header>

      {/* Solde PIM */}
      <div className="px-4 pt-6">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/30 flex items-center justify-center">
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs text-amber-400 font-medium">Votre solde PIM</span>
          </div>
          <p className="text-3xl font-black text-white">
            {pimBalance.toLocaleString()} <span className="text-base font-bold text-amber-400/70">PIM</span>
          </p>
        </div>
      </div>

      {/* Minage */}
      <div className="px-4 py-8">
        <PimMiner key={refreshKey} onBalanceChange={setPimBalance} />
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
