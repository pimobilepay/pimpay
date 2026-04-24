// app/api/fees/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFeeConfig, getFeeRate, type FeeType } from "@/lib/fees";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "transfer") as FeeType;
    const currency = (url.searchParams.get("currency") || "XAF").toUpperCase();
    const amountParam = url.searchParams.get("amount");
    const amount = amountParam ? parseFloat(amountParam) : null;

    // Récupère la config centralisée
    const feeConfig = await getFeeConfig();
    
    // Récupère les bonus de parrainage
    let referralBonus = 0.0005;
    let referralWelcomeBonus = 0.00025;
    try {
      const systemConfig = await prisma.systemConfig.findUnique({
        where: { id: "GLOBAL_CONFIG" },
        select: { referralBonus: true, referralWelcomeBonus: true }
      });
      if (systemConfig) {
        referralBonus = systemConfig.referralBonus ?? 0.0005;
        referralWelcomeBonus = systemConfig.referralWelcomeBonus ?? 0.00025;
      }
    } catch { /* Use defaults */ }

    // Fee pour le type demandé
    const fee = getFeeRate(feeConfig, type);

    // Validation des limites de retrait
    const warnings: string[] = [];
    if (amount !== null && Number.isFinite(amount) && type === "withdraw") {
      if (amount < feeConfig.minWithdrawal) warnings.push("AMOUNT_BELOW_MIN_WITHDRAWAL");
      if (amount > feeConfig.maxWithdrawal) warnings.push("AMOUNT_ABOVE_MAX_WITHDRAWAL");
    }

    return NextResponse.json(
      {
        ok: true,
        type,
        currency,
        fee,
        // Tous les frais individuels pour le front-end
        fees: {
          // Crypto Fees
          transferFee: feeConfig.transferFee,
          withdrawFee: feeConfig.withdrawFee,
          depositCryptoFee: feeConfig.depositCryptoFee,
          exchangeFee: feeConfig.exchangeFee,
          // Fiat Fees
          depositMobileFee: feeConfig.depositMobileFee,
          depositCardFee: feeConfig.depositCardFee,
          withdrawMobileFee: feeConfig.withdrawMobileFee,
          withdrawBankFee: feeConfig.withdrawBankFee,
          fiatTransferFee: feeConfig.fiatTransferFee,
          // Payment Fees
          cardPaymentFee: feeConfig.cardPaymentFee,
          merchantPaymentFee: feeConfig.merchantPaymentFee,
          billPaymentFee: feeConfig.billPaymentFee,
          qrPaymentFee: feeConfig.qrPaymentFee,
        },
        // Referral bonuses
        referral: {
          referralBonus,
          referralWelcomeBonus,
        },
        minWithdrawal: feeConfig.minWithdrawal,
        maxWithdrawal: feeConfig.maxWithdrawal,
        warnings,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/fees error:", message);
    return NextResponse.json(
      { ok: false, error: "Impossible de récupérer les frais." },
      { status: 500 }
    );
  }
}
