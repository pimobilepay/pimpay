import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionStatus, TransactionType, WalletType } from '@prisma/client';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId, amount, type } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: "UserID manquant" }, { status: 400 });
    }

    // 1. Simulation du délai réseau (pour faire pro)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 2. Lancement de la transaction atomique Prisma
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Trouver ou Créer le Wallet USD (Essentiel pour PimPay)
      let wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: "USD" } }
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: userId,
            currency: "USD",
            balance: 0,
            type: WalletType.FIAT
          }
        });
      }

      if (type === "DEPOSIT") {
        // --- ACTION : CRÉDITER LE COMPTE ---
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amount } }
        });

        // CRÉER L'HISTORIQUE
        const txn = await tx.transaction.create({
          data: {
            reference: `SIM-DEP-${Date.now()}`,
            amount: amount,
            currency: "USD",
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.SUCCESS,
            toUserId: userId,
            toWalletId: wallet.id,
            description: "Simulation Dépôt Lab"
          }
        });

        // ENVOYER NOTIFICATION
        await tx.notification.create({
          data: {
            userId: userId,
            title: "Dépôt Réussi ! 💰",
            message: `Votre solde a été crédité de ${amount}$ pour vos tests.`,
            type: "success"
          }
        });

        return { txn, newBalance: updatedWallet.balance };

      } else {
        // --- ACTION : DÉBITER LE COMPTE (RETRAIT) ---
        if (wallet.balance < amount) {
          throw new Error("Solde insuffisant pour ce retrait de test.");
        }

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: amount } }
        });

        const txn = await tx.transaction.create({
          data: {
            reference: `SIM-WDR-${Date.now()}`,
            amount: amount,
            currency: "USD",
            type: TransactionType.WITHDRAW,
            status: TransactionStatus.SUCCESS,
            fromUserId: userId,
            fromWalletId: wallet.id,
            description: "Simulation Retrait Lab"
          }
        });

        await tx.notification.create({
          data: {
            userId: userId,
            title: "Retrait Confirmé ! 💸",
            message: `Simulation de retrait de ${amount}$ réussie.`,
            type: "success"
          }
        });

        return { txn, newBalance: updatedWallet.balance };
      }
    });

    return NextResponse.json({ success: true, balance: result.newBalance });

  } catch (error: any) {
    console.error("SIMULATION_ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
