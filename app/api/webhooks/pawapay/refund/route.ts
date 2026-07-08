export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionStatus } from "@prisma/client";
import {
  checkRefund,
  extractLookupStatus,
  mapPawaPayStatus,
} from "@/lib/pawapay";

/**
 * POST /api/webhooks/pawapay/refund
 *
 * Callback PawaPay pour les REMBOURSEMENTS. Un refund reverse un dépôt déjà
 * COMPLETED. À la réception d'un refund COMPLETED, on annule le crédit Pi qui
 * avait été appliqué lors du dépôt : on débite le montant net du wallet PI et
 * on marque la transaction de dépôt comme REJECTED (remboursée).
 *
 * SÉCURITÉ : statut autoritaire ré-interrogé via GET /v2/refunds/{id}.
 *
 * URL à configurer côté PawaPay :
 *   https://<votre-domaine>/api/webhooks/pawapay/refund
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
    }

    const refundId: string | undefined = body?.refundId || body?.data?.refundId;
    const depositId: string | undefined =
      body?.depositId || body?.data?.depositId;
    if (!refundId && !depositId) {
      return NextResponse.json(
        { error: "refundId ou depositId manquant" },
        { status: 400 }
      );
    }

    // 1. Retrouver le dépôt original via son depositId (externalId)
    const transaction = depositId
      ? await prisma.transaction.findFirst({
          where: { externalId: depositId, type: "DEPOSIT" },
        })
      : null;

    if (!transaction) {
      return NextResponse.json(
        { message: "Dépôt d'origine introuvable, ignoré" },
        { status: 200 }
      );
    }

    const meta = (transaction.metadata as any) || {};

    // 2. Idempotence : refund déjà appliqué
    if (meta.refunded) {
      return NextResponse.json(
        { message: "Remboursement déjà traité" },
        { status: 200 }
      );
    }

    // 3. Statut autoritaire du remboursement
    let authoritative = "";
    if (refundId) {
      const lookup = await checkRefund(refundId);
      authoritative = extractLookupStatus(lookup.data);
    } else {
      authoritative = (body?.status || "").toUpperCase();
    }
    const status = mapPawaPayStatus(authoritative);

    if (status !== "SUCCESS") {
      // Remboursement non finalisé (PENDING) ou échoué : rien à annuler
      return NextResponse.json({ message: "Remboursement non finalisé", status: authoritative });
    }

    // 4. Annuler le crédit Pi : débiter le montant net qui avait été crédité
    const netPi = Number(meta.netPi) || transaction.netAmount || 0;
    const userId = transaction.fromUserId;

    await prisma.$transaction(async (tx) => {
      if (userId && netPi > 0) {
        const wallet = await tx.wallet.findUnique({
          where: { userId_currency: { userId, currency: "PI" } },
        });
        if (wallet) {
          // On ne descend jamais sous zéro
          const debit = Math.min(netPi, wallet.balance);
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: debit } },
          });
        }
      }

      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.REJECTED,
          statusClass: "AGGREGATOR_REFUNDED",
          metadata: {
            ...meta,
            refunded: true,
            pawapayRefundId: refundId || null,
            pawapayRefundStatus: authoritative,
          },
        },
      });

      if (userId) {
        await tx.notification.create({
          data: {
            userId,
            title: "Dépôt remboursé",
            message: `Votre dépôt Mobile Money (${transaction.reference}) a été remboursé. Le montant crédité a été retiré de votre solde.`,
            type: "INFO",
          },
        });
      }
    });

    return NextResponse.json({ success: true, status: "REFUNDED", debited: netPi });
  } catch (error: any) {
    console.error("[v0] PAWAPAY_REFUND_WEBHOOK_ERROR:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
