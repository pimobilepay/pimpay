export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { CONFIRMATION_WINDOW_MS, getConfirmerUserId } from '@/lib/agent-pending';

/**
 * GET /api/agent/pending
 * Liste les transactions de l'agent en attente de confirmation du client
 * (statut PENDING_CONFIRMATION). Utilisé par le widget temps réel du hub.
 *
 * Depuis la correction du flux, seuls les RETRAITS (cash-out) attendent une
 * confirmation : l'agent est donc le destinataire (toUserId) de ces
 * transactions. Les dépôts en attente restants sont d'anciennes transactions.
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
        status: 'PENDING_CONFIRMATION',
        // Retraits (agent destinataire) + anciens dépôts (agent émetteur)
        OR: [{ toUserId: authUser.id }, { fromUserId: authUser.id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        reference: true,
        amount: true,
        fee: true,
        netAmount: true,
        currency: true,
        type: true,
        createdAt: true,
        fromUser: { select: { name: true, username: true } },
        toUser: { select: { name: true, username: true } },
      },
    });

    const now = Date.now();
    const items = pending.map((tx) => {
      const created = new Date(tx.createdAt).getTime();
      const expiresAt = created + CONFIRMATION_WINDOW_MS;
      const remainingSeconds = Math.max(0, Math.round((expiresAt - now) / 1000));
      // Pour un retrait le client est l'émetteur, pour un dépôt le destinataire
      const counterparty = tx.type === 'WITHDRAW' ? tx.fromUser : tx.toUser;
      return {
        id: tx.id,
        reference: tx.reference,
        amount: tx.amount,
        fee: tx.fee,
        netAmount: tx.netAmount,
        currency: tx.currency,
        type: tx.type,
        direction: tx.type === 'WITHDRAW' ? 'cash-out' : 'cash-in',
        customer: counterparty?.name || counterparty?.username || 'Client',
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
        type: true,
        amount: true,
        fee: true,
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

    // L'agent ne peut relancer que ses propres transactions (émises ou reçues)
    if (transaction.fromUserId !== authUser.id && transaction.toUserId !== authUser.id) {
      return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 });
    }

    if (transaction.status !== 'PENDING_CONFIRMATION') {
      return NextResponse.json(
        { error: "Cette transaction n'est plus en attente" },
        { status: 400 }
      );
    }

    // Le client à relancer est celui qui doit confirmer
    const confirmerId = getConfirmerUserId(transaction);

    if (!confirmerId) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    const agent = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { name: true, username: true },
    });
    const agentName = agent?.name || agent?.username || 'Agent';

    const customer = await prisma.user.findUnique({
      where: { id: confirmerId },
      select: { twoFactorEnabled: true },
    });

    // La fenêtre de confirmation repart de la création initiale : on conserve
    // le même expiresAt pour rester cohérent avec transaction-status (5 min).
    const expiresAt = new Date(
      new Date(transaction.createdAt).getTime() + CONFIRMATION_WINDOW_MS
    ).toISOString();

    const isWithdraw = transaction.type === 'WITHDRAW';
    const label = isWithdraw ? 'retrait' : 'dépôt';

    await prisma.notification.create({
      data: {
        userId: confirmerId,
        title: `Rappel : confirmer le ${label}`,
        message: `Un ${label} de ${transaction.amount.toLocaleString()} ${transaction.currency} attend toujours votre confirmation.`,
        type: 'TRANSACTION_CONFIRM',
        metadata: {
          transactionId: transaction.id,
          type: transaction.type,
          direction: isWithdraw ? 'out' : 'in',
          amount: transaction.amount,
          netAmount: transaction.netAmount,
          fee: transaction.fee,
          totalDebit: isWithdraw ? transaction.amount + (transaction.fee ?? 0) : undefined,
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
