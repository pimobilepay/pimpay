export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";
import { nanoid } from 'nanoid';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!token || !JWT_SECRET) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    // Lecture sécurisée du body
    const body = await req.json().catch(() => ({}));
    const { realBlockchainBalance } = body;

    // Validation stricte
    if (realBlockchainBalance === undefined || realBlockchainBalance === null) {
      return NextResponse.json({ error: "Solde blockchain manquant" }, { status: 400 });
    }

    const balanceFloat = parseFloat(realBlockchainBalance);

    // --- TRANSACTION ATOMIQUE SÉCURISÉE ---
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Récupération ou Création manuelle du Wallet (Plus stable que upsert)
      let walletSDA = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: "SDA" } }
      });

      if (!walletSDA) {
        walletSDA = await tx.wallet.create({
          data: {
            userId,
            currency: "SDA",
            balance: 0,
            type: WalletType.SIDRA
          }
        });
      }

      // 2. Calcul de la différence
      const difference = balanceFloat - walletSDA.balance;

      // 3. Si le solde est déjà à jour ou inférieur, on s'arrête
      if (difference <= 0.000001) {
        return { updated: false, currentBalance: walletSDA.balance };
      }

      // 4. Anti-spam (5 minutes)
      const recentSync = await tx.transaction.findFirst({
        where: {
          toUserId: userId,
          currency: "SDA",
          type: TransactionType.DEPOSIT,
          description: "Synchronisation Sidra Chain",
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
        }
      });

      if (recentSync) {
        throw new Error("Veuillez attendre 5 minutes");
      }

      // 5. Mise à jour solde
      const updatedWallet = await tx.wallet.update({
        where: { id: walletSDA.id },
        data: { balance: { increment: difference } }
      });

      // 6. Création du log
      await tx.transaction.create({
        data: {
          reference: `SDA-SYNC-${nanoid(8).toUpperCase()}`,
          amount: difference,
          currency: "SDA",
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.SUCCESS,
          description: "Synchronisation Sidra Chain",
          toUserId: userId,
          toWalletId: updatedWallet.id,
          metadata: {
            blockchainBalance: balanceFloat,
            syncedAt: new Date().toISOString()
          }
        }
      });

      return { updated: true, added: difference, newBalance: updatedWallet.balance };
    }, {
      timeout: 15000
    });

    if (!result.updated) {
      return NextResponse.json({ success: true, message: "Déjà à jour", total: result.currentBalance });
    }

    return NextResponse.json({ 
      success: true, 
      added: result.added, 
      total: result.newBalance 
    });

  } catch (error: any) {
    console.error("❌ [SIDRA_SYNC_ERROR]:", error.message);
    const isWaitError = error.message.includes("attendre");
    return NextResponse.json(
      { error: error.message }, 
      { status: isWaitError ? 429 : 400 }
    );
  }
}
