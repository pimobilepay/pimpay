// app/api/fees/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type FeeType = "transfer" | "withdraw";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "transfer") as FeeType;
    const currency = (url.searchParams.get("currency") || "XAF").toUpperCase();

    // (Optionnel) si plus tard tu veux un fee dépendant du montant
    const amountParam = url.searchParams.get("amount");
    const amount = amountParam ? parseFloat(amountParam) : null;

    // Récupère la config globale
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: {
        transactionFee: true,
        minWithdrawal: true,
        maxWithdrawal: true,
        appVersion: true,
        maintenanceMode: true,
        comingSoonMode: true,
      },
    });

    // Fallbacks si config absente
    const transactionFee = config?.transactionFee ?? 0.01;
    const minWithdrawal = config?.minWithdrawal ?? 1.0;
    const maxWithdrawal = config?.maxWithdrawal ?? 5000.0;

    // Fee calculé (aujourd’hui: flat fee = transactionFee)
    // Tu peux faire évoluer ici: fee = %, réseau, plafond, etc.
    const fee =
      type === "withdraw"
        ? transactionFee
        : transactionFee;

    // Exemple de validation simple future-proof (sans bloquer)
    const warnings: string[] = [];
    if (amount !== null && Number.isFinite(amount) && type === "withdraw") {
      if (amount < minWithdrawal) warnings.push("AMOUNT_BELOW_MIN_WITHDRAWAL");
      if (amount > maxWithdrawal) warnings.push("AMOUNT_ABOVE_MAX_WITHDRAWAL");
    }

    return NextResponse.json(
      {
        ok: true,
        type,
        currency,
        fee, // le fee que le front doit afficher/utiliser
        transactionFee, // valeur brute de config
        minWithdrawal,
        maxWithdrawal,
        flags: {
          appVersion: config?.appVersion ?? null,
          maintenanceMode: config?.maintenanceMode ?? false,
          comingSoonMode: config?.comingSoonMode ?? false,
        },
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
  } catch (error: any) {
    console.error("GET /api/fees error:", error?.message || error);
    return NextResponse.json(
      { ok: false, error: "Impossible de récupérer les frais." },
      { status: 500 }
    );
  }
}
