"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Coins, Loader2, RefreshCcw, Wallet } from "lucide-react";
import { PimCoinShop, PimBalanceDisplay } from "@/components/PimCoinShop";
import { PimCheckoutOverlay } from "@/components/PimCheckoutOverlay";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import type { PimPackage } from "@/hooks/usePimCoinPurchase";

export default function PimCoinsPage() {
  const router = useRouter();
  const [pimBalance, setPimBalance] = useState<number>(0);
  const [piBalance, setPiBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PimPackage | null>(null);

  const fetchBalances = async () => {
    try {
      const [pimRes, profileRes] = await Promise.all([
        fetch("/api/payments/pim/complete", { cache: "no-store" }),
        fetch("/api/user/profile", { cache: "no-store" }),
      ]);

      if (pimRes.ok) {
        const pimData = await pimRes.json();
        setPimBalance(pimData.balance || 0);
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const piWallet = profileData.user?.wallets?.find((w: any) => w.currency === "PI");
        setPiBalance(piWallet?.balance || 0);
      } else if (profileRes.status === 401) {
        router.push("/auth/login");
        return;
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBalances();
  };

  const handlePurchaseComplete = (pimCoins: number) => {
    // Update balance optimistically
    setPimBalance((prev) => prev + pimCoins);
    // Refresh to get accurate balance
    setTimeout(fetchBalances, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
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
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold">PIM Coins</h1>
            <p className="text-xs text-slate-500">Achetez des coins avec Pi</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <RefreshCcw size={20} className={isRefreshing ? "animate-spin" : ""} />
        </button>
      </header>

      {/* Balance Cards */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* PIM Balance */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/30 flex items-center justify-center">
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-xs text-amber-400 font-medium">PIM Coins</span>
            </div>
            <p className="text-2xl font-black text-white">
              {pimBalance.toLocaleString()}
            </p>
          </div>

          {/* Pi Balance */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/30 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xs text-blue-400 font-medium">Solde Pi</span>
            </div>
            <p className="text-2xl font-black text-white">
              {piBalance.toFixed(4)} <span className="text-sm text-slate-400">Pi</span>
            </p>
          </div>
        </div>

        {/* PIM Coin Shop */}
        <PimCoinShop onSelectPackage={(pkg) => setSelectedPackage(pkg)} />

        {/* What can you do with PIM */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4">Utilisez vos PIM Coins</h3>
          <div className="space-y-3">
            {[
              { icon: "🎨", title: "Themes Premium", desc: "Personnalisez l'apparence de votre app" },
              { icon: "⚡", title: "Transferts Express", desc: "Priorite sur les transactions" },
              { icon: "🎁", title: "Recompenses Exclusives", desc: "Acces aux airdrops speciaux" },
              { icon: "🛡️", title: "Limites Augmentees", desc: "Augmentez vos plafonds journaliers" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checkout flow: summary -> processing -> success / failed */}
      {selectedPackage && (
        <PimCheckoutOverlay
          pkg={selectedPackage}
          pimBalance={pimBalance}
          piBalance={piBalance}
          onClose={() => setSelectedPackage(null)}
          onPurchaseComplete={handlePurchaseComplete}
        />
      )}

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
