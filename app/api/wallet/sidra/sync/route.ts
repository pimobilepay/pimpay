export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { v4 as uuidv4 } from 'uuid';
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    const JWT_SECRET = process.env.JWT_SECRET;

    // 1. AUTHENTIFICATION SÉCURISÉE
    if (!token || !JWT_SECRET) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    // 2. RÉCUPÉRATION DES DONNÉES ENTRANTES (Plus robuste)
    const body = await req.json().catch(() => ({}));
    const { realBlockchainBalance } = body;

    // Vérification stricte car 0 est une valeur valide
    if (realBlockchainBalance === undefined || realBlockchainBalance === null) {
      return NextResponse.json({ error: "Aucun solde blockchain fourni" }, { status: 400 });
    }

    // 3. RÉCUPÉRATION OU CRÉATION DU WALLET (Blindage post-cleanup)
    const walletSDA = await prisma.wallet.upsert({
      where: { userId_currency: { userId, currency: "SDA" } },
      update: {}, // On ne change rien si il existe
      create: {
        userId,
        currency: "SDA",
        balance: 0,
        type: WalletType.SIDRA
      }
    });

    // 4. CALCUL DE LA DIFFÉRENCE
    const difference = parseFloat(realBlockchainBalance) - walletSDA.balance;

    // On ne synchronise que si le gain est positif et significatif
    if (difference > 0.000001) {
      const result = await prisma.$transaction(async (tx) => {
        
        // Anti-spam simplifié : On cherche par description/type au lieu du JSON path complexe
        const recentSync = await tx.transaction.findFirst({
          where: {
            toUserId: userId,
            currency: "SDA",
            type: TransactionType.DEPOSIT,
            description: "Synchronisation Sidra Chain",
            createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes
          }
        });

        if (recentSync) {
          throw new Error("Veuillez attendre 5 minutes entre deux synchronisations");
        }

        // Mise à jour du solde Wallet
        const updatedWallet = await tx.wallet.update({
          where: { id: walletSDA.id },
          data: { balance: { increment: difference } }
        });

        // Création du log de transaction
        const newTx = await tx.transaction.create({
          data: {
            reference: `SDA-SYNC-${uuidv4().slice(0, 8).toUpperCase()}`,
            amount: difference,
            currency: "SDA",
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.SUCCESS,
            description: "Synchronisation Sidra Chain",
            toUserId: userId,
            toWalletId: updatedWallet.id,
            metadata: { 
              method: "auto_sync", 
              syncedAt: new Date().toISOString(),
              blockchainBalance: realBlockchainBalance 
            }
          }
        });

        return { difference, newBalance: updatedWallet.balance };
      });

      return NextResponse.json({ success: true, added: result.difference, total: result.newBalance });
    }

    return NextResponse.json({ success: true, message: "Le solde est déjà à jour" });

  } catch (error: any) {
    console.error("❌ [SIDRA_SYNC_ERROR]:", error.message);
    // On renvoie un message clair à l'utilisateur
    return NextResponse.json({ error: error.message || "Erreur synchro" }, { status: error.message.includes("attendre") ? 429 : 500 });
  }
}
