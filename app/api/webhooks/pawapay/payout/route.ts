export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionStatus } from "@prisma/client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  checkPayout,
  extractLookupStatus,
  mapPawaPayStatus,
} from "@/lib/pawapay";

/**
 * POST /api/webhooks/pawapay/payout
 *
 * Callback PawaPay pour les PAYOUTS (retraits + transferts Mobile Money).
 * Les Pi ont déjà été débités du wallet à l'initiation :
 *   - SUCCÈS (COMPLETED) → on marque simplement la transaction SUCCESS.
 *   - ÉCHEC (FAILED/REJECTED) → on REMBOURSE les Pi débités et on marque FAILED.
 *
 * SÉCURITÉ : on ré-interroge l'API PawaPay (GET /v2/payouts/{id}) pour obtenir
 * le statut autoritaire ; on ne se fie pas au payload du webhook.
 *
 * [FIX] Rate limiting ajouté (voir même TODO détaillé que
 * /api/webhooks/pawapay/deposit concernant la signature RFC-9421 optionnelle
 * de PawaPay, volontairement non implémentée ici sans pouvoir la tester
 * contre leur sandbox).
 *
 * URL à configurer côté PawaPay :
 *   https://<votre-domaine>/api/webhooks/pawapay/payout
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`pawapay-webhook-payout:${ip}`, 30, 60_000);
    if (rl.limited) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
    }

    const rawBody = await req.text();
    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
    }

    const payoutId: string | undefined = body?.payoutId || body?.data?.payoutId;
    if (!payoutId) {
      return NextResponse.json({ error: "payoutId manquant" }, { status: 400 });
    }

    // 1. Retrouver la transaction (retrait OU transfert)
    const transaction = await prisma.transaction.findFirst({
      where: {
        externalId: payoutId,
        type: { in: ["WITHDRAW", "TRANSFER"] },
      },
    });
    if (!transaction) {
      return NextResponse.json(
        { message: "Transaction inconnue, ignorée" },
        { status: 200 }
      );
    }

    // 2. Idempotence
    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        { message: "Transaction déjà traitée" },
        { status: 200 }
      );
    }

    // 3. Statut autoritaire
    const lookup = await checkPayout(payoutId);
    const authoritative = extractLookupStatus(lookup.data);
    const status = mapPawaPayStatus(authoritative);

    const meta = (transaction.metadata as any) || {};

    if (status === "PENDING") {
      return NextResponse.json({ message: "En attente", status: authoritative });
    }

    // 4. SUCCÈS → marquer SUCCESS (Pi déjà débités à l'initiation)
    if (status === "SUCCESS") {
      await prisma.transaction.update({
        where: { id: transaction.id, status: "PENDING" },
        data: {
          status: TransactionStatus.SUCCESS,
          statusClass: "AGGREGATOR_COMPLETED",
          metadata: { ...meta, pawapayFinalStatus: authoritative },
        },
      });
      if (transaction.fromUserId) {
        const label =
          transaction.type === "TRANSFER" ? "Transfert" : "Retrait";
        await prisma.notification.create({
          data: {
            userId: transaction.fromUserId,
            title: `${label} réussi`,
            message: `Votre ${label.toLowerCase()} Mobile Money (${transaction.reference}) a été envoyé avec succès.`,
            type: "SUCCESS",
          },
        });
      }
      return NextResponse.json({ success: true, status: "SUCCESS" });
    }

    // 5. ÉCHEC → REMBOURSER les Pi débités + marquer FAILED
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transaction.id, status: "PENDING" },
        data: {
          status: TransactionStatus.FAILED,
          statusClass: "AGGREGATOR_FAILED",
          metadata: { ...meta, pawapayFinalStatus: authoritative, refunded: true },
        },
      });

      // Recréditer le wallet Pi source (le montant PI est stocké dans amount)
      if (transaction.fromWalletId) {
        await tx.wallet.update({
          where: { id: transaction.fromWalletId },
          data: { balance: { increment: transaction.amount } },
        });
      }

      if (transaction.fromUserId) {
        const label =
          transaction.type === "TRANSFER" ? "Transfert" : "Retrait";
        await tx.notification.create({
          data: {
            userId: transaction.fromUserId,
            title: `${label} échoué`,
            message: `Votre ${label.toLowerCase()} Mobile Money (${transaction.reference}) a échoué. Vos ${transaction.amount} PI ont été recrédités.`,
            type: "ERROR",
          },
        });
      }
    });

    return NextResponse.json({ success: false, status: "FAILED", refunded: true });
  } catch (error: any) {
    console.error("[v0] PAWAPAY_PAYOUT_WEBHOOK_ERROR:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
