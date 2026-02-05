export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // --- LE VACCIN HYBRIDE ---
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    
    let userId: string | null = null;

    if (piToken) {
      userId = piToken;
    } else if (classicToken) {
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jwtVerify(classicToken, secretKey);
        userId = payload.id as string;
      } catch (e) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 1. Récupérer le Wallet SIDRA de l'utilisateur
    const walletSDA = await prisma.wallet.findUnique({
      where: {
        userId_currency: {
          userId: userId,
          currency: "SDA"
        }
      }
    });

    if (!walletSDA) {
      return NextResponse.json({ error: "Wallet Sidra non trouvé" }, { status: 404 });
    }

    // 2. Simulation de la balance blockchain (On garde tes 1.06 SDA pour le test)
    // Plus tard, on pourra injecter ici le résultat d'un fetch vers le RPC Sidra
    const blockchainBalance = 1.06;
    const difference = blockchainBalance - walletSDA.balance;

    // 3. Si un nouveau dépôt est détecté (différence > 0)
    if (difference > 0) {
      await prisma.$transaction(async (tx) => {
        // Mise à jour du solde
        await tx.wallet.update({
          where: { id: walletSDA.id },
          data: {
            balance: blockchainBalance,
            type: "SIDRA"
          }
        });

        // Création de la Transaction pour l'historique de PimPay
        await tx.transaction.create({
          data: {
            reference: `SDA-${uuidv4().slice(0, 8).toUpperCase()}`,
            amount: difference,
            currency: "SDA",
            type: "DEPOSIT",
            status: "SUCCESS", // Aligné avec ton Enum TransactionStatus
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
    console.error("❌ [SIDRA_SYNC_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur lors de la synchro" }, { status: 500 });
  }
}
