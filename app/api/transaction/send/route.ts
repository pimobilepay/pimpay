export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. Récupérer la session utilisateur (Correction de la structure Pimpay)
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { recipientId, amount, description } = body;
    const senderId = session.id;

    // 2. Validation de base
    if (!recipientId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    if (recipientId === senderId) {
      return NextResponse.json({ error: "Envoi à soi-même impossible" }, { status: 400 });
    }

    // 3. Récupération des frais depuis la config système
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });
    const fee = config?.transactionFee || 0.01;
    const amountNum = parseFloat(amount);
    const totalDeduction = amountNum + fee;

    // 4. TRANSACTION ATOMIQUE PRISMA (Sécurité maximale pour pimpay)
    const result = await prisma.$transaction(async (tx) => {
      // Vérifier le Wallet de l'envoyeur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: "PI" } }
      });

      if (!senderWallet || senderWallet.balance < totalDeduction) {
        throw new Error("Solde insuffisant pour le transfert et les frais");
      }

      // Vérifier le Wallet du destinataire
      const recipientWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: recipientId, currency: "PI" } }
      });

      if (!recipientWallet) {
        throw new Error("Le destinataire n'a pas de compte Pi actif");
      }

      // A. Débiter l'envoyeur
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: totalDeduction } },
      });

      // B. Créditer le destinataire
      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: amountNum } },
      });

      // C. Créer l'enregistrement dans la table Transaction
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

      // D. Mettre à jour les stats globales
      await tx.systemConfig.update({
        where: { id: "GLOBAL_CONFIG" },
        data: {
          totalVolumePi: { increment: amountNum },
          totalProfit: { increment: fee }
        }
      });

      return transactionRecord;
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
