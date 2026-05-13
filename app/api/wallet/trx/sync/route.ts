export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/trx/sync
 *
 * Synchronise le solde TRX natif de l'utilisateur connecté avec le
 * solde réel sur la blockchain TRON (TronGrid API).
 *
 * - Si la balance on-chain > balance DB  → on crédite la différence
 *   et on crée une transaction DEPOSIT dans l'historique.
 * - Si la balance on-chain <= balance DB → rien (solde déjà à jour).
 * - Anti-spam : 1 sync toutes les 30 secondes maximum.
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
import { getTrxBalance } from "@/lib/blockchain/tron";

export async function POST(req: Request) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // ── 2. Récupérer l'adresse TRON de l'utilisateur ─────────────────────────
    // TRX utilise la même adresse que USDT (usdtAddress)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { usdtAddress: true },
    });

    if (!user?.usdtAddress) {
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "TRX" } },
      });
      return NextResponse.json({
        success: true,
        total: existing?.balance ?? 0,
        added: 0,
        message: "Aucune adresse TRON configurée",
      });
    }

    // ── 3. Fetch du solde on-chain ────────────────────────────────────────────
    let blockchainBalance: number;
    try {
      blockchainBalance = await getTrxBalance(user.usdtAddress);
    } catch (err: any) {
      console.error("[TRX_SYNC] Erreur fetch blockchain:", err.message);
      const existing = await prisma.wallet.findUnique({
        where: { userId_currency: { userId, currency: "TRX" } },
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
          where: { userId_currency: { userId, currency: "TRX" } },
          update: { type: WalletType.CRYPTO },
          create: {
            userId,
            currency: "TRX",
            balance: 0,
            type: WalletType.CRYPTO,
          },
        });

        const currentBalance = wallet.balance;
        const diff = parseFloat(
          (blockchainBalance - currentBalance).toFixed(6)
        );

        // Déjà synchronisé (seuil 0.000001 TRX)
        if (Math.abs(diff) < 0.000001) {
          return { updated: false, total: currentBalance, reason: "ALREADY_SYNC" };
        }

        // Anti-spam : 30 secondes entre deux syncs
        const lastSync = await tx.transaction.findFirst({
          where: {
            toUserId: userId,
            currency: "TRX",
            type: TransactionType.DEPOSIT,
            OR: [
              { description: { contains: "Dépôt TRX" } },
              { description: { contains: "Depot TRX" } },
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

        const reference = `TRX-DEP-${nanoid(10).toUpperCase()}`;

        // Créer une transaction DEPOSIT si le solde a augmenté
        if (diff > 0) {
          await tx.transaction.create({
            data: {
              reference,
              amount: diff,
              currency: "TRX",
              type: TransactionType.DEPOSIT,
              status: TransactionStatus.SUCCESS,
              description: `Dépôt TRX (+${diff.toFixed(6)} TRX)`,
              toUserId: userId,
              toWalletId: updated.id,
              metadata: {
                blockchainBalance,
                previousBalance: currentBalance,
                syncType: "AUTOMATIC_BLOCKCHAIN",
                source: "TRON_MAINNET",
                network: "TRON",
              } as Prisma.JsonObject,
            },
          });

          // Notification push dans l'app
          await tx.notification.create({
            data: {
              userId,
              title: "Dépôt TRX reçu !",
              message: `Vous avez reçu ${diff.toFixed(6)} TRX sur votre wallet PimPay.`,
              type: "SUCCESS",
              read: false,
              metadata: JSON.stringify({
                amount: diff,
                currency: "TRX",
                network: "TRON",
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

    // ── 5. Réponse ────────────────────────────────────────────────────────────
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
      message: result.updated ? "Synchronisation TRX réussie" : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[TRX_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation TRX" },
      { status: 500 }
    );
  }
}
