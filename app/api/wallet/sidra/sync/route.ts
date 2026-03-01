export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { TransactionStatus, TransactionType, WalletType, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";

/**
 * Lit le corps de la requête de manière ultra-robuste
 */
async function parseRequestBalance(req: Request): Promise<number | null> {
  try {
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      const body = await req.json();
      return body?.realBlockchainBalance ?? null;
    }
    
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const val = formData.get("realBlockchainBalance");
      return val ? parseFloat(String(val).replace(",", ".")) : null;
    }

    const text = await req.text();
    if (!text) return null;
    const fallbackBody = JSON.parse(text);
    return fallbackBody?.realBlockchainBalance ?? null;
  } catch (err) {
    console.error("Critical Parsing Error:", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    // 1. AUTHENTIFICATION (Version Next.js 15 compatible)
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    
    // Support des deux formats de payload possibles
    const userId = (payload.id || payload.userId) as string;

    if (!userId) {
      return NextResponse.json({ error: "Utilisateur non identifié" }, { status: 401 });
    }

    // 2. LECTURE DU SOLDE
    const blockchainBalance = await parseRequestBalance(req);

    if (blockchainBalance === null || isNaN(blockchainBalance)) {
      return NextResponse.json({ error: "Donnée 'realBlockchainBalance' invalide" }, { status: 400 });
    }

    // 3. TRANSACTION ATOMIQUE AVEC TIMEOUT ÉTENDU (Crucial pour la prod)
    const result = await prisma.$transaction(async (tx) => {
      // Upsert est plus performant en ligne qu'un findUnique + create
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "SDA" } },
        update: { type: WalletType.SIDRA },
        create: {
          userId,
          currency: "SDA",
          balance: 0,
          type: WalletType.SIDRA
        }
      });

      const currentBalance = wallet.balance;
      const diff = Number((blockchainBalance - currentBalance).toFixed(8));

      // Vérification si déjà à jour (seuil de tolérance)
      if (Math.abs(diff) < 0.00000001) {
        return { updated: false, total: currentBalance, reason: "ALREADY_SYNC" };
      }

      // Anti-spam (30 secondes)
      const lastTx = await tx.transaction.findFirst({
        where: {
          toUserId: userId,
          toWalletId: wallet.id,
          currency: "SDA",
          type: TransactionType.DEPOSIT,
          createdAt: { gte: new Date(Date.now() - 30 * 1000) }
        }
      });
      
      if (lastTx) return { updated: false, total: currentBalance, reason: "THROTTLED" };

      // Mise à jour du Wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: blockchainBalance }
      });

      // Création du log de transaction (Statut SUCCESS conforme à ton nettoyage)
      await tx.transaction.create({
        data: {
          reference: `SDA-SYNC-${nanoid(10).toUpperCase()}`,
          amount: Math.abs(diff),
          currency: "SDA",
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.SUCCESS,
          description: `Synchronisation Sidra Chain (${diff > 0 ? '+' : ''}${diff})`,
          toUserId: userId,
          toWalletId: updatedWallet.id,
          metadata: {
            blockchainBalance,
            previousBalance: currentBalance,
            syncType: "AUTOMATIC_BLOCKCHAIN"
          } as Prisma.JsonObject
        }
      });

      return { updated: true, total: updatedWallet.balance, added: diff };
    }, { 
      timeout: 30000,
      maxWait: 10000 
    });

    if (!result.updated && result.reason === "THROTTLED") {
      return NextResponse.json({ error: "Veuillez patienter 30s" }, { status: 429 });
    }

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.updated ? result.added : 0,
      message: result.updated ? "Synchronisation réussie" : "Solde déjà à jour"
    });

  } catch (error: any) {
    console.error("❌ FATAL_SYNC_ERROR:", error);
    return NextResponse.json({ 
      error: "Erreur lors de la synchronisation",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
