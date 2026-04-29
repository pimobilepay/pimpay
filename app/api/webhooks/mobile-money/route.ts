import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";

const prisma = new PrismaClient();

/**
 * SECURITY FIX [CRITIQUE] — Validation de signature HMAC-SHA256
 *
 * AVANT : Le webhook acceptait n'importe quelle requête POST. N'importe qui
 *         pouvait envoyer { status: "SUCCESSFUL" } et créditer un compte.
 *
 * APRÈS : Chaque requête doit porter un header X-Signature contenant
 *         HMAC-SHA256(MOBILE_MONEY_WEBHOOK_SECRET, raw body).
 *         On utilise timingSafeEqual pour éviter les timing attacks.
 *
 * Configuration requise : MOBILE_MONEY_WEBHOOK_SECRET dans .env
 */

const WEBHOOK_SECRET = process.env.MOBILE_MONEY_WEBHOOK_SECRET;

async function verifyHmacSignature(
  req: Request,
  rawBody: string
): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.error(
      "[WEBHOOK] MOBILE_MONEY_WEBHOOK_SECRET non configuré — webhook refusé"
    );
    return false;
  }

  const signature = req.headers.get("x-signature");
  if (!signature) return false;

  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    // timingSafeEqual prévient les attaques par timing
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    // Longueurs différentes → invalide
    return false;
  }
}

export async function POST(req: Request) {
  // Lire le body brut UNE SEULE FOIS pour la vérification HMAC
  const rawBody = await req.text();

  // FIX [CRITIQUE]: Vérifier la signature AVANT tout traitement
  const isValid = await verifyHmacSignature(req, rawBody);
  if (!isValid) {
    console.warn("[WEBHOOK] Signature invalide ou absente — requête rejetée");
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);
    const { reference, status, externalId, amount, currency } = body;

    if (!reference || !status) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.findUnique({
      where: { reference },
      include: { toWallet: true, toUser: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction non trouvée" },
        { status: 404 }
      );
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        { message: "Transaction déjà traitée" },
        { status: 200 }
      );
    }

    if (status === "SUCCESSFUL" || status === "SUCCESS") {
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "SUCCESS",
            externalId: externalId,
            netAmount: amount - (transaction.fee || 0),
          },
        }),
        prisma.wallet.update({
          where: { id: transaction.toWalletId! },
          data: { balance: { increment: amount } },
        }),
        prisma.notification.create({
          data: {
            userId: transaction.toUserId!,
            title: "Dépôt Réussi ! ✅",
            message: `Votre dépôt de ${amount} ${currency} a été crédité sur votre compte PimPay.`,
            type: "payment",
          },
        }),
        prisma.securityLog.create({
          data: {
            userId: transaction.toUserId!,
            action: `DEPOSIT_MOBILE_SUCCESS_${reference}`,
            ip: "SYSTEM_WEBHOOK",
          },
        }),
      ]);

      if (transaction.fee && transaction.fee > 0) {
        autoConvertFeeToPi(
          transaction.fee,
          transaction.currency,
          transaction.id,
          transaction.reference
        ).catch((err) => {
          console.error("[WEBHOOK] Fee conversion error:", err.message);
        });
      }

      return NextResponse.json({ success: true, message: "Solde mis à jour" });
    } else {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ success: false, message: "Transaction échouée" });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    console.error("[WEBHOOK] Erreur:", message);
    // FIX: pas de stack dans la réponse
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
