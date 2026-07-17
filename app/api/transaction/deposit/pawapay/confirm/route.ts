export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { reconcilePawaPayDeposit } from "@/lib/pawapay-reconcile";

/**
 * GET /api/transaction/deposit/pawapay/confirm?ref=DEP-XXXXXXXXXX
 *
 * Filet de sécurité pour le flux "Payment Page" (checkout hébergé PawaPay) :
 * quand le client revient sur `/deposit/summary` (returnUrl) après avoir payé
 * sur la page PawaPay, on ne peut pas se fier uniquement au webhook (peu
 * fiable en sandbox, ou URL de callback non enregistrée pour ce déploiement).
 * On re-vérifie alors le statut AUTORITAIRE auprès de PawaPay et on crédite
 * si confirmé — via la même fonction que le webhook, donc les mêmes
 * garanties anti-fraude (montant toujours lu en base, idempotence via
 * l'update conditionné à status: "PENDING").
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

    // On accepte la référence interne PimPay (DEP-...) ou le depositId
    // PawaPay (externalId), et on vérifie que la transaction appartient bien
    // à l'utilisateur connecté — jamais de lookup cross-utilisateur.
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
      // Pas encore de depositId PawaPay associé — rien à vérifier.
      return NextResponse.json({ status: "PENDING" });
    }

    const result = await reconcilePawaPayDeposit(
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
    console.error("[PAWAPAY_CONFIRM_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
