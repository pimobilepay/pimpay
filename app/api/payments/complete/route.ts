export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TransactionStatus, WalletType, TransactionType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const PI_API_KEY = process.env.PI_API_KEY;

    if (!PI_API_KEY) {
      console.error("[PIMPAY] PI_API_KEY non configuree");
      return NextResponse.json({ error: "Configuration serveur incomplete" }, { status: 500 });
    }

    // --- 1. AUTHENTIFICATION ---
    const userId = await getAuthUserId();
    if (!userId) {
      console.error("[PIMPAY] Utilisateur non authentifie pour complete");
      return NextResponse.json({ error: "Session expiree. Veuillez vous reconnecter." }, { status: 401 });
    }

    const { paymentId, txid } = await request.json();
    if (!paymentId || !txid) {
      console.error("[PIMPAY] Donnees incompletes pour complete:", { paymentId, txid });
      return NextResponse.json({ error: "Donnees incompletes (paymentId et txid requis)" }, { status: 400 });
    }

    console.log(`[PIMPAY] Complete paiement: ${paymentId}, txid: ${txid}, user: ${userId}`);

    // --- 2. VALIDATION PI NETWORK (S2S) ---
    // On valide d'abord avec Pi Network pour obtenir les détails réels du paiement (montant)
    const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid }),
    });

    const piData = await piRes.json();
    
    // Si Pi dit que c'est déjà complété, on continue pour synchroniser notre base
    const isAlreadyCompleted = piData.message === "Payment already completed";
    
    if (!piRes.ok && !isAlreadyCompleted) {
      console.error("❌ Pi Network Error:", piData);
      return NextResponse.json({ error: "Échec validation Pi Network" }, { status: 403 });
    }

    // --- 3. RÉCUPÉRATION OU RÉCRÉATION DE LA TRANSACTION ---
    // Correction du crash findUnique : On utilise findUnique mais on gère l'absence
    let transaction = await prisma.transaction.findUnique({
      where: { externalId: paymentId }
    });

    // Si la transaction n'existe pas (cas du db-clean-up), on la recrée
    if (!transaction) {
      console.warn(`[PIMPAY] ⚠️ Transaction ${paymentId} absente après cleanup. Récréation...`);
      
      // On récupère le montant depuis piData ou on met une valeur par défaut sécurisée
      const amountFromPi = piData.amount || 0; 

      transaction = await prisma.transaction.create({
        data: {
          reference: `REC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          externalId: paymentId,
          amount: amountFromPi,
          currency: "PI",
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.PENDING,
          toUserId: userId,
          description: "Récupération dépôt Pi Network"
        }
      });
    }

    // Sécurité : Éviter le double crédit
    if (transaction.status === TransactionStatus.SUCCESS) {
      return NextResponse.json({ success: true, message: "Déjà crédité" });
    }

    // --- 4. CAS SPÉCIAL : ACHAT DE PIM COINS ---
    const txMeta = (transaction.metadata as any) || {};
    const isPimPurchase = transaction.currency === "PIM" || txMeta?.type === "PIM_COIN_PURCHASE";

    if (isPimPurchase) {
      const pimCoins = Number(txMeta?.pimCoins) || transaction.amount;

      const pimResult = await prisma.$transaction(async (tx) => {
        const pimWallet = await tx.wallet.upsert({
          where: { userId_currency: { userId, currency: "PIM" } },
          update: { balance: { increment: pimCoins } },
          create: {
            userId,
            currency: "PIM",
            balance: pimCoins,
            type: WalletType.PIM,
          },
        });

        const updatedTx = await tx.transaction.update({
          where: { id: transaction!.id },
          data: {
            status: TransactionStatus.SUCCESS,
            blockchainTx: txid,
            toWalletId: pimWallet.id,
          },
        });

        return { pimWallet, updatedTx };
      }, { maxWait: 10000, timeout: 30000 });

      // Notification de credit PIM (non-bloquante)
      try {
        await prisma.notification.create({
          data: {
            userId,
            title: "PIM Coins ajoutes !",
            message: `Vous avez recu ${pimCoins} PIM Coins.${txMeta?.bonus ? ` Bonus inclus: ${txMeta.bonus} PIM !` : ""}`,
            type: "SUCCESS",
            metadata: JSON.stringify({
              pimCoins,
              piAmount: txMeta?.piAmount,
              transactionId: pimResult.updatedTx.id,
              productId: txMeta?.productId,
            }),
          },
        });
      } catch { /* notification non-bloquante */ }

      console.log(`[PIMPAY] PIM credite: ${pimCoins} PIM pour ${userId}`);

      return NextResponse.json({
        success: true,
        message: `${pimCoins} PIM Coins ajoutes !`,
        pimCoins,
        newBalance: pimResult.pimWallet.balance,
      });
    }

    // --- 4. MISE À JOUR BANCAIRE ATOMIQUE ---
    const finalResult = await prisma.$transaction(async (tx) => {
      // Utilisation de upsert pour le Wallet pour éviter tout crash si le wallet PI n'existe pas
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "PI" } },
        update: { balance: { increment: transaction!.amount } },
        create: {
          userId,
          currency: "PI",
          balance: transaction!.amount,
          type: WalletType.PI
        }
      });

      // Mise à jour de la transaction en SUCCESS
      return await tx.transaction.update({
        where: { id: transaction!.id },
        data: {
          status: TransactionStatus.SUCCESS,
          blockchainTx: txid,
          toWalletId: wallet.id,
          metadata: {
            completedAt: new Date().toISOString(),
            recoveredAfterCleanup: true
          }
        }
      });
    }, { maxWait: 10000, timeout: 30000 });
  
    console.log(`[PIMPAY] Portefeuille credite : ${transaction.amount} PI pour ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Solde mis à jour !",
      amount: transaction.amount
    });

  } catch (error: any) {
    console.error("❌ [CRITICAL_PAYMENT_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }
}
