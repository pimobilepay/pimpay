export const dynamic = 'force-dynamic';

import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

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
        amount: true,
        fee: true,
        netAmount: true,
        currency: true,
        createdAt: true,
        fromWalletId: true,
        reference: true,
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

    // Check if transaction has expired (5 minutes)
    const createdAt = new Date(transaction.createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (transaction.status === 'PENDING_CONFIRMATION' && diffMinutes > 5) {
      // BUG FIX: Mark as EXPIRED et rembourser le float agent atomiquement.
      // Sans remboursement, le float de l'agent est perdu définitivement à l'expiration.
      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'EXPIRED' }
        });

        // Remboursement du float agent :
        // Débit initial = amount - agentCommission = amount - fee*0.5
        // On lui rend exactement ce montant.
        if (transaction.fromWalletId) {
          const refundAmount = transaction.amount - (transaction.fee * 0.5);
          await tx.wallet.update({
            where: { id: transaction.fromWalletId },
            data: { balance: { increment: refundAmount } }
          });
        }
      });

      return NextResponse.json({
        id: transaction.id,
        status: 'EXPIRED',
        message: 'Transaction expiree'
      });
    }

    return NextResponse.json({
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      netAmount: transaction.netAmount,
      currency: transaction.currency,
      customer: transaction.toUser?.name || transaction.toUser?.username
    });

  } catch (error: unknown) {
    console.error("Transaction Status Error:", getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Erreur" },
      { status: 500 }
    );
  }
}
