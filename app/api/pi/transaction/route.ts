export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const SECRET = process.env.JWT_SECRET;
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    if (!token || !SECRET) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    const { searchParams } = new URL(req.url);
    const txid = searchParams.get("txid");
    const ref = searchParams.get("ref");

    if (!txid && !ref) {
      return NextResponse.json({ error: "Parametre txid ou ref requis" }, { status: 400 });
    }

    // Search by blockchainTx (txid) or reference
    const transaction = await prisma.transaction.findFirst({
      where: {
        AND: [
          {
            OR: [
              { fromUserId: userId },
              { toUserId: userId },
            ]
          },
          {
            OR: [
              ...(txid ? [{ blockchainTx: txid }] : []),
              ...(ref ? [{ reference: ref }] : []),
            ]
          }
        ]
      },
      include: {
        fromUser: { select: { username: true, firstName: true } },
        toUser: { select: { username: true, firstName: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      netAmount: transaction.netAmount,
      fee: transaction.fee,
      currency: transaction.currency,
      destCurrency: transaction.destCurrency,
      type: transaction.type,
      status: transaction.status,
      blockchainTx: transaction.blockchainTx,
      description: transaction.description,
      createdAt: transaction.createdAt,
      metadata: transaction.metadata,
      fromUser: transaction.fromUser,
      toUser: transaction.toUser,
    });

  } catch (error: any) {
    console.error("PI_TX_FETCH_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
