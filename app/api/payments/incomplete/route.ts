export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const { paymentId, txid } = await req.json();

    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    console.log(`[PIMPAY] Tentative de récupération du paiement incomplet : ${paymentId}`);

    // 1. Trouver la transaction par son externalId (Pi paymentId)
    // On utilise updateMany pour ne pas planter si la transaction n'existe pas encore
    const result = await prisma.$transaction(async (tx) => {
      
      const transaction = await tx.transaction.findUnique({
        where: { externalId: paymentId }
      });

      if (!transaction) {
        throw new Error("Transaction non trouvée dans PimPay");
      }

      // 2. Si elle n'est pas déjà SUCCESS, on traite
      if (transaction.status !== "SUCCESS") {
        // Mettre à jour la transaction
        const updated = await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "SUCCESS", // Aligné avec ton Enum
            blockchainTx: txid,
            metadata: {
              ...(transaction.metadata || {}),
              recoveredVia: "incomplete_callback",
              recoveredAt: new Date().toISOString()
            }
          }
        });

        // 3. CRÉDITER LE SOLDE (Indispensable pour faire bouger le Chart !)
        if (transaction.toUserId) {
          await tx.wallet.update({
            where: { 
              userId_currency: { 
                userId: transaction.toUserId, 
                currency: transaction.currency || "PI" 
              } 
            },
            data: { balance: { increment: transaction.amount } }
          });
        }
        
        return updated;
      }
      
      return transaction;
    });

    return NextResponse.json({ 
      success: true, 
      message: "Paiement synchronisé et solde mis à jour",
      id: paymentId 
    });

  } catch (error) {
    console.error("❌ [INCOMPLETE_PAYMENT_ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
