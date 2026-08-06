export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import {
  CONFIRMATION_WINDOW_MS,
  clearConfirmNotifications,
  getConfirmerUserId,
  resolveAgentFeeShare,
  revertPendingHold,
} from '@/lib/agent-pending';

/**
 * GET /api/agent/transaction-status
 * Check the status of a pending transaction
 */
export async function GET(req: NextRequest) {
  try {
    // Verify agent authentication
    const authUser = await verifyAuth(req) as any;

    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    if (authUser.role !== 'AGENT' && authUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Acces reserve aux agents" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('id');

    if (!transactionId) {
      return NextResponse.json(
        { error: "ID de transaction requis" },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        status: true,
        type: true,
        amount: true,
        fee: true,
        netAmount: true,
        currency: true,
        createdAt: true,
        fromUserId: true,
        toUserId: true,
        fromWalletId: true,
        toWalletId: true,
        reference: true,
        // Contient le taux de commission agent fige a la creation
        metadata: true,
        fromUser: {
          select: {
            name: true,
            username: true
          }
        },
        toUser: {
          select: {
            name: true,
            username: true
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction introuvable" },
        { status: 404 }
      );
    }

    // Expiration de la fenêtre de confirmation (5 minutes)
    const elapsedMs = Date.now() - new Date(transaction.createdAt).getTime();

    if (transaction.status === 'PENDING_CONFIRMATION' && elapsedMs > CONFIRMATION_WINDOW_MS) {
      // Marquer EXPIRED et rendre la réserve à son propriétaire, atomiquement :
      //  - WITHDRAW : montant + frais rendus au client
      //  - DEPOSIT  : float rendu à l'agent
      // Taux de commission fige a la creation (sinon taux admin courant) :
      // la reserve rendue doit correspondre exactement a celle prelevee.
      const agentFeeShare = await resolveAgentFeeShare(transaction);

      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'EXPIRED' }
        });

        await revertPendingHold(tx, transaction, agentFeeShare);

        // La demande de confirmation expirée ne doit plus rester affichée
        await clearConfirmNotifications(tx, getConfirmerUserId(transaction), transactionId);
      });

      return NextResponse.json({
        id: transaction.id,
        status: 'EXPIRED',
        type: transaction.type,
        message: 'Transaction expiree'
      });
    }

    // Le "client" est la contrepartie de l'agent : destinataire pour un dépôt,
    // émetteur pour un retrait.
    const counterparty =
      transaction.type === 'WITHDRAW' ? transaction.fromUser : transaction.toUser;

    return NextResponse.json({
      id: transaction.id,
      status: transaction.status,
      type: transaction.type,
      amount: transaction.amount,
      netAmount: transaction.netAmount,
      currency: transaction.currency,
      customer: counterparty?.name || counterparty?.username
    });

  } catch (error: any) {
    console.error("Transaction Status Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur" },
      { status: 500 }
    );
  }
}
