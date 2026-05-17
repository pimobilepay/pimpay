"use client";

import { useState } from "react";
import { Coins, Sparkles, Loader2, CheckCircle, Zap, Crown, Star } from "lucide-react";
import { usePimCoinPurchase, PIM_PACKAGES, type PimPackage } from "@/hooks/usePimCoinPurchase";
import { cn } from "@/lib/utils";

interface PimCoinShopProps {
  onPurchaseComplete?: (pimCoins: number) => void;
  className?: string;
}

const PACKAGE_ICONS: Record<string, React.ReactNode> = {
  pim_100: <Coins className="w-6 h-6" />,
  pim_550: <Star className="w-6 h-6" />,
  pim_1200: <Sparkles className="w-6 h-6" />,
  pim_2600: <Zap className="w-6 h-6" />,
  pim_7000: <Crown className="w-6 h-6" />,
};

const PACKAGE_COLORS: Record<string, string> = {
  pim_100: "from-slate-500 to-slate-600",
  pim_550: "from-blue-500 to-blue-600",
  pim_1200: "from-emerald-500 to-emerald-600",
  pim_2600: "from-purple-500 to-purple-600",
  pim_7000: "from-amber-500 to-orange-500",
};

/**
 * PIM Coin Shop Component
 * 
 * Displays available PIM coin packages for purchase with Pi.
 * Uses the U2A payment flow via usePimCoinPurchase hook.
 */
export function PimCoinShop({ onPurchaseComplete, className }: PimCoinShopProps) {
  const { purchasePimCoins, loading, packages } = usePimCoinPurchase();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [purchasedPackage, setPurchasedPackage] = useState<string | null>(null);

  const handlePurchase = async (pkg: PimPackage) => {
    if (loading) return;
    
    setSelectedPackage(pkg.id);
    const result = await purchasePimCoins(pkg.id);
    
    if (result.success) {
      setPurchasedPackage(pkg.id);
      onPurchaseComplete?.(result.pimCoins || pkg.pimCoins);
      
      // Reset success state after 3 seconds
      setTimeout(() => setPurchasedPackage(null), 3000);
    }
    
    setSelectedPackage(null);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full border border-amber-500/30 mb-3">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-amber-400 font-bold text-sm">PIM COINS</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Boutique PIM Coins</h2>
        <p className="text-slate-400 text-sm">
          Achetez des PIM Coins avec Pi pour debloquer des fonctionnalites premium
        </p>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          const isSelected = selectedPackage === pkg.id;
          const isPurchased = purchasedPackage === pkg.id;
          const isPopular = pkg.label === "Popular";
          const isBestValue = pkg.label === "Best Value";

          return (
            <button
              key={pkg.id}
              onClick={() => handlePurchase(pkg)}
              disabled={loading}
              className={cn(
                "relative p-4 rounded-2xl border transition-all duration-300",
                "bg-slate-900/50 backdrop-blur-sm",
                "hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
                isSelected && "ring-2 ring-amber-500 border-amber-500/50",
                isPurchased && "ring-2 ring-emerald-500 border-emerald-500/50 bg-emerald-500/10",
                !isSelected && !isPurchased && "border-slate-700/50 hover:border-slate-600",
                loading && !isSelected && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Badge */}
              {(isPopular || isBestValue) && (
                <div className={cn(
                  "absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold",
                  isPopular && "bg-blue-500 text-white",
                  isBestValue && "bg-emerald-500 text-white"
                )}>
                  {isPopular ? "POPULAIRE" : "MEILLEUR RAPPORT"}
                </div>
              )}

              {/* Icon */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto",
                "bg-gradient-to-br text-white",
                PACKAGE_COLORS[pkg.id] || "from-slate-500 to-slate-600"
              )}>
                {isPurchased ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : isSelected && loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  PACKAGE_ICONS[pkg.id] || <Coins className="w-6 h-6" />
                )}
              </div>

              {/* PIM Amount */}
              <div className="text-center mb-2">
                <span className="text-2xl font-black text-white">
                  {pkg.pimCoins.toLocaleString()}
                </span>
                <span className="text-amber-400 font-bold ml-1">PIM</span>
              </div>

              {/* Bonus */}
              {pkg.bonus > 0 && (
                <div className="text-center mb-2">
                  <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
                    +{pkg.bonus} BONUS
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-lg font-bold text-slate-300">
                    {pkg.piCost}
                  </span>
                  <span className="text-sm text-slate-500 font-medium">Pi</span>
                </div>
              </div>

              {/* Loading Overlay */}
              {isSelected && loading && (
                <div className="absolute inset-0 bg-slate-900/80 rounded-2xl flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-2" />
                  <span className="text-xs text-slate-400">Paiement en cours...</span>
                </div>
              )}

              {/* Success Overlay */}
              {isPurchased && (
                <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl flex flex-col items-center justify-center border-2 border-emerald-500">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mb-2" />
                  <span className="text-sm font-bold text-emerald-400">Achat reussi !</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Comment ca marche ?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Selectionnez un pack et payez avec Pi via le Pi Browser. 
              Vos PIM Coins seront credites instantanement apres confirmation du paiement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact PIM Balance Display
 */
export function PimBalanceDisplay({ balance, className }: { balance: number; className?: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10",
      "rounded-full border border-amber-500/30",
      className
    )}>
      <Coins className="w-4 h-4 text-amber-400" />
      <span className="text-amber-400 font-bold text-sm">
        {balance.toLocaleString()} PIM
      </span>
    </div>
  );
}
