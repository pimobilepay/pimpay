export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/wallet/sync-all
 *
 * Synchronise tous les soldes crypto de l'utilisateur en une seule requête.
 * Centralise les appels BNB, TRX, USDT pour optimiser les performances
 * et garantir la cohérence des notifications et de l'historique.
 * 
 * Utilise TRONGRID_API_KEY pour les appels TRON (TRX/USDT).
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
import { getBnbBalance } from "@/lib/blockchain/bnb";
import { getTrxBalance, getUsdtBalance, USDT_TRC20_CONTRACT } from "@/lib/blockchain/tron";

interface SyncResult {
  currency: string;
  success: boolean;
  total: number;
  added: number;
  message: string;
  reference?: string;
}

export async function POST() {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // ── 2. Récupérer les adresses de l'utilisateur ───────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        sidraAddress: true,  // Adresse EVM pour BNB
        usdtAddress: true,   // Adresse TRON pour TRX et USDT
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const results: SyncResult[] = [];

    // ── 3. Sync BNB (BSC/EVM) ─────────────────────────────────────────────────
    if (user.sidraAddress) {
      try {
        const bnbBalance = await getBnbBalance(user.sidraAddress);
        const bnbResult = await syncCryptoBalance({
          userId,
          currency: "BNB",
          blockchainBalance: parseFloat(bnbBalance),
          network: "BSC (BEP20)",
          source: "BSC_MAINNET",
          decimals: 8,
        });
        results.push(bnbResult);
      } catch (err: any) {
        console.error("[SYNC_ALL] BNB error:", err.message);
        results.push({
          currency: "BNB",
          success: false,
          total: 0,
          added: 0,
          message: "Erreur lors de la synchronisation BNB",
        });
      }
    } else {
      results.push({
        currency: "BNB",
        success: true,
        total: 0,
        added: 0,
        message: "Aucune adresse BNB configurée",
      });
    }

    // ── 4. Sync TRX (TRON) ────────────────────────────────────────────────────
    if (user.usdtAddress) {
      try {
        const trxBalance = await getTrxBalance(user.usdtAddress);
        const trxResult = await syncCryptoBalance({
          userId,
          currency: "TRX",
          blockchainBalance: trxBalance,
          network: "TRON",
          source: "TRON_MAINNET",
          decimals: 6,
        });
        results.push(trxResult);
      } catch (err: any) {
        console.error("[SYNC_ALL] TRX error:", err.message);
        results.push({
          currency: "TRX",
          success: false,
          total: 0,
          added: 0,
          message: "Erreur lors de la synchronisation TRX",
        });
      }
    } else {
      results.push({
        currency: "TRX",
        success: true,
        total: 0,
        added: 0,
        message: "Aucune adresse TRON configurée",
      });
    }

    // ── 5. Sync USDT (TRC20) ──────────────────────────────────────────────────
    if (user.usdtAddress) {
      try {
        const usdtBalance = await getUsdtBalance(user.usdtAddress);
        const usdtResult = await syncCryptoBalance({
          userId,
          currency: "USDT",
          blockchainBalance: usdtBalance,
          network: "TRC20 (TRON)",
          source: "TRON_MAINNET",
          decimals: 6,
          contractAddress: USDT_TRC20_CONTRACT,
        });
        results.push(usdtResult);
      } catch (err: any) {
        console.error("[SYNC_ALL] USDT error:", err.message);
        results.push({
          currency: "USDT",
          success: false,
          total: 0,
          added: 0,
          message: "Erreur lors de la synchronisation USDT",
        });
      }
    } else {
      results.push({
        currency: "USDT",
        success: true,
        total: 0,
        added: 0,
        message: "Aucune adresse USDT configurée",
      });
    }

    // ── 6. Résumé ─────────────────────────────────────────────────────────────
    const totalAdded = results.reduce((sum, r) => sum + (r.added > 0 ? r.added : 0), 0);
    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        synced: successCount,
        total: results.length,
        totalAdded,
      },
      results,
    });
  } catch (err: any) {
    console.error("[SYNC_ALL_FATAL]:", err);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation des wallets" },
      { status: 500 }
    );
  }
}

