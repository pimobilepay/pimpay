export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { completePiPayment, getPiPayment } from "@/lib/pi";
import { resolvePimCoins } from "@/lib/pim-packages";

/**
 * POST /api/payments/pim/complete
 * 
 * Completes a PIM coin purchase after Pi payment is confirmed.
 * Called by the /api/payments/complete route when metadata.type === "PIM_COIN_PURCHASE"
 * 
 * This endpoint:
 * 1. Validates the payment was for PIM coins
 * 2. Credits PIM coins to the user's PIM wallet
 * 3. Creates a transaction record
 */
export async function POST(req: Request) {
  try {
    // NOTE SECURITE : `pimCoins` et `piAmount` envoyes par le client ne sont
    // PAS dignes de confiance et ne servent qu'a titre indicatif. Le nombre de
    // PIM credite est recalcule cote serveur a partir du montant Pi verifie.
    const { paymentId, txid, metadata } = await req.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: "Donnees invalides pour l'achat PIM (paymentId requis)" },
        { status: 400 }
      );
    }

    // 1. Authenticate user
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Non authentifie. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    console.log(`[PIMOBIPAY] PIM purchase request for user ${userId}, paymentId: ${paymentId}`);

    // 2. VALIDATION PI NETWORK (S2S) — indispensable pour que Pi Wallet
    // marque le paiement comme complete (sinon il reste "incomplet/expire").
    const PI_API_KEY = process.env.PI_API_KEY;
    if (!PI_API_KEY) {
      console.error("[PIMOBIPAY] PI_API_KEY non configuree");
      return NextResponse.json({ error: "Configuration serveur incomplete" }, { status: 500 });
    }

    if (txid) {
      // Retry indispensable : juste apres la signature, le txid n'est pas
      // toujours confirme. Sans retry, /complete echoue, le Pi Wallet reste
      // bloque jusqu'a expiration du compte a rebours alors que les PIM
      // pourraient etre credites.
      const piResult = await completePiPayment(paymentId, txid, { retries: 4, delayMs: 1500 });

      if (!piResult.ok) {
        console.error("[PIMOBIPAY] Echec completion Pi Network apres retries:", piResult.data);
        // On laisse la transaction en PENDING (creee a l'approbation) pour
        // qu'elle puisse etre reprise via /api/payments/incomplete ou le mode rescue.
        return NextResponse.json(
          {
            error: "La validation Pi Network n'a pas encore abouti. Votre paiement sera finalise automatiquement, reessayez dans quelques instants.",
            retryable: true,
          },
          { status: 409 }
        );
      }

      console.log(`[PIMOBIPAY] Paiement Pi confirme cote serveur: ${paymentId}`);
    }

    // 2bis. SOURCE DE VERITE : montant Pi reellement paye + statut verifie.
    // FAILLE CORRIGEE : on ne credite plus le `pimCoins` fourni par le client.
    const piPayment = await getPiPayment(paymentId);
    if (!piPayment) {
      return NextResponse.json({ error: "Paiement Pi introuvable" }, { status: 404 });
    }

    const isVerified =
      piPayment.status?.transaction_verified === true ||
      piPayment.transaction?.verified === true;

    if (!isVerified) {
      console.error("[PIMOBIPAY] Paiement PIM non verifie:", paymentId, piPayment.status);
      return NextResponse.json(
        { error: "Paiement non verifie sur la blockchain Pi", retryable: true },
        { status: 409 }
      );
    }

    const verifiedPiAmount = Number(piPayment.amount);

    // Calcul EXCLUSIVEMENT cote serveur du nombre de PIM a crediter.
    const resolved = resolvePimCoins(metadata?.productId, verifiedPiAmount);
    if (!resolved.ok) {
      console.error("[PIMOBIPAY] Resolution PIM refusee:", resolved.reason);
      return NextResponse.json(
        { error: resolved.reason || "Achat PIM invalide" },
        { status: 400 }
      );
    }
    const pimCoins = resolved.pimCoins;

    // 3. Check for duplicate purchase
    const existingTx = await prisma.transaction.findUnique({
      where: { externalId: `PIM-${paymentId}` },
    });

    if (existingTx?.status === TransactionStatus.SUCCESS) {
      return NextResponse.json({
        success: true,
        message: "Achat deja credite",
        pimCoins: existingTx.amount,
      });
    }

    // 4. Atomic transaction: credit PIM coins
    const result = await prisma.$transaction(async (tx) => {
      // Upsert PIM wallet
      const pimWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PIM" } },
        update: { balance: { increment: pimCoins } },
        create: {
          userId,
          currency: "PIM",
          balance: pimCoins,
          // L'enum WalletType ne comporte pas de valeur PIM ; le wallet est
          // identifie de maniere unique par currency: "PIM".
          type: WalletType.CRYPTO,
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.upsert({
        where: { externalId: `PIM-${paymentId}` },
        update: {
          amount: pimCoins,
          status: TransactionStatus.SUCCESS,
          blockchainTx: txid,
          toWalletId: pimWallet.id,
        },
        create: {
          reference: `PIM-${paymentId.slice(-8).toUpperCase()}`,
          externalId: `PIM-${paymentId}`,
          blockchainTx: txid,
          amount: pimCoins,
          currency: "PIM",
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.SUCCESS,
          description: `Achat de ${pimCoins} PIM Coins`,
          toUserId: userId,
          toWalletId: pimWallet.id,
          metadata: {
            piAmount: verifiedPiAmount,
            productId: metadata?.productId,
            bonus: resolved.bonus,
            purchasedAt: new Date().toISOString(),
          },
        },
      });

      return { pimWallet, transaction };
    }, { maxWait: 10000, timeout: 30000 });

    // 4. Create notification
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: "PIM Coins ajoutes !",
          message: `Vous avez recu ${pimCoins} PIM Coins.${resolved.bonus ? ` Bonus inclus: ${resolved.bonus} PIM !` : ""}`,
          type: "SUCCESS",
          metadata: JSON.stringify({
            pimCoins,
            piAmount: verifiedPiAmount,
            transactionId: result.transaction.id,
            productId: metadata?.productId,
          }),
        },
      });
    } catch {
      // Notification non-bloquante
    }

    console.log(`[PIMOBIPAY] PIM credited: ${pimCoins} PIM to user ${userId}`);

    return NextResponse.json({
      success: true,
      message: `${pimCoins} PIM Coins ajoutes !`,
      pimCoins,
      newBalance: result.pimWallet.balance,
      transactionId: result.transaction.id,
    });

  } catch (error: any) {
    console.error("[PIM_PURCHASE_ERROR]:", error.message);
    return NextResponse.json(
      { error: "Erreur lors de l'achat PIM" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/pim/complete
 * 
 * Returns the user's current PIM balance
 */
export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const pimWallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: "PIM" } },
    });

    return NextResponse.json({
      balance: pimWallet?.balance || 0,
      currency: "PIM",
    });

  } catch (error: any) {
    console.error("[PIM_BALANCE_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
