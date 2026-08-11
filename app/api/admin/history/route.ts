export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminAuth } from '@/lib/adminAuth';
import { isCryptoCurrency, getNetworkLabel, resolveTransactionMethod } from '@/lib/currency-kind';

export async function GET(req: NextRequest) {
  const adminPayload = await adminAuth(req);
  if (!adminPayload) return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { fromUser: { OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]}},
        { toUser: { OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]}},
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          fromUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true,
              phone: true,
              avatar: true,
            }
          },
          toUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true,
              phone: true,
              avatar: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    const formatted = transactions.map((tx) => {
      const meta = (tx.metadata as any) || {};
      const user = tx.fromUser || tx.toUser;
      const externalAddress = meta.externalAddress || meta.destination || null;

      // On considère la transaction comme on-chain dès qu'un signal blockchain
      // existe (flag, hash, adresse externe) OU que la devise est une crypto.
      const isBlockchainWithdraw =
        meta.isBlockchainWithdraw === true ||
        meta.isExternal === true ||
        Boolean(tx.blockchainTx) ||
        isCryptoCurrency(tx.currency);

      // [FIX] La méthode était calculée avec un fallback « MOBILE » dès que la
      // devise n'était pas "PI". Un dépôt TRX (ou USDT, SOL, BTC...) s'affichait
      // donc « MOBILE » dans le détail admin alors qu'il s'agit d'un dépôt
      // crypto. resolveTransactionMethod s'appuie sur la nature de la devise et
      // les signaux metadata au lieu de deviner.
      const resolved = resolveTransactionMethod({
        currency: tx.currency,
        type: tx.type,
        accountNumber: tx.accountNumber,
        blockchainTx: tx.blockchainTx,
        metadata: meta,
      });

      return {
        id: tx.id,
        reference: tx.reference,
        externalId: tx.externalId,
        blockchainTx: tx.blockchainTx,
        amount: tx.amount,
        fee: tx.fee,
        netAmount: tx.netAmount,
        currency: tx.currency,
        destCurrency: tx.destCurrency,
        type: tx.type,
        status: tx.status,
        description: tx.description,
        note: tx.note,
        accountNumber: isBlockchainWithdraw && externalAddress
          ? externalAddress
          : tx.accountNumber || meta.phoneNumber || meta.phone || null,
        accountName: tx.accountName,
        isBlockchainWithdraw,
        method: resolved.method,
        methodKind: resolved.kind,
        network: isBlockchainWithdraw
          ? (meta.network || getNetworkLabel(tx.currency) || null)
          : null,
        countryCode: tx.countryCode,
        createdAt: tx.createdAt.toISOString(),
        fromUser: tx.fromUser ? {
          id: tx.fromUser.id,
          firstName: tx.fromUser.firstName,
          lastName: tx.fromUser.lastName,
          username: tx.fromUser.username,
          email: tx.fromUser.email,
          phone: tx.fromUser.phone,
          avatar: tx.fromUser.avatar,
        } : null,
        toUser: tx.toUser ? {
          id: tx.toUser.id,
          firstName: tx.toUser.firstName,
          lastName: tx.toUser.lastName,
          username: tx.toUser.username,
          email: tx.toUser.email,
          phone: tx.toUser.phone,
          avatar: tx.toUser.avatar,
        } : null,
        fromUserId: tx.fromUserId,
        toUserId: tx.toUserId,
      };
    });

    return NextResponse.json({
      transactions: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("[API_ADMIN_HISTORY_ERROR]:", error.message);
    return NextResponse.json({ error: "Impossible de charger l'historique" }, { status: 500 });
  }
}
