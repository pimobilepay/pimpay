import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.id;

    // 1. Récupérer le Wallet SIDRA (basé sur ton @@unique([userId, currency]))
    const walletSDA = await prisma.wallet.findUnique({
      where: {
        userId_currency: {
          userId: userId,
          currency: "SDA" // On garde SDA comme symbole de devise
        }
      }
    });

    if (!walletSDA) {
      return NextResponse.json({ error: "Wallet Sidra non trouvé" }, { status: 404 });
    }

    // 2. Simulation de la balance blockchain (1.06 SDA d'après ton test)
    // À remplacer plus tard par l'appel au SDK Sidra ou un fetch API
    const blockchainBalance = 1.06; 
    const difference = blockchainBalance - walletSDA.balance;

    // 3. Si un nouveau dépôt est détecté (différence positive)
    if (difference > 0) {
      await prisma.$transaction(async (tx) => {
        // Mise à jour du solde du Wallet
        await tx.wallet.update({
          where: { id: walletSDA.id },
          data: { 
            balance: blockchainBalance,
            type: "SIDRA" // On s'assure que le type est correct selon ton Enum
          }
        });

        // Création de la Transaction pour l'historique et le graphique
        await tx.transaction.create({
          data: {
            reference: `SDA-${uuidv4().slice(0, 8).toUpperCase()}`,
            amount: difference,
            currency: "SDA",
            type: "DEPOSIT",
            status: "COMPLETED",
            description: "Synchronisation dépôt Sidra Chain",
            toUserId: userId,
            toWalletId: walletSDA.id,
            metadata: {
              method: "auto_sync",
              syncedAt: new Date().toISOString()
            }
          }
        });
      });

      return NextResponse.json({ 
        success: true, 
        message: "Historique mis à jour", 
        added: difference 
      });
    }

    return NextResponse.json({ success: true, message: "Déjà synchronisé" });

  } catch (error: any) {
    console.error("❌ [SIDRA_SYNC_ERROR]:", error);
    return NextResponse.json({ error: "Erreur lors de la synchro" }, { status: 500 });
  }
}
