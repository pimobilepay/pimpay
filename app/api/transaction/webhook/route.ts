export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";
import {
  verifyWebhookSignature,
  checkPayment,
  checkPayout,
  unwrap,
  mapGeniusPayStatus,
} from "@/lib/geniuspay";

/**
 * POST /api/transaction/webhook
 *
 * Endpoint UNIQUE des webhooks GeniusPay (configuré dans le dashboard :
 * https://pimobipay.vercel.app/api/transaction/webhook).
 *
 * Événements écoutés :
 *   payment.initiated | payment.success | payment.failed |
 *   payment.cancelled | payment.expired | payment.refunded
 *   cashout.requested | cashout.approved | cashout.completed | cashout.failed
 *
 * SÉCURITÉ :
 *   1. Signature HMAC-SHA256 vérifiée sur le corps BRUT (X-Webhook-Signature +
 *      X-Webhook-Timestamp) — un payload non signé est rejeté (401).
 *   2. On ne fait jamais confiance au montant/statut du payload : on ré-interroge
 *      GeniusPay (GET /payments/{ref} ou /payouts/{ref}) pour le statut autoritaire.
 *   3. Le montant crédité vient TOUJOURS de la transaction stockée en base
 *      (metadata.netPi calculé à l'initiation) — anti-injection de montant.
 *   4. Idempotence : une transaction déjà finalisée n'est jamais retraitée.
 *
 * Réponse rapide (< 5 s) attendue côté GeniusPay -> on répond 200 dès que possible.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 1. Vérification de la signature HMAC (corps brut, avant parsing)
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");
    const eventHeader = req.headers.get("x-webhook-event") || "";

    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
      console.warn("[v0] GENIUSPAY_WEBHOOK: signature invalide");
      return NextResponse.json(
        { error: "Signature invalide" },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json(
        { error: "Payload JSON invalide" },
        { status: 400 }
      );
    }

    // 2. Extraire l'événement + les données (GeniusPay enveloppe souvent dans `data`)
    const event: string = (body?.event || eventHeader || "").toLowerCase();
    const data = body?.data ?? body;
    const reference: string | undefined =
      data?.reference || data?.payment?.reference || data?.payout?.reference;

    if (!reference) {
      // 200 pour éviter les renvois infinis côté GeniusPay
      return NextResponse.json(
        { message: "Référence manquante, ignorée" },
        { status: 200 }
      );
    }

    // 3. Router selon la famille d'événement
    if (event.startsWith("cashout") || event.startsWith("payout")) {
      return await handleCashout(reference, event);
    }
    return await handlePayment(reference, event);
  } catch (error: any) {
    console.error("[v0] GENIUSPAY_WEBHOOK_ERROR:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  PAIEMENTS (dépôt wallet PI + financement carte virtuelle)          */
/* ------------------------------------------------------------------ */
async function handlePayment(reference: string, event: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { externalId: reference },
  });
  if (!transaction) {
    return NextResponse.json(
      { message: "Transaction inconnue, ignorée" },
      { status: 200 }
    );
  }
  if (transaction.status !== "PENDING") {
    return NextResponse.json(
      { message: "Transaction déjà traitée" },
      { status: 200 }
    );
  }

  // Statut autoritaire re-vérifié auprès de GeniusPay
  const lookup = await checkPayment(reference);
  const payment = unwrap<any>(lookup.data);
  const authoritative = (payment?.status || "").toLowerCase();
  const status = mapGeniusPayStatus(authoritative);
  const meta = (transaction.metadata as any) || {};

  if (status === "PENDING") {
    return NextResponse.json({ message: "En attente", status: authoritative });
  }

  if (status === "FAILED") {
    await prisma.transaction.update({
      where: { id: transaction.id, status: "PENDING" },
      data: {
        status: "FAILED",
        statusClass: "AGGREGATOR_FAILED",
        metadata: { ...meta, geniusPayFinalStatus: authoritative, event },
      },
    });
    if (transaction.fromUserId) {
      await prisma.notification.create({
        data: {
          userId: transaction.fromUserId,
          title: "Paiement échoué",
          message: `Votre transaction GeniusPay (${transaction.reference}) n'a pas abouti.`,
          type: "ERROR",
        },
      });
    }
    return NextResponse.json({ success: false, status: "FAILED" });
  }

  // SUCCÈS -> financement carte virtuelle OU crédit wallet PI
  if (meta.kind === "card_fund") {
    return await creditVirtualCard(transaction, meta, authoritative, event);
  }
  return await creditPiWallet(transaction, meta, authoritative, event);
}

