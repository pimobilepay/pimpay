export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";                
import { adminAuth } from "@/lib/adminAuth"; // Utilisation de ton système admin habituel

export async function POST(req: NextRequest) {          
  try {
    const { transactionId, finalAmount } = await req.json();                                                
    
    // 1. VÉRIFICATION ADMIN (Crucial pour le build et la sécurité)
    const payload = (await adminAuth(req)) as unknown as { id: string; role: string } | null;
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!transactionId || !finalAmount) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 2. Récupérer la transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { fromUser: true }
    });

    // Sécurité : On vérifie que la transaction existe ET qu'elle a un utilisateur associé
    if (!transaction || transaction.status !== "PENDING" || !transaction.fromUserId) {
      return NextResponse.json({ error: "Transaction invalide ou utilisateur manquant" }, { status: 400 });
    }

    // 3. Utiliser une TRANSACTION Prisma pour l'intégrité de Pimpay
    const result = await prisma.$transaction(async (tx) => {
      // A. Mettre à jour la transaction
      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: "SUCCESS",
          amount: parseFloat(finalAmount)
        }
      });

      // B. Créditer le Wallet de l'utilisateur
      // On force le type string ici car on a vérifié la nullité plus haut
      const userId: string = transaction.fromUserId as string;

      await tx.wallet.updateMany({
        where: { userId: userId, currency: "PI" },
        data: {
          balance: { increment: parseFloat(finalAmount) }
        }
      });

      // C. Créer une notification de succès
      await tx.notification.create({
        data: {
          userId: userId,
          title: "Dépôt validé !",
          message: `Votre dépôt de ${finalAmount} π a été crédité sur votre compte.`,
          type: "SUCCESS"
        }
      });

      return updatedTx;
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("VALIDATE_DEPOSIT_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
