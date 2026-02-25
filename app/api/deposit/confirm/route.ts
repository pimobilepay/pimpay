export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ajuste l'import selon ton projet

export async function POST(req: Request) {
  try {
    const { reference } = await req.json();

    // 1. Trouver la transaction
    const transaction = await prisma.transaction.findUnique({
      where: { reference },
      include: { fromUser: true, toUser: true }
    });

    if (!transaction || transaction.status !== "PENDING") {
      return NextResponse.json({ error: "Transaction invalide ou déjà traitée" }, { status: 400 });
    }

    // Identifier l'utilisateur : toUserId pour dépôts Pi Browser, fromUserId pour dépôts manuels
    const depositUserId = transaction.toUserId || transaction.fromUserId;
    if (!depositUserId) {
      return NextResponse.json({ error: "Impossible d'identifier l'utilisateur" }, { status: 400 });
    }

    // 2. Utiliser une transaction Prisma pour garantir l'atomicité
    const result = await prisma.$transaction(async (tx) => {
      
      // MISE À JOUR OU CRÉATION DU WALLET
      const updatedWallet = await tx.wallet.upsert({
        where: {
          userId_currency: {
            userId: depositUserId,
            currency: transaction.currency || "USD",
          },
        },
        update: {
          balance: {
            increment: transaction.amount,
          },
        },
        create: {
          userId: depositUserId,
          currency: transaction.currency || "USD",
          balance: transaction.amount,
          type: "FIAT",
        },
      });

      // 3. Marquer la transaction comme réussie
      const completedTx = await tx.transaction.update({
        where: { reference },
        data: { 
          status: "SUCCESS", // ou "SUCCESS" selon ton Enum
          toWalletId: updatedWallet.id 
        },
      });

      return { completedTx, updatedWallet };
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("Erreur Confirmation Prisma:", error);
    return NextResponse.json({ 
      error: "Erreur lors de la validation", 
      details: error.message 
    }, { status: 500 });
  }
}
