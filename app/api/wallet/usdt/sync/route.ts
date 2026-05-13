export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/usdt/sync
 *
 * Synchronise le solde USDT (TRC20) de l'utilisateur connecté avec le
 * solde réel sur la blockchain TRON (TronGrid API).
 *
 * - Si la balance on-chain > balance DB  → on crédite la différence
 *   et on crée une transaction DEPOSIT dans l'historique.
 * - Si la balance on-chain <= balance DB → rien (solde déjà à jour).
 * - Anti-spam : 1 sync toutes les 30 secondes maximum.
 * 
 * Utilise la librairie centralisée lib/blockchain/tron.ts avec TRONGRID_API_KEY
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import {
  TransactionStatus,
  TransactionType,
  WalletType,
  Prisma,
} from "@prisma/client";
import { nanoid } from "nanoid";
import { getUsdtBalance, getUsdtIncomingTransactions, USDT_TRC20_CONTRACT } from "@/lib/blockchain/tron";

export async function POST(req: Request) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // ── 2. Récupérer l'adresse USDT de l'utilisateur ─────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { usdtAddress: true },
    });

    if (!user?.usdtAddress) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "USDT" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Aucune adresse USDT configurée",
      });
    }

    // ── 3. Fetch du solde on-chain via la librairie centralisée ───────────────
    let blockchainBalance: number;
    try {
      blockchainBalance = await getUsdtBalance(user.usdtAddress);
    } catch (err: any) {
      console.error("[USDT_SYNC] Erreur fetch blockchain:", err.message);
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "USDT" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "TronGrid indisponible, réessayez plus tard",
      });
    }

    // ── 4. Mise à jour atomique en DB ─────────────────────────────────────────
    const result = await prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId_currency: { userId, currency: "USDT" } },
          update: { type: WalletType.CRYPTO },
          create: {
            userId,
            currency: "USDT",
            balance: 0,
            type: WalletType.CRYPTO,
          },
        });

        const currentBalance = wallet.balance;
        const diff = parseFloat(
          (blockchainBalance - currentBalance).toFixed(6)
        );

        // Déjà synchronisé (seuil 0.000001 USDT)
        if (Math.abs(diff) < 0.000001) {
          return { updated: false, total: currentBalance, reason: "ALREADY_SYNC" };
        }

        // Anti-spam : 30 secondes entre deux syncs
        const lastSync = await tx.transaction.findFirst({
          where: {
            toUserId: userId,
            currency: "USDT",
            type: TransactionType.DEPOSIT,
            OR: [
              { description: { contains: "TRC20" } },
              { description: { contains: "USDT" } },
              { description: { contains: "Synchronisation" } },
            ],
            createdAt: { gte: new Date(Date.now() - 30_000) },
          },
        });

        if (lastSync) {
          return { updated: false, total: currentBalance, reason: "THROTTLED" };
        }

        // Mettre à jour le solde
        const updated = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: blockchainBalance },
        });

        const reference = `USDT-DEP-${nanoid(10).toUpperCase()}`;

        // Créer une transaction DEPOSIT si le solde a augmenté
        if (diff > 0) {
          await tx.transaction.create({
            data: {
              reference,
              amount: diff,
              currency: "USDT",
              type: TransactionType.DEPOSIT,
              status: TransactionStatus.SUCCESS,
              description: `Dépôt USDT TRC20 (+${diff.toFixed(6)} USDT)`,
              toUserId: userId,
              toWalletId: updated.id,
              metadata: {
                blockchainBalance,
                previousBalance: currentBalance,
                syncType: "AUTOMATIC_BLOCKCHAIN",
                source: "TRON_MAINNET",
                network: "TRC20 (TRON)",
                contractAddress: USDT_TRC20_CONTRACT,
              } as Prisma.JsonObject,
            },
          });

          // Notification push dans l'app
          await tx.notification.create({
            data: {
              userId,
              title: "Dépôt USDT reçu !",
              message: `Vous avez reçu ${diff.toFixed(6)} USDT (TRC20) sur votre wallet PimPay.`,
              type: "SUCCESS",
              read: false,
              metadata: JSON.stringify({
                amount: diff,
                currency: "USDT",
                network: "TRC20 (TRON)",
                reference,
                status: "SUCCESS",
                previousBalance: currentBalance,
                newBalance: blockchainBalance,
              }),
            },
          });
        }

        return {
          updated: true,
          total: updated.balance,
          added: diff,
          reference: diff > 0 ? reference : null,
        };
      },
      { timeout: 30_000, maxWait: 10_000 }
    );

    // ── 5. Synchroniser les transactions blockchain manquantes ────────────────
    // Cette étape récupère les transactions entrantes de la blockchain et crée
    // les entrées d'historique manquantes (pour les dépôts non détectés)
    let importedTxCount = 0;
    try {
      const blockchainTxs = await getUsdtIncomingTransactions(user.usdtAddress, 20);
      
      for (const bcTx of blockchainTxs) {
        // Vérifier si cette transaction existe déjà dans la DB
        const existingTx = await prisma.transaction.findFirst({
          where: {
            OR: [
              { blockchainTx: bcTx.hash },
              { externalId: bcTx.hash },
            ],
          },
        });
        
        if (!existingTx && bcTx.amount > 0) {
          // Créer l'entrée manquante
          const reference = `USDT-BC-${nanoid(8).toUpperCase()}`;
          await prisma.transaction.create({
            data: {
              reference,
              externalId: bcTx.hash,
              blockchainTx: bcTx.hash,
              amount: bcTx.amount,
              currency: "USDT",
              type: TransactionType.DEPOSIT,
              status: TransactionStatus.SUCCESS,
              description: `Dépôt USDT TRC20 (import blockchain)`,
              toUserId: userId,
              createdAt: new Date(bcTx.timestamp),
              metadata: {
                importedFromBlockchain: true,
                fromAddress: bcTx.from,
                toAddress: bcTx.to,
                network: "TRC20 (TRON)",
                contractAddress: USDT_TRC20_CONTRACT,
              } as Prisma.JsonObject,
            },
          });
          importedTxCount++;
          console.log(`[USDT_SYNC] Imported blockchain tx: ${bcTx.hash} (${bcTx.amount} USDT)`);
        }
      }
    } catch (err: any) {
      console.warn("[USDT_SYNC] Failed to import blockchain transactions:", err.message);
    }

    // ── 6. Réponse ────────────────────────────────────────────────────────────
    if (!result.updated && result.reason === "THROTTLED") {
      return NextResponse.json(
        { error: "Veuillez patienter 30s avant une nouvelle synchronisation" },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.updated ? result.added : 0,
      importedTxCount,
      message: result.updated 
        ? `Synchronisation USDT réussie${importedTxCount > 0 ? ` (+${importedTxCount} transactions importées)` : ""}`
        : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[USDT_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation USDT" },
      { status: 500 }
    );
  }
}
