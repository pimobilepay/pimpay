export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyTotp } from '@/lib/totp';
import { autoConvertFeeToPi } from '@/lib/auto-fee-conversion';
import {
  CONFIRMATION_WINDOW_MS,
  agentCommissionOf,
  platformFeeOf,
  clearConfirmNotifications,
  getAgentUserId,
  getConfirmerUserId,
  heldAmountOf,
  revertPendingHold,
  settlePendingHold,
} from '@/lib/agent-pending';

/**
 * POST /api/transaction/confirm
 * Confirme ou refuse une transaction en attente (MFA).
 *
 * Le confirmateur legitime depend du type :
 *  - WITHDRAW (retrait agent, sortant)  -> fromUserId (le client debite)
 *  - DEPOSIT  (legacy, entrant)         -> toUserId
 *
 * Dans tous les cas (confirmation, refus, expiration) les notifications
 * TRANSACTION_CONFIRM liees a la transaction sont marquees comme lues afin
 * qu'aucune demande fantome ne reste affichee cote client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionId, userId, pin, code, method, action } = body;

    if (!transactionId || !userId) {
      return NextResponse.json(
        { error: "Donnees manquantes" },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction introuvable" },
        { status: 404 }
      );
    }

    const confirmerId = getConfirmerUserId(transaction);
    const agentId = getAgentUserId(transaction);
    const isWithdraw = transaction.type === 'WITHDRAW';
    const label = isWithdraw ? 'retrait' : 'depot';

    // Seul le titulaire du compte impacte peut confirmer / refuser
    if (confirmerId !== userId) {
      return NextResponse.json(
        { error: "Non autorise" },
        { status: 403 }
      );
    }

    // Transaction deja traitee : on nettoie la notification et on sort proprement
    if (transaction.status !== 'PENDING_CONFIRMATION') {
      await clearConfirmNotifications(prisma, userId, transactionId);
      return NextResponse.json(
        { error: "Transaction deja traitee", status: transaction.status },
        { status: 400 }
      );
    }

    // Expiration (5 minutes)
    const elapsedMs = Date.now() - new Date(transaction.createdAt).getTime();

    if (elapsedMs > CONFIRMATION_WINDOW_MS) {
      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'EXPIRED' }
        });
        // Rendre la reserve a son proprietaire (client pour un retrait,
        // float agent pour un depot legacy).
        await revertPendingHold(tx, transaction);
        await clearConfirmNotifications(tx, userId, transactionId);
      });

      return NextResponse.json(
        { error: "Transaction expiree" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // REFUS EXPLICITE
    // ------------------------------------------------------------------
    if (action === 'reject') {
      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'REJECTED' }
        });

        await revertPendingHold(tx, transaction);

        // La demande de confirmation ne doit plus apparaitre
        await clearConfirmNotifications(tx, userId, transactionId);

        // Information au client : le montant reserve lui a ete rendu
        await tx.notification.create({
          data: {
            userId,
            title: `${isWithdraw ? 'Retrait' : 'Depot'} annule`,
            message: isWithdraw
              ? `Vous avez refuse le retrait de ${transaction.amount.toLocaleString()} ${transaction.currency}. Votre solde est inchange.`
              : `Vous avez refuse le depot de ${transaction.amount.toLocaleString()} ${transaction.currency}.`,
            type: "SYSTEM",
            metadata: {
              transactionId: transaction.id,
              amount: transaction.amount,
              currency: transaction.currency,
              reference: transaction.reference,
              status: 'REJECTED'
            }
          }
        });

        // Information a l'agent
        if (agentId) {
          await tx.notification.create({
            data: {
              userId: agentId,
              title: `${isWithdraw ? 'Retrait' : 'Depot'} refuse par le client`,
              message: `Le client a refuse le ${label} de ${transaction.amount.toLocaleString()} ${transaction.currency}. Ref: ${transaction.reference}`,
              type: "SYSTEM",
              metadata: {
                transactionId: transaction.id,
                amount: transaction.amount,
                currency: transaction.currency,
                reference: transaction.reference,
                status: 'REJECTED'
              }
            }
          });
        }
      });

      return NextResponse.json({ success: true, status: 'REJECTED' });
    }

    // ------------------------------------------------------------------
    // VERIFICATION MFA
    // ------------------------------------------------------------------
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pin: true, twoFactorSecret: true, twoFactorEnabled: true }
    });

    let verified = false;

    if (method === 'totp' && code) {
      if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
        return NextResponse.json(
          { error: "2FA non active" },
          { status: 400 }
        );
      }

      verified = verifyTotp(user.twoFactorSecret, code);
    } else if (method === 'pin' && pin) {
      if (!user?.pin) {
        return NextResponse.json(
          { error: "PIN non configure" },
          { status: 400 }
        );
      }

      verified = await bcrypt.compare(pin, user.pin);
    } else {
      return NextResponse.json(
        { error: "Methode de verification invalide" },
        { status: 400 }
      );
    }

    if (!verified) {
      return NextResponse.json(
        { error: method === 'totp' ? "Code incorrect" : "PIN incorrect" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // CONFIRMATION
    // ------------------------------------------------------------------
    const platformFee = platformFeeOf(transaction.fee);
    const debited = heldAmountOf(transaction);

    const result = await prisma.$transaction(async (tx) => {
      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'SUCCESS' }
      });

      // Mouvement final : credit du float agent (retrait) ou du client (depot)
      await settlePendingHold(tx, transaction);

      // La demande de confirmation est consommee : plus aucune relance affichee
      await clearConfirmNotifications(tx, userId, transactionId);

      // Notification de succes au client
      await tx.notification.create({
        data: {
          userId,
          title: isWithdraw ? "Retrait confirme !" : "Depot confirme !",
          message: isWithdraw
            ? `Votre retrait de ${transaction.amount.toLocaleString()} ${transaction.currency} est valide. Total debite : ${debited.toLocaleString()} ${transaction.currency}.`
            : `Votre compte a ete credite de ${transaction.netAmount?.toLocaleString()} ${transaction.currency}.`,
          type: isWithdraw ? "WITHDRAW" : "DEPOSIT",
          metadata: {
            transactionId: transaction.id,
            direction: isWithdraw ? 'out' : 'in',
            type: transaction.type,
            amount: transaction.amount,
            netAmount: transaction.netAmount,
            fee: transaction.fee,
            totalDebit: isWithdraw ? debited : undefined,
            currency: transaction.currency,
            reference: transaction.reference,
            confirmed: true
          }
        }
      });

      // Notification a l'agent
      if (agentId) {
        await tx.notification.create({
          data: {
            userId: agentId,
            title: `${isWithdraw ? 'Retrait' : 'Depot'} confirme par le client`,
            message: `Le client a confirme le ${label} de ${transaction.amount.toLocaleString()} ${transaction.currency}. Ref: ${transaction.reference}`,
            type: "SUCCESS",
            metadata: {
              transactionId: transaction.id,
              amount: transaction.amount,
              netAmount: transaction.netAmount,
              commission: agentCommissionOf(transaction.fee),
              currency: transaction.currency,
              reference: transaction.reference
            }
          }
        });
      }

      // Stats globales (part plateforme des frais)
      await tx.systemConfig.upsert({
        where: { id: "GLOBAL_CONFIG" },
        update: {
          totalVolumePi: transaction.currency === 'PI' ? { increment: transaction.amount } : undefined,
          totalProfit: { increment: platformFee }
        },
        create: {
          id: "GLOBAL_CONFIG",
          totalProfit: platformFee
        }
      }).catch(() => {}); // Non-bloquant si la table n'a pas ces champs

      return updatedTx;
    });

    // Auto-conversion des frais plateforme en PI
    if (platformFee > 0) {
      autoConvertFeeToPi(
        platformFee,
        transaction.currency,
        transaction.id,
        transaction.reference ?? ''
      ).catch((err) => {
        console.error("[TRANSACTION_CONFIRM] Fee conversion error (non-blocking):", err.message);
      });
    }

    return NextResponse.json({
      success: true,
      status: 'SUCCESS',
      type: transaction.type,
      transaction: result
    });

  } catch (error: any) {
    console.error("Transaction Confirm Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la confirmation" },
      { status: 500 }
    );
  }
}
