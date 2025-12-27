import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
// Importez votre instance prisma si vous en avez déjà une (ex: import { prisma } from "@/lib/prisma")
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { recipientId, amount, description } = body;
    const senderId = "ID_DE_L_UTILISATEUR_CONNECTE"; // À récupérer via votre système de session (NextAuth ou autre)

    // 1. Validation de sécurité
    if (!recipientId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // 2. TRANSACTION ATOMIQUE (Tout passe ou tout échoue)
    const result = await prisma.$transaction(async (tx) => {
      // Vérifier le solde de l'envoyeur
      const sender = await tx.user.findUnique({
        where: { id: senderId },
      });

      if (!sender || Number(sender.balance) < amount + 0.01) {
        throw new Error("Solde insuffisant pour couvrir le montant et les frais");
      }

      // Débiter l'envoyeur
      const updatedSender = await tx.user.update({
        where: { id: senderId },
        data: { balance: { decrement: amount + 0.01 } },
      });

      // Créditer le destinataire
      const updatedRecipient = await tx.user.update({
        where: { id: recipientId },
        data: { balance: { increment: amount } },
      });

      // Créer l'enregistrement de transaction
      const transactionRecord = await tx.transaction.create({
        data: {
          senderId,
          receiverId: recipientId,
          amount,
          description: description || "Transfert Pi",
          status: "COMPLETED",
          type: "TRANSFER",
        },
      });

      return transactionRecord;
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("Erreur de transaction:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du transfert" },
      { status: 500 }
    );
  }
}
