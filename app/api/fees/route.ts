// app/api/fees/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFeeConfig, getFeeRate, type FeeType } from "@/lib/fees";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "transfer") as FeeType;
    const currency = (url.searchParams.get("currency") || "XAF").toUpperCase();
    const amountParam = url.searchParams.get("amount");
    const amount = amountParam ? parseFloat(amountParam) : null;

    // Récupère la config centralisée
    const feeConfig = await getFeeConfig();

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
          transferFee: feeConfig.transferFee,
          withdrawFee: feeConfig.withdrawFee,
          depositMobileFee: feeConfig.depositMobileFee,
          depositCardFee: feeConfig.depositCardFee,
          exchangeFee: feeConfig.exchangeFee,
          cardPaymentFee: feeConfig.cardPaymentFee,
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
