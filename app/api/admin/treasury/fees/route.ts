export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

// Fee category types
type FeeCategory = 
  | "CRYPTO_FEES"      // transferFee, withdrawFee, depositCryptoFee, exchangeFee
  | "FIAT_FEES"        // depositMobileFee, depositCardFee, withdrawMobileFee, withdrawBankFee
  | "PAYMENT_FEES"     // cardPaymentFee, merchantPaymentFee, billPaymentFee, qrPaymentFee
  | "OTHER_FEES";      // transactionFee, fiatTransferFee

interface FeeBreakdown {
  category: FeeCategory;
  categoryLabel: string;
  totalUSD: number;
  totalPi: number;
  totalXAF: number;
  items: {
    type: string;
    label: string;
    amountUSD: number;
    amountPi: number;
    amountXAF: number;
    count: number;
  }[];
}

interface CentralizedFees {
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
}

/**
 * GET - Fetch all centralized platform fees
 * Aggregates fees from all transactions and organizes by category
 */
export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Get the Admin wallet (central address for fees)
    const adminWallet = await prisma.systemWallet.findUnique({
      where: { type: "ADMIN" },
      select: {
        publicAddress: true,
        balanceUSD: true,
        balancePi: true,
        balanceXAF: true,
      },
    });

    // Get Pi consensus price
    const systemConfig = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: { consensusPrice: true },
    });
    const piPrice = systemConfig?.consensusPrice || 314159.0;
    const xafRate = 603; // XAF per USD

    // Aggregate fees from all successful transactions
    const feeStats = await prisma.transaction.aggregate({
      _sum: { fee: true },
      _count: true,
      where: { 
        status: "SUCCESS",
        fee: { gt: 0 },
      },
    });

    // Get fees breakdown by transaction type
    const feesByType = await prisma.transaction.groupBy({
      by: ["type", "currency"],
      _sum: { fee: true },
      _count: true,
      where: {
        status: "SUCCESS",
        fee: { gt: 0 },
      },
    });

    // Calculate fees by category
    const cryptoTypes = ["EXCHANGE", "STAKING_REWARD", "AIRDROP"];
    const fiatDepositTypes = ["DEPOSIT"];
    const withdrawTypes = ["WITHDRAW", "WITHDRAWAL"];
    const paymentTypes = ["PAYMENT", "CARD_PURCHASE", "CARD_RECHARGE", "CARD_WITHDRAW"];
    const transferTypes = ["TRANSFER"];

    // Helper to convert to USD
    const toUSD = (amount: number, currency: string): number => {
      if (currency === "PI") return amount * piPrice;
      if (currency === "XAF") return amount / xafRate;
      if (currency === "USD") return amount;
      if (currency === "EUR") return amount * 1.08;
      return amount; // Default 1:1
    };

    // Helper to convert to Pi
    const toPi = (usdAmount: number): number => usdAmount / piPrice;

    // Helper to convert to XAF
    const toXAF = (usdAmount: number): number => usdAmount * xafRate;

    // Build breakdown by category
    const cryptoFees: FeeBreakdown = {
      category: "CRYPTO_FEES",
      categoryLabel: "Frais Crypto",
      totalUSD: 0,
      totalPi: 0,
      totalXAF: 0,
      items: [],
    };

    const fiatFees: FeeBreakdown = {
      category: "FIAT_FEES",
      categoryLabel: "Frais Fiat",
      totalUSD: 0,
      totalPi: 0,
      totalXAF: 0,
      items: [],
    };

    const paymentFees: FeeBreakdown = {
      category: "PAYMENT_FEES",
      categoryLabel: "Frais Paiements",
      totalUSD: 0,
      totalPi: 0,
      totalXAF: 0,
      items: [],
    };

    const otherFees: FeeBreakdown = {
      category: "OTHER_FEES",
      categoryLabel: "Autres Frais",
      totalUSD: 0,
      totalPi: 0,
      totalXAF: 0,
      items: [],
    };

    // Type labels mapping
    const typeLabels: Record<string, string> = {
      TRANSFER: "Transferts",
      WITHDRAW: "Retraits",
      WITHDRAWAL: "Retraits",
      DEPOSIT: "Depots",
      PAYMENT: "Paiements",
      EXCHANGE: "Echanges",
      STAKING_REWARD: "Recompenses Staking",
      AIRDROP: "Airdrops",
      CARD_PURCHASE: "Achats Carte",
      CARD_RECHARGE: "Recharges Carte",
      CARD_WITHDRAW: "Retraits Carte",
    };

    // Process each fee group
    for (const group of feesByType) {
      const feeSum = group._sum.fee || 0;
      const feeUSD = toUSD(feeSum, group.currency);
      const feePi = toPi(feeUSD);
      const feeXAF = toXAF(feeUSD);

      const item = {
        type: group.type,
        label: typeLabels[group.type] || group.type,
        amountUSD: feeUSD,
        amountPi: feePi,
        amountXAF: feeXAF,
        count: group._count,
      };

      // Categorize
      if (cryptoTypes.includes(group.type) || (group.currency !== "XAF" && group.currency !== "USD" && group.currency !== "EUR")) {
        cryptoFees.items.push(item);
        cryptoFees.totalUSD += feeUSD;
        cryptoFees.totalPi += feePi;
        cryptoFees.totalXAF += feeXAF;
      } else if (fiatDepositTypes.includes(group.type)) {
        fiatFees.items.push(item);
        fiatFees.totalUSD += feeUSD;
        fiatFees.totalPi += feePi;
        fiatFees.totalXAF += feeXAF;
      } else if (withdrawTypes.includes(group.type)) {
        fiatFees.items.push(item);
        fiatFees.totalUSD += feeUSD;
        fiatFees.totalPi += feePi;
        fiatFees.totalXAF += feeXAF;
      } else if (paymentTypes.includes(group.type)) {
        paymentFees.items.push(item);
        paymentFees.totalUSD += feeUSD;
        paymentFees.totalPi += feePi;
        paymentFees.totalXAF += feeXAF;
      } else {
        otherFees.items.push(item);
        otherFees.totalUSD += feeUSD;
        otherFees.totalPi += feePi;
        otherFees.totalXAF += feeXAF;
      }
    }

    // Total centralized fees
    const totalFeesUSD = cryptoFees.totalUSD + fiatFees.totalUSD + paymentFees.totalUSD + otherFees.totalUSD;
    const totalFeesPi = cryptoFees.totalPi + fiatFees.totalPi + paymentFees.totalPi + otherFees.totalPi;
    const totalFeesXAF = cryptoFees.totalXAF + fiatFees.totalXAF + paymentFees.totalXAF + otherFees.totalXAF;

    const response: CentralizedFees = {
      totalFeesUSD,
      totalFeesPi,
      totalFeesXAF,
      centralAddress: adminWallet?.publicAddress || "GB_ADMIN_WALLET_ADDRESS_PI_NETWORK",
      breakdown: [cryptoFees, fiatFees, paymentFees, otherFees].filter(b => b.items.length > 0),
      lastUpdated: new Date().toISOString(),
      conversionRate: {
        piToUsd: piPrice,
        piToXaf: piPrice * xafRate,
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
      walletBalance: {
        usd: adminWallet?.balanceUSD || 0,
        pi: adminWallet?.balancePi || 0,
        xaf: adminWallet?.balanceXAF || 0,
      },
    });
  } catch (error: unknown) {
    console.error("CENTRALIZED_FEES_GET_ERROR:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: "Erreur serveur", details: message }, { status: 500 });
  }
}
