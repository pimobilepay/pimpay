"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { usePiPayment } from "./usePiPayment";

/**
 * PIM Coin packages available for purchase
 * Users pay Pi to receive PIM coins (in-app currency)
 */
export const PIM_PACKAGES = [
  { id: "pim_100", pimCoins: 100, piCost: 1, bonus: 0, label: "Starter" },
  { id: "pim_550", pimCoins: 550, piCost: 5, bonus: 50, label: "Popular" },
  { id: "pim_1200", pimCoins: 1200, piCost: 10, bonus: 200, label: "Best Value" },
  { id: "pim_2600", pimCoins: 2600, piCost: 20, bonus: 600, label: "Premium" },
  { id: "pim_7000", pimCoins: 7000, piCost: 50, bonus: 2000, label: "Ultimate" },
] as const;

export type PimPackage = typeof PIM_PACKAGES[number];

interface PurchaseResult {
  success: boolean;
  txid?: string;
  pimCoins?: number;
  error?: string;
}

/**
 * Hook for purchasing PIM Coins with Pi
 * 
 * Uses the U2A (User-to-App) payment flow:
 * 1. User selects a PIM coin package
 * 2. Pi.createPayment() opens the Pi payment dialog
 * 3. onReadyForServerApproval: backend calls Pi /approve endpoint
 * 4. User signs the transaction in Pi Browser
 * 5. onReadyForServerCompletion: backend calls Pi /complete endpoint and credits PIM coins
 */
export const usePimCoinPurchase = () => {
  const { createPayment, loading: paymentLoading } = usePiPayment();
  const [loading, setLoading] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<PurchaseResult | null>(null);

  /**
   * Purchase a PIM coin package with Pi
   * 
   * @param packageId - The ID of the PIM package to purchase
   * @returns Promise with purchase result
   */
  const purchasePimCoins = useCallback(async (packageId: string): Promise<PurchaseResult> => {
    const selectedPackage = PIM_PACKAGES.find(p => p.id === packageId);
    
    if (!selectedPackage) {
      toast.error("Package invalide");
      return { success: false, error: "Package invalide" };
    }

    setLoading(true);

    try {
      const result = await createPayment({
        amount: selectedPackage.piCost,
        memo: `Achat PIM Coins: ${selectedPackage.pimCoins} PIM`,
        metadata: {
          type: "PIM_COIN_PURCHASE",
          productId: selectedPackage.id,
          pimCoins: selectedPackage.pimCoins,
          bonus: selectedPackage.bonus,
          currency: "PIM",
          timestamp: new Date().toISOString(),
        },
      });

      if (result.success) {
        const purchaseResult: PurchaseResult = {
          success: true,
          txid: result.txid,
          pimCoins: selectedPackage.pimCoins,
        };
        setLastPurchase(purchaseResult);
        toast.success(`+${selectedPackage.pimCoins} PIM coins ajoutes !`, {
          description: selectedPackage.bonus > 0 
            ? `Inclus ${selectedPackage.bonus} PIM bonus !` 
            : undefined,
        });
        return purchaseResult;
      } else {
        const purchaseResult: PurchaseResult = {
          success: false,
          error: result.error,
        };
        setLastPurchase(purchaseResult);
        return purchaseResult;
      }
    } catch (error: any) {
      const purchaseResult: PurchaseResult = {
        success: false,
        error: error.message || "Erreur lors de l'achat",
      };
      setLastPurchase(purchaseResult);
      toast.error(purchaseResult.error);
      return purchaseResult;
    } finally {
      setLoading(false);
    }
  }, [createPayment]);

  /**
   * Purchase PIM coins with a custom amount
   * 
   * @param piAmount - Amount of Pi to spend
   * @returns Promise with purchase result
   */
  const purchaseCustomAmount = useCallback(async (piAmount: number): Promise<PurchaseResult> => {
    if (piAmount <= 0) {
      toast.error("Le montant doit etre superieur a 0");
      return { success: false, error: "Montant invalide" };
    }

    // 100 PIM per 1 Pi base rate
    const pimCoins = Math.floor(piAmount * 100);

    setLoading(true);

    try {
      const result = await createPayment({
        amount: piAmount,
        memo: `Achat PIM Coins: ${pimCoins} PIM`,
        metadata: {
          type: "PIM_COIN_PURCHASE",
          productId: "custom",
          pimCoins: pimCoins,
          bonus: 0,
          currency: "PIM",
          timestamp: new Date().toISOString(),
        },
      });

      if (result.success) {
        const purchaseResult: PurchaseResult = {
          success: true,
          txid: result.txid,
          pimCoins: pimCoins,
        };
        setLastPurchase(purchaseResult);
        toast.success(`+${pimCoins} PIM coins ajoutes !`);
        return purchaseResult;
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message || "Erreur lors de l'achat" };
    } finally {
      setLoading(false);
    }
  }, [createPayment]);

  return {
    purchasePimCoins,
    purchaseCustomAmount,
    loading: loading || paymentLoading,
    lastPurchase,
    packages: PIM_PACKAGES,
  };
};