/**
 * Fonction centralisée pour synchroniser le solde d'une crypto
 * ✅ FIX: Utilise Math.max() pour préserver les crédits internes (swap, transfert P2P)
 */
async function syncCryptoBalance({
  userId,
  currency,
  blockchainBalance,
  network,
  source,
  decimals,
  contractAddress,
}: {
  userId: string;
  currency: string;
  blockchainBalance: number;
  network: string;
  source: string;
  decimals: number;
  contractAddress?: string;
}): Promise<SyncResult> {
  const threshold = Math.pow(10, -decimals);

  const result = await prisma.$transaction(
    async (tx) => {
      // Upsert du wallet
      const wallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency } },
        update: { type: WalletType.CRYPTO },
        create: {
          userId,
          currency,
          balance: 0,
          type: WalletType.CRYPTO,
        },
      });

      const currentBalance = wallet.balance;
      
      // ✅ FIX: Prendre le MAX entre blockchain et DB pour préserver les crédits internes
      // Les swaps et transferts internes ne sont pas sur la blockchain
      const safeBalance = Math.max(blockchainBalance, currentBalance);
      
      // Calcul du diff: ce qui vient de la blockchain (dépôt externe)
      const depositDiff = blockchainBalance - currentBalance;
      
      // Déjà synchronisé ou solde DB plus élevé (crédit interne)
      if (depositDiff <= threshold) {
        return {
          currency,
          success: true,
          total: currentBalance,
          added: 0,
          message: currentBalance > blockchainBalance 
            ? "Solde interne préservé (crédit swap/P2P)" 
            : "Solde déjà à jour",
        };
      }

      // Anti-spam : 30 secondes entre deux syncs pour cette devise
      const lastSync = await tx.transaction.findFirst({
        where: {
          toUserId: userId,
          currency,
          type: TransactionType.DEPOSIT,
          createdAt: { gte: new Date(Date.now() - 30_000) },
        },
      });

      if (lastSync) {
        return {
          currency,
          success: true,
          total: currentBalance,
          added: 0,
          message: "Synchronisation récente, veuillez patienter",
        };
      }

      // Mettre à jour le solde avec le MAX (préserve les crédits internes)
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: safeBalance },
      });

      const reference = `${currency}-DEP-${nanoid(10).toUpperCase()}`;

      // Créer une transaction DEPOSIT uniquement si dépôt blockchain détecté
      if (depositDiff > 0) {
        await tx.transaction.create({
          data: {
            reference,
            amount: depositDiff,
            currency,
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.SUCCESS,
            description: `Dépôt ${currency} (+${depositDiff.toFixed(decimals)} ${currency})`,
            toUserId: userId,
            toWalletId: updated.id,
            metadata: {
              blockchainBalance,
              previousBalance: currentBalance,
              syncType: "AUTOMATIC_BLOCKCHAIN",
              source,
              network,
              ...(contractAddress && { contractAddress }),
            } as Prisma.JsonObject,
          },
        });

        // Notification push dans l'app
        await tx.notification.create({
          data: {
            userId,
            title: `Dépôt ${currency} reçu !`,
            message: `Vous avez reçu ${depositDiff.toFixed(decimals)} ${currency} sur votre wallet PIMOBIPAY.`,
            type: "SUCCESS",
            read: false,
            metadata: JSON.stringify({
              amount: depositDiff,
              currency,
              network,
              reference,
              status: "SUCCESS",
              previousBalance: currentBalance,
              newBalance: safeBalance,
            }),
          },
        });
      }

      return {
        currency,
        success: true,
        total: updated.balance,
        added: depositDiff > 0 ? depositDiff : 0,
        message: depositDiff > 0 ? `Synchronisation réussie (+${depositDiff.toFixed(decimals)} ${currency})` : "Solde mis à jour",
        reference: depositDiff > 0 ? reference : undefined,
      };
    },
    { timeout: 30_000, maxWait: 10_000 }
  );

  return result;
}
