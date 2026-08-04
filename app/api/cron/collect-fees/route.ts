/**
 * GET /api/cron/collect-fees — Filet de sécurité de l'encaissement des frais.
 *
 * Toutes les routes créditent déjà le wallet opérateur au moment du prélèvement.
 * Ce CRON rattrape les cas résiduels : webhook perdu, process interrompu entre
 * la mise à SUCCESS de la transaction et l'encaissement du frais, ou frais
 * historiques antérieurs à la mise en place du wallet opérateur.
 *
 * L'opération est idempotente : la référence `FEE-<transactionId>` est UNIQUE
 * en base, donc un frais déjà encaissé est ignoré, jamais crédité deux fois.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, logCronStart, logCronEnd } from "@/lib/cron-auth";
import { sweepUncollectedFees } from "@/lib/operator-wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  logCronStart("collect-fees", req);

  try {
    const result = await sweepUncollectedFees(500);

    logCronEnd("collect-fees", {
      scanned: result.scanned,
      collected: result.collected,
      skipped: result.skipped,
      failed: result.failed,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[CRON:collect-fees] Erreur:", error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
