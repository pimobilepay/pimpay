import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/crypto";

// Force le rendu dynamique pour éviter les erreurs au build
export const dynamic = "force-dynamic";

/**
 * Webhook de notification opérateur (format CinetPay: cpm_*).
 *
 * [FIX V17 — FAILLE CRITIQUE CORRIGÉE]
 * Avant : aucune vérification de signature, aucun anti-replay, et le montant
 * (`cpm_amount`) + le bénéficiaire (`cpm_custom`) provenaient DIRECTEMENT du
 * payload. Un attaquant pouvait POST
 *   { cpm_result:"00", cpm_amount:"99999999", cpm_custom:"<userId>", cpm_trans_id:"x" }
 * pour créditer un montant arbitraire, à l'infini (nouveau cpm_trans_id à chaque
 * appel). => fabrication de fonds illimitée.
 *
 * Après :
 *   1. Signature OBLIGATOIRE (HMAC-SHA256 du corps brut via `x-token`, ou secret
 *      partagé via `x-webhook-secret`). Fail-closed si secret non configuré.
 *   2. La transaction doit exister EN BASE et être PENDING (anti-replay).
 *   3. On crédite le montant ENREGISTRÉ EN BASE lors de l'initiation
 *      (`transaction.amount`), jamais le montant du payload.
 *   4. Le bénéficiaire est celui de la transaction en base, jamais `cpm_custom`.
 */

const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET || process.env.MOBILE_MONEY_WEBHOOK_SECRET;

/**
 * Vérifie l'authenticité de l'appel. Fail-closed : sans secret configuré,
 * ou sans signature valide, l'appel est rejeté.
 */
function verifySignature(rawBody: string, headers: Headers): boolean {
  if (!WEBHOOK_SECRET) {
    console.error("[WEBHOOK] Aucun secret configuré (PAYMENT_WEBHOOK_SECRET). Appel refusé.");
    return false;
  }

  // Schéma 1 : HMAC-SHA256 du corps brut (header x-token — standard CinetPay)
  const token = headers.get("x-token");
  if (token) {
    const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
    return safeCompare(token.trim().toLowerCase(), expected.toLowerCase());
  }

  // Schéma 2 : secret partagé en clair
  const sharedSecret = headers.get("x-webhook-secret");
  if (sharedSecret) {
    return safeCompare(sharedSecret, WEBHOOK_SECRET);
  }

  return false;
}

export async function POST(req: Request) {
  try {
    // 0. AUTHENTIFICATION — lire le corps BRUT pour vérifier la signature.
    const rawBody = await req.text();
    if (!verifySignature(rawBody, req.headers)) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
    }

    const { cpm_trans_id, cpm_result } = data;

    if (!cpm_trans_id || typeof cpm_trans_id !== "string") {
      return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
    }

    // 1. Retrouver la transaction initiée côté PimPay (par référence OU id).
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [{ reference: cpm_trans_id }, { id: cpm_trans_id }],
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // 2. Anti-replay : une transaction déjà traitée n'est jamais recréditée.
    if (transaction.status !== "PENDING") {
      return NextResponse.json({ message: "Déjà traitée" }, { status: 200 });
    }

    if (!transaction.toWalletId || !transaction.toUserId) {
      return NextResponse.json({ error: "Transaction incomplète" }, { status: 422 });
    }

    // 3. Échec opérateur : marquer FAILED (garde anti-replay via status PENDING).
    if (cpm_result !== "00") {
      await prisma.transaction.update({
        where: { id: transaction.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ message: "Failed" });
    }

    // 4. Succès : on crédite le montant ENREGISTRÉ EN BASE (source de vérité),
    //    jamais cpm_amount du payload. Le bénéficiaire est celui de la DB.
    const creditAmount = transaction.amount;

    await prisma.$transaction(
      async (tx) => {
        await tx.wallet.update({
          where: { id: transaction.toWalletId! },
          data: { balance: { increment: creditAmount } },
        });

        await tx.transaction.update({
          where: { id: transaction.id, status: "PENDING" },
          data: { status: "SUCCESS" },
        });

        await tx.notification.create({
          data: {
            userId: transaction.toUserId!,
            title: "Dépôt Réussi",
            message: `Votre compte PimPay a été crédité de ${creditAmount.toFixed(2)} ${transaction.currency}.`,
            type: "success",
          },
        });
      },
      { maxWait: 10000, timeout: 30000 }
    );

    return NextResponse.json({ message: "OK" });
  } catch (error) {
    // [FIX V9] Ne pas exposer error.message en production
    console.error("[WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
