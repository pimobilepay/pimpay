/**
 * PIMPAY - Helper centralisé pour créditer un dépôt TRON (TRX natif ou USDT TRC20)
 *
 * PROBLÈME résolu :
 * Auparavant, /api/wallet/balance mettait à jour le solde TRX/USDT en silence
 * (Math.max on-chain/DB) SANS créer de transaction ni de notification.
 * Résultat : le solde augmentait mais le dépôt n'apparaissait NI dans
 * l'historique (user + admin), NI dans les notifications.
 *
 * Ce helper centralise la logique de crédit :
 *  1. Upsert du wallet
 *  2. Calcul du diff on-chain vs DB
 *  3. Crédit du solde (Math.max pour préserver les crédits internes P2P)
 *  4. Si un dépôt externe est détecté (diff > 0) :
 *       - création d'une transaction DEPOSIT (historique user + admin)
 *       - création d'une notification SUCCESS (in-app)
 *     avec un anti-spam de 30s pour éviter les doublons.
 *
 * Utilisé par :
 *  - /api/wallet/balance (sync passive à chaque ouverture du wallet)
 *  - /api/wallet/trx/sync (sync manuelle TRX)
 *  - /api/wallet/usdt/sync (sync manuelle USDT)
 */

import { prisma } from "@/lib/prisma";
import {
  TransactionStatus,
  TransactionType,
  WalletType,
  Prisma,
} from "@prisma/client";
import { nanoid } from "nanoid";
import { USDT_TRC20_CONTRACT } from "@/lib/blockchain/tron";

export interface CreditTronResult {
  updated: boolean;
  total: number;
  added: number;
  reference: string | null;
  reason?: "ALREADY_SYNC" | "THROTTLED" | "CREDITED";
}

interface CreditTronOptions {
  userId: string;
  currency: "TRX" | "USDT";
  blockchainBalance: number;
}

/**
 * Crédite un dépôt TRON et enregistre transaction + notification.
 * Atomique (prisma.$transaction). Idempotent grâce à l'anti-spam 30s.
 */
export async function creditTronDeposit({
  userId,
  currency,
  blockchainBalance,
}: CreditTronOptions): Promise<CreditTronResult> {
  return prisma.$transaction(
    async (tx) => {
      // 1. Upsert wallet
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

      // 2. diff = nouveaux fonds arrivés on-chain
      const diff = parseFloat((blockchainBalance - currentBalance).toFixed(6));

      // 3. On préserve les crédits internes (P2P/swap) : on prend le MAX
      const safeBalance = Math.max(blockchainBalance, currentBalance);

      // Rien à faire : solde déjà à jour (seuil 0.000001)
      if (Math.abs(safeBalance - currentBalance) < 0.000001) {
        return {
          updated: false,
          total: currentBalance,
          added: 0,
          reference: null,
          reason: "ALREADY_SYNC" as const,
        };
      }

      // 4. Anti-spam 30s : on vérifie qu'aucun dépôt de cette devise
      //    n'a été enregistré dans les 30 dernières secondes.
      if (diff > 0) {
        const recentDeposit = await tx.transaction.findFirst({
          where: {
            toUserId: userId,
            currency,
            type: TransactionType.DEPOSIT,
            createdAt: { gte: new Date(Date.now() - 30_000) },
          },
        });

        if (recentDeposit) {
          // On met quand même le solde à jour (sécurité) mais sans dupliquer la tx
          const updatedWallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: safeBalance },
          });
          return {
            updated: true,
            total: updatedWallet.balance,
            added: 0,
            reference: null,
            reason: "THROTTLED" as const,
          };
        }
      }

      // 5. Mise à jour du solde
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: safeBalance },
      });

      // 6. Si dépôt externe détecté → transaction + notification
      let reference: string | null = null;
      if (diff > 0) {
        const isTrx = currency === "TRX";
        reference = `${currency}-DEP-${nanoid(10).toUpperCase()}`;

        const network = isTrx ? "TRON" : "TRC20 (TRON)";
        const label = isTrx ? "TRX" : "USDT (TRC20)";

        await tx.transaction.create({
          data: {
            reference,
            amount: diff,
            currency,
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.SUCCESS,
            description: isTrx
              ? `Dépôt TRX (+${diff.toFixed(6)} TRX)`
              : `Dépôt USDT TRC20 (+${diff.toFixed(6)} USDT)`,
            toUserId: userId,
            toWalletId: updatedWallet.id,
            metadata: {
              blockchainBalance,
              previousBalance: currentBalance,
              syncType: "AUTOMATIC_BLOCKCHAIN",
              source: "TRON_MAINNET",
              network,
              ...(isTrx ? {} : { contractAddress: USDT_TRC20_CONTRACT }),
            } as Prisma.JsonObject,
          },
        });

        await tx.notification.create({
          data: {
            userId,
            title: isTrx ? "Dépôt TRX reçu !" : "Dépôt USDT reçu !",
            message: `Vous avez reçu ${diff.toFixed(6)} ${label} sur votre wallet PimPay.`,
            type: "SUCCESS",
            read: false,
            metadata: JSON.stringify({
              amount: diff,
              currency,
              network,
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
        total: updatedWallet.balance,
        added: diff > 0 ? diff : 0,
        reference,
        reason: "CREDITED" as const,
      };
    },
    { timeout: 30_000, maxWait: 10_000 }
  );
}
