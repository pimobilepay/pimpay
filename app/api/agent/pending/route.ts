export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

const CONFIRMATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/agent/pending
 * Liste les transactions de l'agent en attente de confirmation du client
 * (statut PENDING_CONFIRMATION). Utilisé par le widget temps réel du hub.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = (await verifyAuth(req)) as any;

    if (!authUser || !authUser.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    if (authUser.role !== 'AGENT' && authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux agents' }, { status: 403 });
    }

    const pending = await prisma.transaction.findMany({
      where: {
        fromUserId: authUser.id,
        status: 'PENDING_CONFIRMATION',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        reference: true,
        amount: true,
        netAmount: true,
        currency: true,
        type: true,
        createdAt: true,
        toUser: { select: { name: true, username: true } },
      },
    });

    const now = Date.now();
    const items = pending.map((tx) => {
      const created = new Date(tx.createdAt).getTime();
      const expiresAt = created + CONFIRMATION_WINDOW_MS;
      const remainingSeconds = Math.max(0, Math.round((expiresAt - now) / 1000));
      return {
        id: tx.id,
        reference: tx.reference,
        amount: tx.amount,
        netAmount: tx.netAmount,
        currency: tx.currency,
        type: tx.type,
        customer: tx.toUser?.name || tx.toUser?.username || 'Client',
        createdAt: tx.createdAt,
        expiresAt: new Date(expiresAt).toISOString(),
        remainingSeconds,
      };
    });

    return NextResponse.json({ success: true, count: items.length, items });
  } catch (error: any) {
    console.error('Agent Pending Error:', error.message);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

/**
 * POST /api/agent/pending
 * Relance : renvoie une notification de confirmation au client pour une
 * transaction toujours en attente.
 * Body: { transactionId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = (await verifyAuth(req)) as any;

    if (!authUser || !authUser.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    if (authUser.role !== 'AGENT' && authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux agents' }, { status: 403 });
    }

    const { transactionId } = await req.json();
    if (!transactionId) {
      return NextResponse.json({ error: 'ID de transaction requis' }, { status: 400 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        reference: true,
        amount: true,
        netAmount: true,
        currency: true,
        status: true,
        fromUserId: true,
        toUserId: true,
        createdAt: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 });
    }

    // L'agent ne peut relancer que ses propres transactions
    if (transaction.fromUserId !== authUser.id) {
      return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 });
    }

    if (transaction.status !== 'PENDING_CONFIRMATION') {
      return NextResponse.json(
        { error: "Cette transaction n'est plus en attente" },
        { status: 400 }
      );
    }

    if (!transaction.toUserId) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    const agent = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { name: true, username: true },
    });
    const agentName = agent?.name || agent?.username || 'Agent';

    const customer = await prisma.user.findUnique({
      where: { id: transaction.toUserId },
      select: { twoFactorEnabled: true },
    });

    // La fenêtre de confirmation repart de la création initiale : on conserve
    // le même expiresAt pour rester cohérent avec transaction-status (5 min).
    const expiresAt = new Date(
      new Date(transaction.createdAt).getTime() + CONFIRMATION_WINDOW_MS
    ).toISOString();

    await prisma.notification.create({
      data: {
        userId: transaction.toUserId,
        title: 'Rappel : confirmer le dépôt',
        message: `Un dépôt de ${transaction.amount.toLocaleString()} ${transaction.currency} attend toujours votre confirmation.`,
        type: 'TRANSACTION_CONFIRM',
        metadata: {
          transactionId: transaction.id,
          type: 'DEPOSIT',
          amount: transaction.amount,
          netAmount: transaction.netAmount,
          currency: transaction.currency,
          agentId: authUser.id,
          agentName,
          reference: transaction.reference,
          requireMFA: true,
          twoFactorEnabled: customer?.twoFactorEnabled || false,
          expiresAt,
          isReminder: true,
        },
      },
    });

    return NextResponse.json({ success: true, message: 'Rappel envoyé au client' });
  } catch (error: any) {
    console.error('Agent Pending Relance Error:', error.message);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
