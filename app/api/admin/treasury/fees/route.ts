export const dynamic = "force-dynamic";

import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

type FeeCategory =
  | "CRYPTO_FEES"
  | "FIAT_FEES"
  | "PAYMENT_FEES"
  | "OTHER_FEES";

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
    const xafRate = 603;

    // === FIX: Aggregate fees grouped by BOTH type AND currency ===
    // This gives exact fee amounts per transaction type and currency
    const feesByTypeAndCurrency = await prisma.transaction.groupBy({
      by: ["type", "currency"],
      _sum: { fee: true },
      _count: true,
      where: {
        status: "SUCCESS",
        fee: { gt: 0 },
      },
    });

    // === FIX: Also get total fees per currency for exact wallet balance display ===
    const feesByCurrency = await prisma.transaction.groupBy({
      by: ["currency"],
      _sum: { fee: true },
      _count: true,
      where: {
        status: "SUCCESS",
        fee: { gt: 0 },
      },
    });

    // Helper to convert any currency to USD
    const toUSD = (amount: number, currency: string): number => {
      if (currency === "PI") return amount * piPrice;
      if (currency === "XAF") return amount / xafRate;
      if (currency === "USD") return amount;
      if (currency === "EUR") return amount * 1.08;
      return amount;
    };

    const toPi = (usdAmount: number): number => usdAmount / piPrice;
    const toXAF = (usdAmount: number): number => usdAmount * xafRate;

    // Type labels
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

    // Category classifiers
    const cryptoTypes = ["EXCHANGE", "STAKING_REWARD", "AIRDROP"];
    const fiatDepositTypes = ["DEPOSIT"];
    const withdrawTypes = ["WITHDRAW", "WITHDRAWAL"];
    const paymentTypes = ["PAYMENT", "CARD_PURCHASE", "CARD_RECHARGE", "CARD_WITHDRAW"];

    const cryptoFees: FeeBreakdown = { category: "CRYPTO_FEES", categoryLabel: "Frais Crypto", totalUSD: 0, totalPi: 0, totalXAF: 0, items: [] };
    const fiatFees: FeeBreakdown = { category: "FIAT_FEES", categoryLabel: "Frais Fiat", totalUSD: 0, totalPi: 0, totalXAF: 0, items: [] };
    const paymentFees: FeeBreakdown = { category: "PAYMENT_FEES", categoryLabel: "Frais Paiements", totalUSD: 0, totalPi: 0, totalXAF: 0, items: [] };
    const otherFees: FeeBreakdown = { category: "OTHER_FEES", categoryLabel: "Autres Frais", totalUSD: 0, totalPi: 0, totalXAF: 0, items: [] };

    // Process each fee group (type + currency combination)
    for (const group of feesByTypeAndCurrency) {
      const feeSum = group._sum.fee || 0;
      if (feeSum <= 0) continue;

      const feeUSD = toUSD(feeSum, group.currency);
      const feePi = toPi(feeUSD);
      const feeXAF = toXAF(feeUSD);

      const item = {
        type: `${group.type}_${group.currency}`,
        label: `${typeLabels[group.type] || group.type} (${group.currency})`,
        amountUSD: feeUSD,
        amountPi: feePi,
        amountXAF: feeXAF,
        count: group._count,
      };

      const isCrypto = cryptoTypes.includes(group.type) ||
        (group.currency !== "XAF" && group.currency !== "USD" && group.currency !== "EUR");

      if (isCrypto) {
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

    const totalFeesUSD = cryptoFees.totalUSD + fiatFees.totalUSD + paymentFees.totalUSD + otherFees.totalUSD;
    const totalFeesPi = cryptoFees.totalPi + fiatFees.totalPi + paymentFees.totalPi + otherFees.totalPi;
    const totalFeesXAF = cryptoFees.totalXAF + fiatFees.totalXAF + paymentFees.totalXAF + otherFees.totalXAF;

    // === FIX: Exact fee amounts per currency (from transaction.fee field) ===
    const exactFeesByCurrency: Record<string, number> = {};
    for (const f of feesByCurrency) {
      exactFeesByCurrency[f.currency] = f._sum.fee || 0;
    }

    // === FIX: The wallet balance shown is the ADMIN system wallet real balance ===
    // This is the actual money in the platform's admin wallet
    const walletBalance = {
      usd: adminWallet?.balanceUSD ?? 0,
      pi: adminWallet?.balancePi ?? 0,
      xaf: adminWallet?.balanceXAF ?? 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        totalFeesUSD,
        totalFeesPi,
        totalFeesXAF,
        centralAddress: adminWallet?.publicAddress || "ADMIN_WALLET_NOT_CONFIGURED",
        breakdown: [cryptoFees, fiatFees, paymentFees, otherFees].filter((b) => b.items.length > 0),
        lastUpdated: new Date().toISOString(),
        conversionRate: {
          piToUsd: piPrice,
          piToXaf: piPrice * xafRate,
        },
        // Exact fee amounts per currency (raw, before conversion)
        exactFeesByCurrency,
      },
      // Real admin wallet balance
      walletBalance,
    });
  } catch (error: unknown) {
    console.error("CENTRALIZED_FEES_GET_ERROR:", error);
    const message = error instanceof Error ? getErrorMessage(error) : "Erreur serveur";
    return NextResponse.json({ error: "Erreur serveur", details: message }, { status: 500 });
  }
}
