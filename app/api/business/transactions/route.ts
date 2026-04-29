export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET - Get all business transactions with filters
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type'); // entrant, sortant, all
    const status = searchParams.get('status'); // PENDING, SUCCESS, FAILED, all
    const category = searchParams.get('category');
    const dateRange = searchParams.get('dateRange') || '30d';
    const search = searchParams.get('search');

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Build where clause
    const whereClause: any = {
      createdAt: { gte: startDate },
      OR: [
        { fromUserId: session.id },
        { toUserId: session.id }
      ]
    };

    // Filter by type (incoming/outgoing)
    if (type === 'entrant') {
      whereClause.toUserId = session.id;
    } else if (type === 'sortant') {
      whereClause.fromUserId = session.id;
    }

    // Filter by status
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Search filter
    if (search) {
      whereClause.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { accountName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const totalCount = await prisma.transaction.count({ where: whereClause });

    // Get transactions with pagination
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        fromUser: { select: { name: true, email: true } },
        toUser: { select: { name: true, email: true } }
      }
    });

    // Calculate stats
    const allTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startDate },
        OR: [
          { fromUserId: session.id },
          { toUserId: session.id }
        ],
        status: "SUCCESS"
      }
    });

    const totalIncoming = allTransactions
      .filter(tx => tx.toUserId === session.id)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalOutgoing = allTransactions
      .filter(tx => tx.fromUserId === session.id)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const pendingCount = await prisma.transaction.count({
      where: {
        OR: [
          { fromUserId: session.id },
          { toUserId: session.id }
        ],
        status: "PENDING"
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map(tx => ({
          id: tx.id,
          reference: tx.reference,
          amount: tx.amount,
          currency: tx.currency,
          type: tx.type,
          status: tx.status,
          description: tx.description,
          category: tx.purpose || (tx.description?.includes('Salaire') ? 'Salaire' : 
                    tx.description?.includes('Loyer') ? 'Loyer' : 'Autre'),
          createdAt: tx.createdAt,
          isIncoming: tx.toUserId === session.id,
          counterparty: tx.toUserId === session.id 
            ? tx.fromUser?.name || tx.fromUser?.email || tx.accountName || "Externe"
            : tx.toUser?.name || tx.toUser?.email || tx.accountName || "Externe"
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        stats: {
          totalTransactions: totalCount,
          totalIncoming,
          totalOutgoing,
          netFlow: totalIncoming - totalOutgoing,
          pendingCount
        }
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_TRANSACTIONS_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET transaction details by ID
export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (session.role !== "BUSINESS_ADMIN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await req.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json({ error: "ID transaction requis" }, { status: 400 });
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        OR: [
          { fromUserId: session.id },
          { toUserId: session.id }
        ]
      },
      include: {
        fromUser: { select: { name: true, email: true, phone: true } },
        toUser: { select: { name: true, email: true, phone: true } }
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction non trouvee" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: transaction.id,
        reference: transaction.reference,
        amount: transaction.amount,
        fee: transaction.fee,
        netAmount: transaction.netAmount || (transaction.amount - transaction.fee),
        currency: transaction.currency,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description,
        note: transaction.note,
        createdAt: transaction.createdAt,
        blockchainTx: transaction.blockchainTx,
        isIncoming: transaction.toUserId === session.id,
        fromUser: transaction.fromUser ? {
          name: transaction.fromUser.name,
          email: transaction.fromUser.email,
        } : null,
        toUser: transaction.toUser ? {
          name: transaction.toUser.name,
          email: transaction.toUser.email,
        } : null,
        metadata: transaction.metadata
      }
    });

  } catch (error: any) {
    console.error("BUSINESS_TRANSACTION_DETAIL_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
