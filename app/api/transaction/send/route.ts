export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. Authentification
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { recipientId, amount, description } = body;
    const senderId = session.id;

    // 2. Validation
    const amountNum = parseFloat(amount);
    if (!recipientId || isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    if (recipientId === senderId) {
      return NextResponse.json({ error: "Envoi à soi-même impossible" }, { status: 400 });
    }

    // 3. Récupération rapide de la config (Hors transaction pour gagner du temps)
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });
    const fee = config?.transactionFee || 0.01;
    const totalDeduction = amountNum + fee;

    // 4. TRANSACTION ATOMIQUE AVEC TIMEOUT AUGMENTÉ
    const result = await prisma.$transaction(async (tx) => {
      // Lecture simultanée des deux wallets pour plus de rapidité
      const [senderWallet, recipientWallet] = await Promise.all([
        tx.wallet.findUnique({
          where: { userId_currency: { userId: senderId, currency: "PI" } }
        }),
        tx.wallet.findUnique({
          where: { userId_currency: { userId: recipientId, currency: "PI" } }
        })
      ]);

      if (!senderWallet || senderWallet.balance < totalDeduction) {
        throw new Error("Solde insuffisant (incluant les frais)");
      }

      if (!recipientWallet) {
        throw new Error("Le destinataire n'a pas de wallet Pi actif");
      }

      // Mise à jour des balances
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: totalDeduction } },
      });

      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: amountNum } },
      });

      // Création du log de transaction
      const transactionRecord = await tx.transaction.create({
        data: {
          reference: `TX-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amountNum,
          fee: fee,
          netAmount: amountNum,
          type: "TRANSFER",
          status: "SUCCESS",
          description: description || "Transfert entre Pioneer",
          fromUserId: senderId,
          toUserId: recipientId,
          fromWalletId: senderWallet.id,
          toWalletId: recipientWallet.id,
          currency: "PI"
        },
      });

      // Mise à jour des stats globales
      await tx.systemConfig.update({
        where: { id: "GLOBAL_CONFIG" },
        data: {
          totalVolumePi: { increment: amountNum },
          totalProfit: { increment: fee }
        }
      });

      return transactionRecord;
    }, {
      maxWait: 5000, // 5s pour obtenir une connexion
      timeout: 15000  // 15s pour l'exécution (règle ton erreur de timeout)
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("TRANSACTION_SEND_ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du transfert" },
      { status: 400 }
    );
  }
}
