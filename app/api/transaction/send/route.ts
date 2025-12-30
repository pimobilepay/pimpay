import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Utilise ton instance partagée
import { auth } from "@/lib/auth"; // Pour récupérer l'utilisateur connecté

export async function POST(req: Request) {
  try {
    // 1. Récupérer la session utilisateur (Sécurité)
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { recipientId, amount, description } = body;
    const senderId = session.user.id;

    // 2. Validation de base
    if (!recipientId || !amount || amount <= 0) {
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
    const totalDeduction = Number(amount) + fee;

    // 4. TRANSACTION ATOMIQUE PRISMA
    const result = await prisma.$transaction(async (tx) => {
      // Vérifier le Wallet de l'envoyeur (On utilise la table Wallet selon ton schéma)
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: "PI" } }
      });

      if (!senderWallet || senderWallet.balance < totalDeduction) {
        throw new Error("Solde insuffisant pour le transfert et les frais");
      }

      // Vérifier ou créer le Wallet du destinataire
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

      // B. Créditer le destinataire (Montant net sans les frais)
      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: Number(amount) } },
      });

      // C. Créer l'enregistrement dans la table Transaction (Singulier)
      const transactionRecord = await tx.transaction.create({
        data: {
          reference: `TX-${Date.now()}-${senderId.slice(0, 4)}`,
          amount: Number(amount),
          fee: fee,
          type: "TRANSFER", // Ton Enum TransactionType
          status: "SUCCESS", // Ton Enum TransactionStatus
          description: description || "Transfert entre Pioneer",
          fromUserId: senderId,
          toUserId: recipientId,
          fromWalletId: senderWallet.id,
          toWalletId: recipientWallet.id,
        },
      });

      // D. Optionnel : Mettre à jour les stats globales de l'app
      await tx.systemConfig.update({
        where: { id: "GLOBAL_CONFIG" },
        data: { 
          totalVolumePi: { increment: Number(amount) },
          totalProfit: { increment: fee }
        }
      });

      return transactionRecord;
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("Erreur de transaction:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du transfert" },
      { status: 400 }
    );
  }
}
