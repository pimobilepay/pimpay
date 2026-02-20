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

    console.log(`[PIMPAY] 🔄 Tentative de récupération du paiement incomplet : ${paymentId}`);

    // --- TRANSACTION ATOMIQUE PIMPAY ---
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Chercher la transaction (externalId est ton Pi paymentId)
      let transaction = await tx.transaction.findUnique({
        where: { externalId: paymentId }
      });

      // 2. LE "SAUVEUR" : Si la transaction n'existe pas (après db-clean-up)
      // On doit la recréer pour pouvoir créditer l'utilisateur
      if (!transaction) {
        console.warn(`[PIMPAY] ⚠️ Transaction ${paymentId} introuvable en DB. Récréation...`);
        
        // On récupère les infos depuis Pi Network (S2S) pour être sûr du montant
        const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
          headers: { Authorization: `Key ${process.env.PI_API_KEY}` }
        });
        const piData = await piRes.json();

        if (!piRes.ok) throw new Error("Impossible de vérifier le paiement auprès de Pi Network");

        // On recrée la transaction supprimée
        transaction = await tx.transaction.create({
          data: {
            reference: `REC-${paymentId.slice(-6).toUpperCase()}`,
            externalId: paymentId,
            blockchainTx: txid,
            amount: piData.amount,
            currency: "PI",
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.PENDING, // Sera mis à jour en SUCCESS juste après
            toUserId: piData.metadata?.userId || null, // On espère que l'userId était dans les metadata
            description: "Dépôt récupéré (Incomplete Callback)"
          }
        });
      }

      // 3. Éviter le double traitement
      if (transaction.status === TransactionStatus.SUCCESS) {
        return { message: "Déjà synchronisé", transaction };
      }

      // 4. Identifier l'utilisateur (Priorité : Transaction > Pi Data)
      const finalUserId = transaction.toUserId;
      if (!finalUserId) {
        throw new Error("Impossible d'identifier l'utilisateur propriétaire du paiement.");
      }

      // 5. UPSERT DU WALLET (Sécurité maximale si le wallet a aussi été supprimé)
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: finalUserId, currency: "PI" } },
        update: { balance: { increment: transaction.amount } },
        create: {
          userId: finalUserId,
          currency: "PI",
          balance: transaction.amount,
          type: WalletType.PI
        }
      });

      // 6. Mise à jour de la Transaction en SUCCESS
      const updatedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.SUCCESS,
          blockchainTx: txid,
          toWalletId: wallet.id,
          metadata: {
            ...(typeof transaction.metadata === 'object' ? transaction.metadata : {}),
            recoveredAt: new Date().toISOString(),
            method: "S2S_INCOMPLETE_RECOVERY"
          }
        }
      });

      return { message: "Synchronisation réussie", transaction: updatedTx };
    });

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error("❌ [INCOMPLETE_PAYMENT_ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
