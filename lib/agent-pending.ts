/**
 * HELPERS PARTAGES POUR LES TRANSACTIONS AGENT EN ATTENTE DE CONFIRMATION
 *
 * REGLE METIER (corrigee) :
 *  - CASH-IN (DEPOSIT)  : argent qui ENTRE sur le compte du client.
 *                         Le client n'a rien a confirmer, le credit est immediat.
 *  - CASH-OUT (WITHDRAW): argent qui SORT du compte du client.
 *                         Le client DOIT confirmer (PIN / 2FA) avant que
 *                         l'agent ne recoive les fonds.
 *
 * Pour un retrait en attente, le montant total (montant + frais) est mis en
 * reserve immediatement sur le wallet du client afin d'eviter toute double
 * depense pendant la fenetre de confirmation. Il est rendu au client si la
 * transaction est refusee ou expiree.
 */

import { WalletType } from '@prisma/client';

/** Fenetre de confirmation client : 5 minutes. */
export const CONFIRMATION_WINDOW_MS = 5 * 60 * 1000;

/** Part des frais conservee par l'agent (le reste va a la plateforme). */
export const AGENT_FEE_SHARE = 0.5;

type PendingTx = {
  id: string;
  type: string;
  amount: number;
  fee: number | null;
  netAmount: number | null;
  currency: string;
  fromUserId: string | null;
  toUserId: string | null;
  fromWalletId: string | null;
  toWalletId: string | null;
};

/** Commission agent = 50% des frais. */
export function agentCommissionOf(fee: number | null | undefined): number {
  return (fee ?? 0) * AGENT_FEE_SHARE;
}

/** Part plateforme = 50% des frais. */
export function platformFeeOf(fee: number | null | undefined): number {
  return (fee ?? 0) * (1 - AGENT_FEE_SHARE);
}

/**
 * Utilisateur autorise a confirmer / refuser la transaction.
 *  - WITHDRAW : c'est le client qui est debite -> fromUserId
 *  - DEPOSIT  : (legacy) c'est le client qui est credite -> toUserId
 */
export function getConfirmerUserId(tx: Pick<PendingTx, 'type' | 'fromUserId' | 'toUserId'>) {
  return tx.type === 'WITHDRAW' ? tx.fromUserId : tx.toUserId;
}

/** Contrepartie (l'agent) de la transaction. */
export function getAgentUserId(tx: Pick<PendingTx, 'type' | 'fromUserId' | 'toUserId'>) {
  return tx.type === 'WITHDRAW' ? tx.toUserId : tx.fromUserId;
}

/**
 * Montant reellement mis en reserve a la creation de la transaction.
 *  - WITHDRAW : montant + frais preleves sur le client
 *  - DEPOSIT  : montant - commission agent preleve sur le float agent
 */
export function heldAmountOf(tx: Pick<PendingTx, 'type' | 'amount' | 'fee'>): number {
  if (tx.type === 'WITHDRAW') {
    return tx.amount + (tx.fee ?? 0);
  }
  return tx.amount - agentCommissionOf(tx.fee);
}

/**
 * Annule la reserve : rend au proprietaire initial le montant bloque.
 * Utilise sur les chemins REJECTED et EXPIRED.
 * `tx` est le client de transaction Prisma interactif.
 */
export async function revertPendingHold(tx: any, transaction: PendingTx) {
  const refund = heldAmountOf(transaction);
  if (refund <= 0 || !transaction.fromWalletId) return;

  await tx.wallet.update({
    where: { id: transaction.fromWalletId },
    data: { balance: { increment: refund } },
  });
}

/**
 * Applique le mouvement final apres confirmation du client.
 *  - WITHDRAW : credite le float de l'agent (montant + sa commission).
 *               Le client a deja ete debite a la creation.
 *  - DEPOSIT  : credite le net au client. Le float agent a deja ete debite.
 */
export async function settlePendingHold(tx: any, transaction: PendingTx) {
  const walletType = transaction.currency === 'PI' ? WalletType.PI : WalletType.FIAT;

  if (transaction.type === 'WITHDRAW') {
    const credit = transaction.amount + agentCommissionOf(transaction.fee);
    if (transaction.toWalletId) {
      await tx.wallet.update({
        where: { id: transaction.toWalletId },
        data: { balance: { increment: credit } },
      });
    } else if (transaction.toUserId) {
      await tx.wallet.upsert({
        where: { userId_currency: { userId: transaction.toUserId, currency: transaction.currency } },
        update: { balance: { increment: credit } },
        create: {
          userId: transaction.toUserId,
          currency: transaction.currency,
          balance: credit,
          type: walletType,
        },
      });
    }
    return;
  }

  const credit = transaction.netAmount ?? 0;
  if (transaction.toWalletId) {
    await tx.wallet.update({
      where: { id: transaction.toWalletId },
      data: { balance: { increment: credit } },
    });
  } else if (transaction.toUserId) {
    await tx.wallet.upsert({
      where: { userId_currency: { userId: transaction.toUserId, currency: transaction.currency } },
      update: { balance: { increment: credit } },
      create: {
        userId: transaction.toUserId,
        currency: transaction.currency,
        balance: credit,
        type: walletType,
      },
    });
  }
}

/**
 * Marque comme lues les notifications TRANSACTION_CONFIRM liees a une
 * transaction donnee. Corrige le bug ou la demande de confirmation restait
 * affichee (toast + page notifications) apres validation par le client.
 *
 * Le filtrage se fait en memoire car `metadata` est un champ JSON et les
 * relances peuvent creer plusieurs notifications pour la meme transaction.
 */
export async function clearConfirmNotifications(
  db: any,
  userId: string | null | undefined,
  transactionId: string
) {
  if (!userId) return;

  const notifs = await db.notification.findMany({
    where: { userId, type: 'TRANSACTION_CONFIRM', read: false },
    select: { id: true, metadata: true },
    take: 100,
  });

  const ids = notifs
    .filter((n: { metadata: unknown }) => {
      let meta: any = n.metadata;
      if (typeof meta === 'string') {
        try {
          meta = JSON.parse(meta);
        } catch {
          return false;
        }
      }
      return meta?.transactionId === transactionId;
    })
    .map((n: { id: string }) => n.id);

  if (ids.length === 0) return;

  await db.notification.updateMany({
    where: { id: { in: ids } },
    data: { read: true },
  });
}
