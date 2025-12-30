import { NextResponse } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { paymentId, txid } = await req.json();
    const piApiKey = process.env.PI_API_KEY;

    // 1. On informe le serveur Pi que nous avons bien reçu la preuve du paiement
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${piApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ txid })
    });

    const paymentData = await response.json();

    if (response.ok) {
      // 2. TRANSACTION PRISMA : On met à jour le solde de l'utilisateur
      await prisma.$transaction(async (tx) => {
        // Trouver l'utilisateur (via son pseudo Pi ou ID stocké lors de l'auth)
        const user = await tx.user.findFirst({
          where: { piUserId: paymentData.user_id }
        });

        if (user) {
          // Mettre à jour le Wallet Pi
          await tx.wallet.update({
            where: { userId_currency: { userId: user.id, currency: "PI" } },
            data: { balance: { increment: parseFloat(paymentData.amount) } }
          });

          // Créer le log de transaction
          await tx.transaction.create({
            data: {
              reference: paymentId,
              blockchainTx: txid,
              amount: parseFloat(paymentData.amount),
              type: "DEPOSIT",
              status: "COMPLETED",
              toUserId: user.id,
              description: "Dépôt Pi Network Mainnet"
            }
          });
        }
      });

      return NextResponse.json({ success: true });
    }

    throw new Error("Erreur de complétion");
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
