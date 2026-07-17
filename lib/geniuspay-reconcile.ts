/**
 * lib/geniuspay-reconcile.ts
 *
 * Logique de vérification + crédit pour un paiement GeniusPay, PARTAGÉE
 * entre :
 *   1. Le webhook (app/api/transaction/webhook/route.ts) — voie normale.
 *   2. La réconciliation manuelle (app/api/transaction/deposit/geniuspay/confirm/route.ts)
 *      — filet de sécurité quand le webhook n'arrive jamais (fréquent en
 *      sandbox, ou si l'URL de webhook n'est pas enregistrée côté GeniusPay).
 *      Sans ce filet, une transaction reste bloquée en PENDING et nécessite
 *      une confirmation manuelle par un admin.
 *
 * Sécurité inchangée par rapport à la version webhook :
 *   - On ne fait jamais confiance à un statut/montant fourni par le client :
 *     on ré-interroge GeniusPay (checkPayment) pour le statut autoritaire.
 *   - Le montant crédité vient TOUJOURS de la transaction stockée en base
 *     (metadata.netPi calculé à l'initiation).
 *   - Idempotence : `where: { status: "PENDING" }` sur l'update garantit
 *     qu'une transaction déjà finalisée n'est jamais re-créditée, même en
 *     cas d'appel concurrent (webhook + réconciliation manuelle en même
 *     temps).
 */

import { prisma } from "@/lib/prisma";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";
import { checkPayment, unwrap, mapGeniusPayStatus } from "@/lib/geniuspay";
import { logSystemEvent } from "@/lib/systemLogger";

export type ReconcileResult =
  | { outcome: "not_found" }
  | { outcome: "already_processed"; status: string }
  | { outcome: "pending"; providerStatus: string }
  | { outcome: "failed" }
  | { outcome: "success"; credited: number };

export async function reconcileGeniusPayPayment(
  externalReference: string,
  event: string
): Promise<ReconcileResult> {
  const transaction = await prisma.transaction.findFirst({
    where: { externalId: externalReference },
  });
  if (!transaction) return { outcome: "not_found" };
  if (transaction.status !== "PENDING") {
    return { outcome: "already_processed", status: transaction.status };
  }

  // Statut autoritaire re-vérifié auprès de GeniusPay (jamais celui du client)
  const lookup = await checkPayment(externalReference);

  // [FIX] Avant ce correctif, un échec de l'appel GET /payments/{ref} (401,
  // 404, blocage Imunify360, timeout réseau, etc.) était traité EN SILENCE
  // comme "encore en attente" : `payment?.status` valait `undefined`,
  // `mapGeniusPayStatus("")` renvoie "PENDING" par défaut. Résultat : la
  // transaction restait indéfiniment bloquée sur PENDING après le clic sur
  // "Terminer" côté checkout GeniusPay, SANS AUCUNE trace exploitable — le
  // vrai problème (échec de l'appel de vérification) n'apparaissait nulle
  // part. On journalise maintenant explicitement ce cas dans les logs
  // Admin (onglet Système, source GENIUSPAY_RECONCILE) pour le diagnostiquer.
  if (!lookup.ok) {
    console.error("[GENIUSPAY_RECONCILE] checkPayment a échoué:", {
      externalReference,
      httpStatus: lookup.status,
      response: lookup.data,
    });
    await logSystemEvent({
      level: "ERROR",
      source: "GENIUSPAY_RECONCILE",
      action: "CHECK_PAYMENT_FAILED",
      message:
        (lookup.data as any)?.error ||
        (lookup.data as any)?.message ||
        "Échec de la vérification du statut auprès de GeniusPay (GET /payments/{reference}).",
      requestId: transaction.reference,
      details: {
        externalReference,
        httpStatus: lookup.status,
        response: lookup.data,
        event,
      },
    }).catch(() => {});
    return { outcome: "pending", providerStatus: "CHECK_PAYMENT_API_ERROR" };
  }

  const payment = unwrap<any>(lookup.data);
  const authoritative = (payment?.status || "").toLowerCase();

  // Idem si l'appel a réussi mais que la réponse ne contient aucun statut
  // exploitable (forme de réponse inattendue) : on le journalise aussi,
  // plutôt que de retomber silencieusement sur "pending".
  if (!authoritative) {
    console.warn("[GENIUSPAY_RECONCILE] Réponse sans statut exploitable:", {
      externalReference,
      response: lookup.data,
    });
    await logSystemEvent({
      level: "WARN",
      source: "GENIUSPAY_RECONCILE",
      action: "CHECK_PAYMENT_NO_STATUS",
      message:
        "La réponse GeniusPay ne contient aucun champ `status` exploitable.",
      requestId: transaction.reference,
      details: { externalReference, response: lookup.data, event },
    }).catch(() => {});
  }

  const status = mapGeniusPayStatus(authoritative);
  const meta = (transaction.metadata as any) || {};

  if (status === "PENDING") {
    return { outcome: "pending", providerStatus: authoritative || "UNKNOWN" };
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
    return { outcome: "failed" };
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
): Promise<ReconcileResult> {
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
    return { outcome: "success", credited: 0 };
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
      console.error("[GENIUSPAY_RECONCILE] Fee conversion:", err.message)
    );
  }

  return { outcome: "success", credited: netPi };
}

/** Crédite le solde d'une carte virtuelle (financement via GeniusPay). */
async function creditVirtualCard(
  transaction: any,
  meta: any,
  authoritative: string,
  event: string
): Promise<ReconcileResult> {
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
    return { outcome: "success", credited: 0 };
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

  return { outcome: "success", credited: fundUsd };
}
