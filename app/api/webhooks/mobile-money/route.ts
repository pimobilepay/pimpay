import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/crypto";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";

// Secret partagé avec l'opérateur Mobile Money (OBLIGATOIRE en production).
const WEBHOOK_SECRET = process.env.MOBILE_MONEY_WEBHOOK_SECRET;

/**
 * Vérifie l'authenticité de l'appel webhook.
 * Supporte deux schémas (selon l'opérateur) :
 *  - HMAC-SHA256 du corps brut, transmis dans `x-webhook-signature`
 *  - Secret partagé en clair transmis dans `x-webhook-secret`
 * Comparaison en temps constant (anti timing-attack). Fail-closed.
 */
function verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
  if (!WEBHOOK_SECRET) {
    // Aucun secret configuré => on refuse tout (fail-closed) pour éviter le crédit non autorisé.
    console.error("[WEBHOOK_MOBILE_MONEY] MOBILE_MONEY_WEBHOOK_SECRET manquant. Webhook refusé.");
    return false;
  }

  const signature = headers.get("x-webhook-signature");
  if (signature) {
    const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
    return safeCompare(signature.trim().toLowerCase(), expected.toLowerCase());
  }

  const sharedSecret = headers.get("x-webhook-secret");
  if (sharedSecret) {
    return safeCompare(sharedSecret, WEBHOOK_SECRET);
  }

  return false;
}

export async function POST(req: Request) {
  try {
    // 0. AUTHENTIFICATION DU WEBHOOK — on lit le corps brut pour vérifier la signature.
    const rawBody = await req.text();
    if (!verifyWebhookSignature(rawBody, req.headers)) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
    }

    const { reference, status, externalId } = body;
    if (!reference || typeof reference !== "string") {
      return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
    }

    // 1. Trouver la transaction PENDING dans PIMOBIPAY
    const transaction = await prisma.transaction.findUnique({
      where: { reference },
      include: { toWallet: true, toUser: true },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction non trouvée" }, { status: 404 });
    }

    // 2. Anti-replay : une transaction déjà traitée n'est jamais recréditée.
    if (transaction.status !== "PENDING") {
      return NextResponse.json({ message: "Transaction déjà traitée" }, { status: 200 });
    }

    if (!transaction.toWalletId || !transaction.toUserId) {
      return NextResponse.json({ error: "Transaction incomplète" }, { status: 422 });
    }

    const isSuccess = status === "SUCCESSFUL" || status === "SUCCESS";

    if (isSuccess) {
      // SÉCURITÉ CLÉ : on crédite le montant ENREGISTRÉ EN BASE lors de l'initiation,
      // JAMAIS le montant fourni dans le payload du webhook (anti-injection de montant).
      const creditAmount = transaction.amount;
      const netAmount = transaction.amount - (transaction.fee || 0);

      // Transaction Prisma atomique (tout ou rien).
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transaction.id, status: "PENDING" },
          data: {
            status: "SUCCESS",
            externalId: typeof externalId === "string" ? externalId : undefined,
            netAmount,
          },
        }),
        prisma.wallet.update({
          where: { id: transaction.toWalletId },
          data: { balance: { increment: creditAmount } },
        }),
        prisma.notification.create({
          data: {
            userId: transaction.toUserId,
            title: "Dépôt Réussi",
            message: `Votre dépôt de ${creditAmount} ${transaction.currency} a été crédité sur votre compte PIMOBIPAY.`,
            type: "payment",
          },
        }),
        prisma.securityLog.create({
          data: {
            userId: transaction.toUserId,
            action: `DEPOSIT_MOBILE_SUCCESS | ref:${reference} | ${creditAmount} ${transaction.currency}`,
            ip: "SYSTEM_WEBHOOK",
          },
        }),
      ]);

      // Auto-conversion des frais en PI (non bloquant).
      if (transaction.fee && transaction.fee > 0) {
        autoConvertFeeToPi(
          transaction.fee,
          transaction.currency,
          transaction.id,
          transaction.reference
        ).catch((err) => {
          console.error("[WEBHOOK_MOBILE_MONEY] Fee conversion error (non-blocking):", err.message);
        });
      }

      return NextResponse.json({ success: true, message: "Solde mis à jour" });
    }

    // Échec côté opérateur.
    await prisma.transaction.update({
      where: { id: transaction.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return NextResponse.json({ success: false, message: "Transaction échouée" });
  } catch (error) {
    console.error("WEBHOOK_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
