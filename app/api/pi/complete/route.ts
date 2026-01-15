export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { paymentId, txid } = await req.json();

    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 1. OBLIGATOIRE : Validation auprès des serveurs Pi Network
    const piApiKey = process.env.PI_API_KEY;
    const piResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${piApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ txid }) // On leur envoie le hash de la blockchain
    });

    if (!piResponse.ok) {
      const errorDetail = await piResponse.json();
      console.error("PI_COMPLETE_REMOTE_ERROR:", errorDetail);
      return NextResponse.json({ error: "Pi Network n'a pas validé la transaction" }, { status: 402 });
    }

    // 2. Vérification locale de la transaction
    const transaction = await prisma.transaction.findUnique({
      where: { reference: paymentId }
    });

    if (!transaction || !transaction.fromUserId) {
      return NextResponse.json({ error: "Transaction introuvable dans PimPay" }, { status: 404 });
    }

    // 3. TRANSACTION ATOMIQUE : Mise à jour du solde et du statut
    const result = await prisma.$transaction(async (tx) => {
      // a. Finaliser la transaction
      const updatedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "COMPLETED",
          blockchainTx: txid,
          metadata: {
            ...(transaction.metadata as any),
            completedAt: new Date().toISOString(),
            confirmedByPi: true
          }
        }
      });

      // b. Mise à jour du Wallet (RECHARGE : on utilise INCREMENT)
      const wallet = await tx.wallet.update({
        where: {
          userId_currency: {
            userId: transaction.fromUserId!,
            currency: "PI"
          }
        },
        data: {
          balance: {
            increment: transaction.amount // L'utilisateur a payé en Pi, on augmente son solde PimPay
          }
        }
      });

      return { updatedTx, wallet };
    });

    return NextResponse.json({
      success: true,
      balance: result.wallet.balance,
      transactionId: result.updatedTx.id
    });

  } catch (error: any) {
    console.error("PI_COMPLETE_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Échec du protocole de finalisation" }, { status: 500 });
  }
}
