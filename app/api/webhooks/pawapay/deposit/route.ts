export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  checkDeposit,
  extractLookupStatus,
  mapPawaPayStatus,
} from "@/lib/pawapay";

/**
 * POST /api/webhooks/pawapay/deposit
 *
 * Callback PawaPay pour les DÉPÔTS (collecte / cash-in).
 * PawaPay envoie le statut final du dépôt (COMPLETED / FAILED / ...).
 *
 * SÉCURITÉ : on ne fait JAMAIS confiance au payload du webhook pour le montant
 * ni même pour le statut. On ré-interroge l'API PawaPay (GET /v2/deposits/{id})
 * pour obtenir le statut « autoritaire » avant de créditer quoi que ce soit.
 * Le montant crédité provient TOUJOURS de la transaction stockée en base
 * (metadata.netPi calculé à l'initiation) — anti-injection de montant.
 * C'est ce qui empêche un faux callback de créditer frauduleusement un compte.
 *
 * [FIX] Rate limiting ajouté par IP (30 req/min) : sans signature crypto,
 * rien n'empêchait un tiers de spammer cet endpoint avec des depositId
 * devinés/fuités pour déclencher des appels répétés à l'API PawaPay
 * (bruit, consommation de quota). Le rate-limit borne ce risque résiduel.
 *
 * TODO (non fait ici, à faire volontairement) : PawaPay propose une
 * signature cryptographique optionnelle des callbacks (ECDSA P-256,
 * RFC-9421 "HTTP Message Signatures" — pas un simple HMAC à secret
 * partagé). Elle nécessite : 1) d'activer "signed callbacks" + uploader
 * votre clé publique dans le Dashboard PawaPay, 2) de récupérer la clé
 * publique de PawaPay via leur endpoint "Public Keys", 3) de reconstruire
 * exactement la chaîne canonique signée (@method, @authority, @path,
 * signature-date, content-digest, content-type) pour vérifier la
 * signature ECDSA. Je ne l'implémente pas ici : une implémentation RFC-9421
 * légèrement fausse peut soit tout rejeter en silence (dépôts bloqués),
 * soit donner un faux sentiment de sécurité. Vu que le garde-fou principal
 * (re-vérification autoritaire ci-dessous) neutralise déjà le risque de
 * fraude, mieux vaut l'implémenter et le tester proprement contre le
 * sandbox PawaPay plutôt que de le deviner. Voir docs.pawapay.io/using_the_api
 * section "Verify callback signature".
 *
 * URL à configurer côté PawaPay :
 *   https://<votre-domaine>/api/webhooks/pawapay/deposit
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting défensif — voir commentaire ci-dessus.
    const ip = getClientIp(req);
    const rl = checkRateLimit(`pawapay-webhook-deposit:${ip}`, 30, 60_000);
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

    // PawaPay v2 renvoie l'identifiant sous `depositId`
    const depositId: string | undefined =
      body?.depositId || body?.data?.depositId;
    if (!depositId) {
      return NextResponse.json({ error: "depositId manquant" }, { status: 400 });
    }

    // 1. Retrouver la transaction associée (externalId = depositId)
    const transaction = await prisma.transaction.findFirst({
      where: { externalId: depositId, type: "DEPOSIT" },
    });
    if (!transaction) {
      // On répond 200 pour éviter que PawaPay ne renvoie indéfiniment le callback
      return NextResponse.json(
        { message: "Transaction inconnue, ignorée" },
        { status: 200 }
      );
    }

    // 2. Idempotence / anti-replay : une transaction déjà finalisée n'est jamais retraitée
    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        { message: "Transaction déjà traitée" },
        { status: 200 }
      );
    }

    // 3. Vérification autoritaire du statut auprès de PawaPay
    const lookup = await checkDeposit(depositId);
    const authoritative = extractLookupStatus(lookup.data);
    const status = mapPawaPayStatus(authoritative);

    const meta = (transaction.metadata as any) || {};

    // 4. Statut encore en attente → on ne fait rien (PawaPay renverra un callback final)
    if (status === "PENDING") {
      return NextResponse.json({ message: "En attente", status: authoritative });
    }

    // 5. ÉCHEC → marquer FAILED
    if (status === "FAILED") {
      await prisma.transaction.update({
        where: { id: transaction.id, status: "PENDING" },
        data: {
          status: "FAILED",
          statusClass: "AGGREGATOR_FAILED",
          metadata: { ...meta, pawapayFinalStatus: authoritative },
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
      return NextResponse.json({ success: false, status: "FAILED" });
    }

    // 6. SUCCÈS → créditer le montant NET en Pi (calculé à l'initiation, stocké en base)
    const netPi = Number(meta.netPi) || 0;
    const userId = transaction.fromUserId;
    if (!userId || netPi <= 0) {
      // Rien à créditer de façon fiable → on marque quand même SUCCESS pour cohérence
      await prisma.transaction.update({
        where: { id: transaction.id, status: "PENDING" },
        data: {
          status: "SUCCESS",
          statusClass: "AGGREGATOR_COMPLETED",
          metadata: { ...meta, pawapayFinalStatus: authoritative },
        },
      });
      return NextResponse.json({ success: true, status: "SUCCESS", credited: 0 });
    }

    await prisma.$transaction(async (tx) => {
      // Crédit du wallet PI (création si inexistant)
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        update: { balance: { increment: netPi } },
        create: {
          userId,
          currency: "PI",
          balance: netPi,
          type: "PI",
        },
      });

      await tx.transaction.update({
        where: { id: transaction.id, status: "PENDING" },
        data: {
          status: "SUCCESS",
          statusClass: "AGGREGATOR_COMPLETED",
          netAmount: netPi,
          toUserId: userId,
          toWalletId: wallet.id,
          metadata: { ...meta, pawapayFinalStatus: authoritative },
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

    // Auto-conversion des frais en Pi (non bloquant)
    if (transaction.fee && transaction.fee > 0) {
      autoConvertFeeToPi(
        transaction.fee,
        "USD",
        transaction.id,
        transaction.reference
      ).catch((err) =>
        console.error("[PAWAPAY_DEPOSIT_WEBHOOK] Fee conversion:", err.message)
      );
    }

    return NextResponse.json({ success: true, status: "SUCCESS", credited: netPi });
  } catch (error: any) {
    console.error("[v0] PAWAPAY_DEPOSIT_WEBHOOK_ERROR:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
