import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function POST(req: NextRequest) {
  try {
    const { transactionId, finalAmount } = await req.json();

    // -- VÉRIFICATION ADMIN (Simplifiée pour l'instant) --
    // Idéalement, vérifie le rôle de l'user dans ton JWT
    if (!transactionId || !finalAmount) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

    // 1. Récupérer la transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { fromUser: true }
    });

    if (!transaction || transaction.status !== "PENDING") {
      return NextResponse.json({ error: "Transaction invalide ou déjà traitée" }, { status: 400 });
    }

    // 2. Utiliser une TRANSACTION Prisma pour être sûr que tout se passe bien
    const result = await prisma.$transaction(async (tx) => {
      // A. Mettre à jour la transaction
      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: { 
          status: "SUCCESS",
          amount: parseFloat(finalAmount) // On enregistre le montant final vérifié sur la blockchain
        }
      });

      // B. Créditer le Wallet de l'utilisateur
      const wallet = await tx.wallet.updateMany({
        where: { userId: transaction.fromUserId, currency: "PI" },
        data: {
          balance: { increment: parseFloat(finalAmount) }
        }
      });

      // C. Créer une notification de succès
      await tx.notification.create({
        data: {
          userId: transaction.fromUserId,
          title: "Dépôt validé !",
          message: `Votre dépôt de ${finalAmount} π a été crédité sur votre compte.`,
          type: "SUCCESS"
        }
      });

      return updatedTx;
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
