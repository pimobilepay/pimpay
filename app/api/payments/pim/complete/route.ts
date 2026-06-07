export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

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
    const { paymentId, txid, pimCoins, piAmount, metadata } = await req.json();

    if (!paymentId || !pimCoins || pimCoins <= 0) {
      return NextResponse.json(
        { error: "Donnees invalides pour l'achat PIM" },
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

    console.log(`[PIMPAY] PIM purchase: ${pimCoins} PIM for user ${userId}, paymentId: ${paymentId}`);

    // 2. VALIDATION PI NETWORK (S2S) — indispensable pour que Pi Wallet
    // marque le paiement comme complete (sinon il reste "incomplet/expire").
    const PI_API_KEY = process.env.PI_API_KEY;
    if (!PI_API_KEY) {
      console.error("[PIMPAY] PI_API_KEY non configuree");
      return NextResponse.json({ error: "Configuration serveur incomplete" }, { status: 500 });
    }

    if (txid) {
      const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      });

      const piData = await piRes.json().catch(() => ({}));
      const isAlreadyCompleted = piData?.message === "Payment already completed";

      if (!piRes.ok && !isAlreadyCompleted) {
        console.error("[PIMPAY] Echec completion Pi Network:", piData);
        return NextResponse.json(
          { error: "Echec validation Pi Network" },
          { status: 403 }
        );
      }

      console.log(`[PIMPAY] Paiement Pi confirme cote serveur: ${paymentId}`);
    }

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
            piAmount,
            productId: metadata?.productId,
            bonus: metadata?.bonus || 0,
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
          message: `Vous avez recu ${pimCoins} PIM Coins.${metadata?.bonus ? ` Bonus inclus: ${metadata.bonus} PIM !` : ""}`,
          type: "SUCCESS",
          metadata: JSON.stringify({
            pimCoins,
            piAmount,
            transactionId: result.transaction.id,
            productId: metadata?.productId,
          }),
        },
      });
    } catch {
      // Notification non-bloquante
    }

    console.log(`[PIMPAY] PIM credited: ${pimCoins} PIM to user ${userId}`);

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
