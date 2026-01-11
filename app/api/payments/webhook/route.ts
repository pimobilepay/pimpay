export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
// Correction : Import nommé avec accolades pour correspondre à ton instance lib/prisma
import { prisma } from "@/lib/prisma"; 
// Correction : Chemin vers lib/ au lieu de data/ pour éviter l'erreur de build
import { conversionService } from "@/services/conversionService";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const headers = req.headers;

    // 1. SÉCURITÉ : Vérification du secret Webhook
    const webhookSecret = headers.get("x-webhook-secret");
    if (webhookSecret !== process.env.PAYMENT_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    // external_id correspond à l'ID de la transaction dans notre DB Pimpay
    const { external_id, status, amount: amountReceived, reference } = payload;

    // 2. Trouver la transaction et inclure les infos de l'utilisateur
    const transaction = await prisma.transaction.findUnique({
      where: { id: external_id },
      include: { fromUser: true }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // Sécurité contre les doublons d'appels Webhook
    if (transaction.status !== "PENDING") {
      return NextResponse.json({ message: "Déjà traitée" }, { status: 200 });
    }

    // 3. Traitement en cas de succès
    if (status === "SUCCESS" || status === "COMPLETED") {

      // Récupérer le prix de consensus actuel
      const config = await prisma.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
      const consensusPrice = config?.consensusPrice || 314159;

      // Calculer la conversion PI via le service
      const metadata = transaction.metadata as any;
      const conversion = await conversionService.localToPi(
        amountReceived,
        metadata?.countryCode || "CD",
        consensusPrice
      );

      await prisma.$transaction([
        // A. Mise à jour de la transaction
        prisma.transaction.update({
          where: { id: external_id },
          data: {
            status: "SUCCESS",
            blockchainTx: reference, // Réf opérateur
            netAmount: conversion.piAmount
          }
        }),

        // B. Mise à jour du Wallet PI (Incrémentation/Décrémentation)
        prisma.wallet.update({
          where: {
            userId_currency: {
              userId: transaction.fromUserId || transaction.toUserId!,
              currency: "PI"
            }
          },
          data: {
            balance: transaction.type === "DEPOSIT"
              ? { increment: conversion.piAmount }
              : { decrement: conversion.piAmount }
          }
        })
      ]);

      // C. Notification utilisateur
      await prisma.notification.create({
        data: {
          userId: transaction.fromUserId || transaction.toUserId!,
          title: "Paiement Reçu",
          message: `Votre dépôt de ${amountReceived} ${conversion.currency} a été converti en ${conversion.piAmount} PI.`,
          type: "PAYMENT_SUCCESS"
        }
      });

      console.log(`✅ Pimpay: Wallet mis à jour pour ${external_id}`);
    } else {
      // 4. Gestion de l'échec (Annulation)
      await prisma.transaction.update({
        where: { id: external_id },
        data: { status: "FAILED" }
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("WEBHOOK_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
