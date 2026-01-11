export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { paymentId, txid } = await req.json();

    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // Ici, tu peux ajouter une logique pour vérifier le txid sur la blockchain Pi
    // Ou simplement marquer la transaction comme "SUCCESS" si elle existait en PENDING
    const updatedTransaction = await prisma.transaction.updateMany({
      where: { 
        // On cherche une transaction qui correspondrait à ce paiement
        // Adapté selon comment tu stockes le paymentId Pi
        metadata: { path: ["paymentId"], equals: paymentId },
        status: "PENDING" 
      },
      data: { 
        status: "SUCCESS",
        blockchainTx: txid 
      }
    });

    return NextResponse.json({ success: true, updated: updatedTransaction.count });
  } catch (error) {
    console.error("INCOMPLETE_PAYMENT_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
