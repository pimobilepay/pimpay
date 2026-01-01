import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ajuste l'import selon ton projet

export async function POST(req: Request) {
  try {
    const { reference } = await req.json();

    // 1. Trouver la transaction
    const transaction = await prisma.transaction.findUnique({
      where: { reference },
      include: { fromUser: true }
    });

    if (!transaction || transaction.status !== "PENDING") {
      return NextResponse.json({ error: "Transaction invalide ou déjà traitée" }, { status: 400 });
    }

    // 2. Utiliser une transaction Prisma pour garantir l'atomicité
    const result = await prisma.$transaction(async (tx) => {
      
      // MISE À JOUR OU CRÉATION DU WALLET (L'étape qui posait problème)
      const updatedWallet = await tx.wallet.upsert({
        where: {
          userId_currency: {
            userId: transaction.fromUserId!,
            currency: "USD", // On assume que c'est un dépôt USD
          },
        },
        update: {
          balance: {
            increment: transaction.amount,
          },
        },
        create: {
          userId: transaction.fromUserId!,
          currency: "USD",
          balance: transaction.amount,
          type: "FIAT", // Type FIAT selon ton Enum WalletType
        },
      });

      // 3. Marquer la transaction comme réussie
      const completedTx = await tx.transaction.update({
        where: { reference },
        data: { 
          status: "SUCCESS", // ou "COMPLETED" selon ton Enum
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
