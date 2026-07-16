export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
// Correction : Import nommé avec accolades pour correspondre à ton instance lib/prisma
import { prisma } from "@/lib/prisma"; 
// Correction : Chemin vers lib/ au lieu de data/ pour éviter l'erreur de build
import { conversionService } from "@/services/conversionService";
import { timingSafeEqual } from "crypto";

// [FIX] Comparaison à temps constant — une comparaison `!==` classique sur un
// secret fuit sa longueur/son préfixe via le temps de réponse (timing attack).
function safeCompareSecret(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const headers = req.headers;

    // 1. SÉCURITÉ : Vérification du secret Webhook (temps constant)
    const webhookSecret = headers.get("x-webhook-secret") || "";
    const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET || "";
    if (!expectedSecret || !safeCompareSecret(webhookSecret, expectedSecret)) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    // external_id correspond à l'ID de la transaction dans notre DB PIMOBIPAY
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
    if (status === "SUCCESS" || status === "SUCCESS") {

      // [FIX V7] — Utiliser transaction.amount (DB) comme référence de vérité.
      // Avant : amountReceived du payload externe était utilisé directement.
      // Un attaquant pouvait envoyer amount: 99999999 pour créditer n'importe quel montant.
      const expectedAmount = transaction.amount;
      const tolerance = expectedAmount * 0.01; // Tolérance de ±1%
      if (
        typeof amountReceived !== "number" ||
        Math.abs(amountReceived - expectedAmount) > tolerance
      ) {
        console.error(
          `[WEBHOOK] Montant invalide: reçu ${amountReceived}, attendu ${expectedAmount} ±1%`
        );
        return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
      }
      // À partir d'ici, on utilise transaction.amount (la source DB) pour tous les calculs.
      const verifiedAmount = expectedAmount;

      // Récupérer le prix de consensus actuel
      const config = await prisma.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
      const consensusPrice = config?.consensusPrice || 314159;

      // Calculer la conversion PI via le service
      const metadata = transaction.metadata as any;
      const conversion = await conversionService.localToPi(
        verifiedAmount,
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

      // C. Notification utilisateur avec metadonnees completes
      await prisma.notification.create({
        data: {
          userId: transaction.fromUserId || transaction.toUserId!,
          title: "Depot recu !",
          message: `Votre depot de ${verifiedAmount} ${conversion.currency} a ete converti en ${conversion.piAmount} PI.`,
          type: "SUCCESS",
          metadata: JSON.stringify({
            amount: conversion.piAmount,
            currency: "PI",
            fee: 0,
            reference: transaction.reference || reference,
            transactionId: transaction.id,
            method: `Mobile Money (${conversion.currency})`,
            status: "SUCCESS",
            network: "PIMOBIPAY",
            fromAmount: verifiedAmount,
            fromCurrency: conversion.currency,
            toAmount: conversion.piAmount,
            toCurrency: "PI",
            rate: consensusPrice,
          }),
        }
      });

      console.log(`✅ PIMOBIPAY: Wallet mis à jour pour ${external_id}`);
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
