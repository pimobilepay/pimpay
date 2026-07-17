/**
 * lib/pawapay-reconcile.ts
 *
 * Logique de vérification + crédit pour un dépôt PawaPay, utilisée par :
 *   1. Le webhook (app/api/webhooks/pawapay/deposit/route.ts) — voie normale.
 *   2. La réconciliation manuelle
 *      (app/api/transaction/deposit/pawapay/confirm/route.ts) — filet de
 *      sécurité pour le flux "Payment Page" (checkout hébergé) : quand le
 *      client revient sur `returnUrl` après avoir payé, on ne peut pas
 *      attendre passivement le webhook (peu fiable en sandbox, ou URL non
 *      enregistrée côté PawaPay) : on ré-interroge activement PawaPay.
 *
 * Sécurité : identique au webhook —
 *   - Le statut vient TOUJOURS d'un ré-appel à PawaPay (checkDeposit),
 *     jamais d'un paramètre fourni par le client.
 *   - Le montant crédité vient TOUJOURS de la transaction stockée en base
 *     (metadata.netPi calculé à l'initiation).
 *   - Idempotence : `where: { status: "PENDING" }` sur l'update garantit
 *     qu'une transaction déjà finalisée n'est jamais re-créditée, même en
 *     cas d'appel concurrent (webhook + réconciliation manuelle en même
 *     temps).
 */

import { prisma } from "@/lib/prisma";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";
import { checkDeposit, extractLookupStatus, mapPawaPayStatus } from "@/lib/pawapay";

export type PawaPayReconcileResult =
  | { outcome: "not_found" }
  | { outcome: "already_processed"; status: string }
  | { outcome: "pending"; providerStatus: string }
  | { outcome: "failed" }
  | { outcome: "success"; credited: number };

export async function reconcilePawaPayDeposit(
  depositId: string,
  event: string
): Promise<PawaPayReconcileResult> {
  const transaction = await prisma.transaction.findFirst({
    where: { externalId: depositId, type: "DEPOSIT" },
  });
  if (!transaction) return { outcome: "not_found" };
  if (transaction.status !== "PENDING") {
    return { outcome: "already_processed", status: transaction.status };
  }

  // Statut autoritaire re-vérifié auprès de PawaPay (jamais celui du client)
  const lookup = await checkDeposit(depositId);
  const authoritative = extractLookupStatus(lookup.data);
  const status = mapPawaPayStatus(authoritative);
  const meta = (transaction.metadata as any) || {};

  if (status === "PENDING") {
    return { outcome: "pending", providerStatus: authoritative };
  }

  if (status === "FAILED") {
    await prisma.transaction.update({
      where: { id: transaction.id, status: "PENDING" },
      data: {
        status: "FAILED",
        statusClass: "AGGREGATOR_FAILED",
        metadata: { ...meta, pawapayFinalStatus: authoritative, event },
      },
    });
    if (transaction.fromUserId) {
      await prisma.notification.create({
        data: {
          userId: transaction.fromUserId,
          title: "Dépôt échoué",
          message: `Votre dépôt Mobile Money (${transaction.reference}) n'a pas abouti.`,
          type: "ERROR",
        },
      });
    }
    return { outcome: "failed" };
  }

  // SUCCÈS -> crédit du wallet PI (montant NET calculé à l'initiation)
  const netPi = Number(meta.netPi) || 0;
  const userId = transaction.fromUserId as string | null;

  if (!userId || netPi <= 0) {
    await prisma.transaction.update({
      where: { id: transaction.id, status: "PENDING" },
      data: {
        status: "SUCCESS",
        statusClass: "AGGREGATOR_COMPLETED",
        metadata: { ...meta, pawapayFinalStatus: authoritative, event },
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
        metadata: { ...meta, pawapayFinalStatus: authoritative, event },
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
          method: "Mobile Money (PawaPay)",
          status: "SUCCESS",
        }),
      },
    });

    await tx.securityLog.create({
      data: {
        userId,
        action: `DEPOSIT_PAWAPAY_SUCCESS | ref:${transaction.reference} | ${netPi} PI`,
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
      console.error("[PAWAPAY_RECONCILE] Fee conversion:", err.message)
    );
  }

  return { outcome: "success", credited: netPi };
}
