export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionStatus, WalletType, TransactionType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { paymentId, txid } = await req.json();

    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 1. VÉRIFICATION HORS TRANSACTION (Évite l'erreur 500)
    // On vérifie d'abord si on a déjà cette transaction pour éviter de rappeler Pi Network pour rien
    let existingTx = await prisma.transaction.findUnique({
      where: { externalId: paymentId }
    });

    let amount: number;
    let userId: string | null;

    if (!existingTx) {
      console.warn(`[PIMPAY] ⚠️ Transaction ${paymentId} absente. Appel API Pi Network...`);
      
      const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
        headers: { Authorization: `Key ${process.env.PI_API_KEY}` }
      });
      
      if (!piRes.ok) {
        throw new Error(`Pi Network API Error: ${piRes.statusText}`);
      }

      const piData = await piRes.json();
      amount = piData.amount;
      userId = piData.metadata?.userId || null;
    } else {
      amount = existingTx.amount;
      userId = existingTx.toUserId;
    }

    if (!userId) {
      throw new Error("Utilisateur introuvable dans les données de paiement.");
    }

    // 2. TRANSACTION ATOMIQUE (Courte et Rapide)
    const result = await prisma.$transaction(async (tx) => {
      
      // Upsert du Wallet (Pi)
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: userId as string, currency: "PI" } },
        update: { balance: { increment: existingTx && existingTx.status === TransactionStatus.SUCCESS ? 0 : amount } },
        create: {
          userId: userId as string,
          currency: "PI",
          balance: amount,
          type: WalletType.PI
        }
      });

      // Création ou Mise à jour de la transaction
      const updatedTx = await tx.transaction.upsert({
        where: { externalId: paymentId },
        update: {
          status: TransactionStatus.SUCCESS,
          blockchainTx: txid,
          toWalletId: wallet.id,
          metadata: {
            recoveredAt: new Date().toISOString(),
            method: "S2S_INCOMPLETE_RECOVERY"
          }
        },
        create: {
          reference: `REC-${paymentId.slice(-6).toUpperCase()}`,
          externalId: paymentId,
          blockchainTx: txid,
          amount: amount,
          currency: "PI",
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.SUCCESS,
          toUserId: userId,
          toWalletId: wallet.id,
          description: "Dépôt récupéré avec succès"
        }
      });

      return { message: "Synchronisation réussie", transaction: updatedTx };
    }, {
      timeout: 10000 // Sécurité 10s
    });

    return NextResponse.json({ success: true, ...result });

  } catch (error: any) {
    console.error("❌ [INCOMPLETE_PAYMENT_ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
