// lib/blockchain/credit-deposit.ts
//
// Helper GÉNÉRIQUE pour créditer un dépôt on-chain (BTC, SOL, XRP, XLM,
// USDC, BUSD, DAI, ...). C'est la version multi-chaîne de `creditTronDeposit`.
//
// Logique (atomique, idempotente) :
//   1. Upsert du wallet de la devise
//   2. Calcul du diff on-chain vs DB
//   3. Crédit du solde (Math.max pour préserver les crédits internes P2P/swap)
//   4. Si un dépôt externe réel est détecté (diff >= seuil) :
//        - transaction DEPOSIT (historique user + admin)
//        - notification SUCCESS (in-app)
//      avec anti-spam de 30s pour éviter les doublons.
//   5. Les variations en dessous du seuil (dust) créditent le solde sans
//      polluer l'historique ni notifier.

import { prisma } from "@/lib/prisma";
import {
  TransactionStatus,
  TransactionType,
  WalletType,
  Prisma,
} from "@prisma/client";
import { nanoid } from "nanoid";

export interface CreditDepositResult {
  updated: boolean;
  total: number;
  added: number;
  reference: string | null;
  reason?: "ALREADY_SYNC" | "THROTTLED" | "CREDITED" | "DUST_IGNORED";
}

interface CreditDepositOptions {
  userId: string;
  currency: string;
  blockchainBalance: number;
  /** Réseau lisible (ex: "Solana", "Bitcoin", "BSC (BEP20)"). */
  network: string;
  /** Source technique pour les métadonnées (ex: "SOLANA_MAINNET"). */
  source: string;
  /** Précision d'affichage / arrondi du montant. Défaut: 8. */
  decimals?: number;
  /** Seuil minimum pour enregistrer une transaction + notification. */
  minDeposit?: number;
  /** Métadonnées additionnelles (ex: contractAddress). */
  extraMetadata?: Prisma.JsonObject;
}

export async function creditOnchainDeposit({
  userId,
  currency,
  blockchainBalance,
  network,
  source,
  decimals = 8,
  minDeposit = 0.00000001,
  extraMetadata = {},
}: CreditDepositOptions): Promise<CreditDepositResult> {
  // Seuil "déjà synchronisé" : un cran sous la précision d'affichage
  const syncEpsilon = Math.pow(10, -decimals) / 2;

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
      const diff = parseFloat((blockchainBalance - currentBalance).toFixed(decimals));

      // 3. On préserve les crédits internes (P2P/swap) : on prend le MAX
      const safeBalance = Math.max(blockchainBalance, currentBalance);

      // Rien à faire : solde déjà à jour
      if (Math.abs(safeBalance - currentBalance) < syncEpsilon) {
        return {
          updated: false,
          total: currentBalance,
          added: 0,
          reference: null,
          reason: "ALREADY_SYNC" as const,
        };
      }

      const isRealDeposit = diff >= minDeposit;

      // 3.bis ANTI-DUST : on crédite le solde sans transaction ni notification
      if (diff > 0 && !isRealDeposit) {
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: safeBalance },
        });
        return {
          updated: true,
          total: updatedWallet.balance,
          added: 0,
          reference: null,
          reason: "DUST_IGNORED" as const,
        };
      }

      // 4. Anti-spam 30s
      if (isRealDeposit) {
        const recentDeposit = await tx.transaction.findFirst({
          where: {
            toUserId: userId,
            currency,
            type: TransactionType.DEPOSIT,
            createdAt: { gte: new Date(Date.now() - 30_000) },
          },
        });

        if (recentDeposit) {
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

      // 6. Dépôt externe détecté => transaction + notification
      let reference: string | null = null;
      if (isRealDeposit) {
        reference = `${currency}-DEP-${nanoid(10).toUpperCase()}`;

        await tx.transaction.create({
          data: {
            reference,
            amount: diff,
            currency,
            type: TransactionType.DEPOSIT,
            status: TransactionStatus.SUCCESS,
            description: `Dépôt ${currency} (+${diff.toFixed(decimals)} ${currency})`,
            toUserId: userId,
            toWalletId: updatedWallet.id,
            metadata: {
              blockchainBalance,
              previousBalance: currentBalance,
              syncType: "AUTOMATIC_BLOCKCHAIN",
              source,
              network,
              ...extraMetadata,
            } as Prisma.JsonObject,
          },
        });

        await tx.notification.create({
          data: {
            userId,
            title: `Dépôt ${currency} reçu !`,
            message: `Vous avez reçu ${diff.toFixed(decimals)} ${currency} sur le réseau ${network}.`,
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
              syncType: "AUTOMATIC_BLOCKCHAIN",
              source,
            }),
          },
        });
      }

      return {
        updated: true,
        total: updatedWallet.balance,
        added: isRealDeposit ? diff : 0,
        reference,
        reason: "CREDITED" as const,
      };
    },
    { timeout: 30_000, maxWait: 10_000 }
  );
}
