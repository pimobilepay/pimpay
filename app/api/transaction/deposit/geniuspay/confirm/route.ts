export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { reconcileGeniusPayPayment } from "@/lib/geniuspay-reconcile";

/**
 * GET /api/transaction/deposit/geniuspay/confirm?ref=DEP-XXXXXXXXXX
 *
 * Filet de sécurité quand le webhook GeniusPay n'arrive jamais (fréquent en
 * environnement sandbox, ou si l'URL de webhook n'est pas enregistrée côté
 * GeniusPay pour ce déploiement). Sans ce filet, une transaction confirmée
 * "succès" côté GeniusPay reste bloquée en PENDING jusqu'à intervention
 * manuelle d'un admin.
 *
 * Le frontend appelle cette route quand l'utilisateur revient sur /deposit
 * avec `?status=success&ref=...` (successUrl de GeniusPay). On re-vérifie
 * alors le statut AUTORITAIRE auprès de GeniusPay (jamais celui de l'URL,
 * qui n'a aucune valeur de preuve) et on crédite si confirmé — via la même
 * fonction que le webhook, donc les mêmes garanties anti-fraude
 * (montant toujours lu en base, idempotence via l'update conditionné à
 * status: "PENDING").
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const ref = req.nextUrl.searchParams.get("ref");
    if (!ref) {
      return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
    }

    // On accepte la référence interne PimPay (DEP-...) ou la référence
    // GeniusPay (externalId), et on vérifie que la transaction appartient
    // bien à l'utilisateur connecté — jamais de lookup cross-utilisateur.
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [{ reference: ref }, { externalId: ref }],
        fromUserId: userId,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    if (transaction.status !== "PENDING") {
      // Déjà finalisée (par le webhook ou un appel précédent) — rien à faire.
      return NextResponse.json({ status: transaction.status });
    }

    if (!transaction.externalId) {
      // Pas encore de référence GeniusPay associée — rien à vérifier.
      return NextResponse.json({ status: "PENDING" });
    }

    const result = await reconcileGeniusPayPayment(
      transaction.externalId,
      "manual.reconcile"
    );

    switch (result.outcome) {
      case "success":
        return NextResponse.json({ status: "SUCCESS", credited: result.credited });
      case "failed":
        return NextResponse.json({ status: "FAILED" });
      case "already_processed":
        return NextResponse.json({ status: result.status });
      case "pending":
      case "not_found":
      default:
        return NextResponse.json({ status: "PENDING" });
    }
  } catch (error: any) {
    console.error("[GENIUSPAY_CONFIRM_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
