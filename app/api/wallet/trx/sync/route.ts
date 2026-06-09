export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/trx/sync
 *
 * Synchronise le solde TRX natif de l'utilisateur connecté avec le
 * solde réel sur la blockchain TRON (TronGrid API).
 *
 * - Si la balance on-chain > balance DB  → on crédite la différence,
 *   on crée une transaction DEPOSIT (historique user + admin) et une
 *   notification SUCCESS (in-app).
 * - Si la balance on-chain <= balance DB → rien (solde déjà à jour).
 * - On importe également les transactions blockchain individuelles
 *   manquantes pour un historique complet.
 * - Anti-spam : 1 dépôt enregistré toutes les 30 secondes maximum.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import {
  TransactionStatus,
  TransactionType,
  Prisma,
} from "@prisma/client";
import { nanoid } from "nanoid";
import { getTrxBalance, getTrxIncomingTransactions } from "@/lib/blockchain/tron";
import { creditTronDeposit } from "@/lib/blockchain/tron-credit";

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

    // ── 4. Crédit + transaction + notification via le helper centralisé ───────
    const result = await creditTronDeposit({
      userId,
      currency: "TRX",
      blockchainBalance,
    });

    // ── 5. Importer les transactions blockchain manquantes (historique) ───────
    // Seuil anti-dust : on ignore les micro-transactions (< 0.001 TRX) qui
    // polluent l'historique (+0.000001 TRX, etc.).
    const MIN_TRX_TX = 0.001;
    let importedTxCount = 0;
    try {
      const blockchainTxs = await getTrxIncomingTransactions(user.usdtAddress, 20);

      for (const bcTx of blockchainTxs) {
        if (!bcTx.confirmed || bcTx.amount < MIN_TRX_TX) continue;

        const existingTx = await prisma.transaction.findFirst({
          where: {
            OR: [{ blockchainTx: bcTx.hash }, { externalId: bcTx.hash }],
          },
        });

        if (!existingTx) {
          const reference = `TRX-BC-${nanoid(8).toUpperCase()}`;
          await prisma.transaction.create({
            data: {
              reference,
              externalId: bcTx.hash,
              blockchainTx: bcTx.hash,
              amount: bcTx.amount,
              currency: "TRX",
              type: TransactionType.DEPOSIT,
              status: TransactionStatus.SUCCESS,
              description: `Dépôt TRX (import blockchain)`,
              toUserId: userId,
              createdAt: new Date(bcTx.timestamp),
              metadata: {
                importedFromBlockchain: true,
                fromAddress: bcTx.from,
                toAddress: bcTx.to,
                network: "TRON",
              } as Prisma.JsonObject,
            },
          });
          importedTxCount++;
          console.log(`[TRX_SYNC] Imported blockchain tx: ${bcTx.hash} (${bcTx.amount} TRX)`);
        }
      }
    } catch (err: any) {
      console.warn("[TRX_SYNC] Failed to import blockchain transactions:", err.message);
    }

    // ── 6. Réponse ────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      total: result.total,
      added: result.added,
      reference: result.reference,
      importedTxCount,
      message: result.added > 0
        ? `Synchronisation TRX réussie (+${result.added.toFixed(6)} TRX)`
        : importedTxCount > 0
          ? `${importedTxCount} transaction(s) importée(s)`
          : "Solde déjà à jour",
    });
  } catch (err: any) {
    console.error("[TRX_SYNC_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation TRX" },
      { status: 500 }
    );
  }
}
