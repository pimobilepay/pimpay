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
import { getAgentFeeShare } from './fees';
import { creditAgentFloat } from './agent-float-account';

/** Fenetre de confirmation client : 5 minutes. */
export const CONFIRMATION_WINDOW_MS = 5 * 60 * 1000;

/**
 * Part des frais conservee par l'agent, utilisee UNIQUEMENT comme valeur de
 * repli si la configuration admin est injoignable.
 *
 * La valeur effective est pilotee par l'administrateur
 * (Admin > Reglages > Commission agent) et doit etre lue via
 * `getAgentFeeShare()` / `splitAgentFee()` de `lib/fees.ts`.
 */
export const DEFAULT_AGENT_FEE_SHARE = 0.5;

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
  metadata?: unknown;
};

/* ------------------------------------------------------------------ */
/*  RESOLUTION DU TAUX DE COMMISSION                                   */
/* ------------------------------------------------------------------ */

/**
 * Lit la part agent figee dans les metadonnees de la transaction.
 *
 * Chaque transaction agent enregistre `metadata.agentFeeShare` a sa creation.
 * On l'utilise en priorite pour que le reglement, l'historique et les rapports
 * restent exacts meme si l'admin modifie le taux ensuite.
 * Renvoie `null` si la transaction n'a pas de taux fige (transactions creees
 * avant cette version).
 */
export function frozenAgentFeeShareOf(metadata: unknown): number | null {
  let meta: any = metadata;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      return null;
    }
  }
  const share = meta?.agentFeeShare;
  if (typeof share !== 'number' || !Number.isFinite(share) || share < 0 || share > 1) {
    return null;
  }
  return share;
}

/**
 * Part agent applicable a une transaction : taux fige a la creation, sinon
 * taux courant configure par l'admin (Admin > Reglages > Commission agent).
 */
export async function resolveAgentFeeShare(
  transaction: { metadata?: unknown } | null | undefined
): Promise<number> {
  const frozen = frozenAgentFeeShareOf(transaction?.metadata);
  if (frozen !== null) return frozen;
  return getAgentFeeShare();
}

/**
 * Commission agent = part configuree par l'admin appliquee aux frais.
 * `share` provient de `getAgentFeeShare()` (Admin > Reglages).
 */
export function agentCommissionOf(
  fee: number | null | undefined,
  share: number = DEFAULT_AGENT_FEE_SHARE
): number {
  return Math.round((fee ?? 0) * share * 100) / 100;
}

/** Part plateforme = frais totaux moins la commission agent. */
export function platformFeeOf(
  fee: number | null | undefined,
  share: number = DEFAULT_AGENT_FEE_SHARE
): number {
  return Math.round(((fee ?? 0) - agentCommissionOf(fee, share)) * 100) / 100;
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
export function heldAmountOf(
  tx: Pick<PendingTx, 'type' | 'amount' | 'fee'>,
  share: number = DEFAULT_AGENT_FEE_SHARE
): number {
  if (tx.type === 'WITHDRAW') {
    return tx.amount + (tx.fee ?? 0);
  }
  return tx.amount - agentCommissionOf(tx.fee, share);
}

/**
 * Annule la reserve : rend au proprietaire initial le montant bloque.
 * Utilise sur les chemins REJECTED et EXPIRED.
 * `tx` est le client de transaction Prisma interactif.
 */
export async function revertPendingHold(
  tx: any,
  transaction: PendingTx,
  share: number = DEFAULT_AGENT_FEE_SHARE
) {
  const refund = heldAmountOf(transaction, share);
  if (refund <= 0) return;

  if (transaction.type === 'WITHDRAW') {
    // La reserve avait ete prise sur le wallet du CLIENT : on lui rend.
    if (transaction.fromWalletId) {
      await tx.wallet.update({
        where: { id: transaction.fromWalletId },
        data: { balance: { increment: refund } },
      });
    }
    return;
  }

  // DEPOSIT (legacy en attente) : la reserve venait de la CAISSE de l'agent.
  if (transaction.fromUserId) {
    await creditAgentFloat(tx, transaction.fromUserId, refund, transaction.currency);
  }
}

/**
 * Applique le mouvement final apres confirmation du client.
 *  - WITHDRAW : credite le float de l'agent (montant + sa commission).
 *               Le client a deja ete debite a la creation.
 *  - DEPOSIT  : credite le net au client. Le float agent a deja ete debite.
 */
export async function settlePendingHold(
  tx: any,
  transaction: PendingTx,
  share: number = DEFAULT_AGENT_FEE_SHARE
) {
  const walletType = transaction.currency === 'PI' ? WalletType.PI : WalletType.FIAT;

  if (transaction.type === 'WITHDRAW') {
    // CASH-OUT : le produit du retrait (montant + commission agent) alimente la
    // CAISSE de l'agent (AgentFloat), jamais son wallet personnel.
    //
    // C'etait la cause du float non credite : les anciennes transactions
    // pointaient vers un `toWalletId` (wallet perso) qui pouvait etre absent
    // ou dans une autre devise, et le credit etait alors silencieusement perdu.
    const credit = transaction.amount + agentCommissionOf(transaction.fee, share);
    if (transaction.toUserId && credit > 0) {
      await creditAgentFloat(tx, transaction.toUserId, credit, transaction.currency);
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
