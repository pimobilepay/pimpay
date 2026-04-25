export const dynamic = 'force-dynamic';

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
        netAmount: true,
        currency: true,
        createdAt: true,
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
      // Mark as expired
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'EXPIRED' }
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

  } catch (error: any) {
    console.error("Transaction Status Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur" },
      { status: 500 }
    );
  }
}