/** Crédite le wallet PI du montant NET (calculé à l'initiation). */
async function creditPiWallet(
  transaction: any,
  meta: any,
  authoritative: string,
  event: string
) {
  const netPi = Number(meta.netPi) || 0;
  const userId = transaction.fromUserId as string | null;

  if (!userId || netPi <= 0) {
    await prisma.transaction.update({
      where: { id: transaction.id, status: "PENDING" },
      data: {
        status: "SUCCESS",
        statusClass: "AGGREGATOR_COMPLETED",
        metadata: { ...meta, geniusPayFinalStatus: authoritative, event },
      },
    });
    return NextResponse.json({ success: true, status: "SUCCESS", credited: 0 });
  }

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId_currency: { userId, currency: "PI" } },
      update: { balance: { increment: netPi } },
      create: { userId, currency: "PI", balance: netPi, type: "PI" },
    });

    await tx.transaction.update({
      where: { id: transaction.id, status: "PENDING" },
      data: {
        status: "SUCCESS",
        statusClass: "AGGREGATOR_COMPLETED",
        netAmount: netPi,
        toUserId: userId,
        toWalletId: wallet.id,
        metadata: { ...meta, geniusPayFinalStatus: authoritative, event },
      },
    });

    await tx.notification.create({
      data: {
        userId,
        title: "Dépôt réussi",
        message: `Votre compte a été crédité de ${netPi.toFixed(7)} PI.`,
        type: "SUCCESS",
        metadata: JSON.stringify({
          amount: netPi,
          currency: "PI",
          reference: transaction.reference,
          method: "GeniusPay",
          status: "SUCCESS",
        }),
      },
    });

    await tx.securityLog.create({
      data: {
        userId,
        action: `DEPOSIT_GENIUSPAY_SUCCESS | ref:${transaction.reference} | ${netPi} PI`,
        ip: "SYSTEM_WEBHOOK",
      },
    });
  });

  if (transaction.fee && transaction.fee > 0) {
    autoConvertFeeToPi(
      transaction.fee,
      "USD",
      transaction.id,
      transaction.reference
    ).catch((err) =>
      console.error("[GENIUSPAY_WEBHOOK] Fee conversion:", err.message)
    );
  }

  return NextResponse.json({ success: true, status: "SUCCESS", credited: netPi });
}

/** Crédite le solde d'une carte virtuelle (financement via GeniusPay). */
async function creditVirtualCard(
  transaction: any,
  meta: any,
  authoritative: string,
  event: string
) {
  const cardId = meta.cardId as string | undefined;
  const fundUsd = Number(meta.netUsd) || 0;
  const userId = transaction.fromUserId as string | null;

  if (!cardId || fundUsd <= 0) {
    await prisma.transaction.update({
      where: { id: transaction.id, status: "PENDING" },
      data: {
        status: "SUCCESS",
        statusClass: "AGGREGATOR_COMPLETED",
        metadata: { ...meta, geniusPayFinalStatus: authoritative, event },
      },
    });
    return NextResponse.json({ success: true, status: "SUCCESS", credited: 0 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.virtualCard.update({
      where: { id: cardId },
      data: { balanceUSD: { increment: fundUsd } },
    });

    await tx.transaction.update({
      where: { id: transaction.id, status: "PENDING" },
      data: {
        status: "SUCCESS",
        statusClass: "AGGREGATOR_COMPLETED",
        netAmount: fundUsd,
        metadata: { ...meta, geniusPayFinalStatus: authoritative, event },
      },
    });

    if (userId) {
      await tx.notification.create({
        data: {
          userId,
          title: "Carte rechargée",
          message: `Votre carte virtuelle a été rechargée de ${fundUsd.toFixed(
            2
          )} USD.`,
          type: "SUCCESS",
          metadata: JSON.stringify({
            amount: fundUsd,
            currency: "USD",
            reference: transaction.reference,
            method: "GeniusPay",
            status: "SUCCESS",
          }),
        },
      });
    }
  });

  return NextResponse.json({ success: true, status: "SUCCESS", credited: fundUsd });
}

/* ------------------------------------------------------------------ */
/*  CASHOUT / PAYOUT (retraits)                                        */
/* ------------------------------------------------------------------ */
async function handleCashout(reference: string, event: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { externalId: reference },
  });
  if (!transaction) {
    return NextResponse.json(
      { message: "Transaction inconnue, ignorée" },
      { status: 200 }
    );
  }
  if (transaction.status !== "PENDING") {
    return NextResponse.json(
      { message: "Transaction déjà traitée" },
      { status: 200 }
    );
  }

  const lookup = await checkPayout(reference);
  const payout = unwrap<any>(lookup.data);
  const authoritative = (payout?.status || "").toLowerCase();
  const status = mapGeniusPayStatus(authoritative);
  const meta = (transaction.metadata as any) || {};
  const userId = transaction.fromUserId as string | null;

  if (status === "PENDING") {
    return NextResponse.json({ message: "En attente", status: authoritative });
  }

  // ÉCHEC -> rembourser le montant débité (réservé à l'initiation)
  if (status === "FAILED") {
    const refundPi = Number(meta.debitedPi) || 0;
    await prisma.$transaction(async (tx) => {
      if (userId && refundPi > 0) {
        await tx.wallet.update({
          where: { userId_currency: { userId, currency: "PI" } },
          data: { balance: { increment: refundPi } },
        });
      }
      await tx.transaction.update({
        where: { id: transaction.id, status: "PENDING" },
        data: {
          status: "FAILED",
          statusClass: "AGGREGATOR_FAILED",
          metadata: { ...meta, geniusPayFinalStatus: authoritative, event },
        },
      });
      if (userId) {
        await tx.notification.create({
          data: {
            userId,
            title: "Retrait échoué",
            message: `Votre retrait (${transaction.reference}) a échoué${
              refundPi > 0 ? " et le montant a été recrédité." : "."
            }`,
            type: "ERROR",
          },
        });
      }
    });
    return NextResponse.json({ success: false, status: "FAILED" });
  }

  // SUCCÈS -> finaliser (le débit a déjà eu lieu à l'initiation)
  await prisma.transaction.update({
    where: { id: transaction.id, status: "PENDING" },
    data: {
      status: "SUCCESS",
      statusClass: "AGGREGATOR_COMPLETED",
      metadata: { ...meta, geniusPayFinalStatus: authoritative, event },
    },
  });
  if (userId) {
    await prisma.notification.create({
      data: {
        userId,
        title: "Retrait réussi",
        message: `Votre retrait (${transaction.reference}) a été envoyé avec succès.`,
        type: "SUCCESS",
      },
    });
  }
  return NextResponse.json({ success: true, status: "SUCCESS" });
}
