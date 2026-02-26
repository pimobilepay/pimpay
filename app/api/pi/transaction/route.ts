export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const SECRET = process.env.JWT_SECRET;
    const token = cookieStore.get("pimpay_token")?.value || cookieStore.get("token")?.value;

    if (!token || !SECRET) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    const { searchParams } = new URL(req.url);
    const txid = searchParams.get("txid"); 
    const ref = searchParams.get("ref");   

    if (!txid && !ref) {
      return NextResponse.json({ error: "Paramètre requis" }, { status: 400 });
    }

    // RECHERCHE PRISMA
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
              ...(ref ? [{ externalId: ref }] : []), // Liaison avec piPaymentId
            ]
          }
        ]
      },
      include: {
        fromUser: { select: { username: true, firstName: true, avatar: true } },
        toUser: { select: { username: true, firstName: true, avatar: true } },
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // CALCUL DES FRAIS (Si pas déjà fait en DB)
    const calculatedNet = transaction.netAmount ?? (transaction.amount - transaction.fee);

    // RÉPONSE PROPRE POUR LE FRONTEND
    return NextResponse.json({
      id: transaction.id,
      reference: transaction.reference,
      externalId: transaction.externalId,
      blockchainTx: transaction.blockchainTx,
      amount: transaction.amount,
      fee: transaction.fee,
      netAmount: calculatedNet,
      currency: transaction.currency,
      type: transaction.type,
      status: transaction.status, // PENDING, SUCCESS, FAILED
      description: transaction.description,
      // On s'assure que la méthode est lisible
      method: transaction.description?.includes('via') 
        ? transaction.description.split('via ')[1] 
        : (transaction.currency === "PI" ? "Pi Network" : "PimPay Transfer"),
      createdAt: transaction.createdAt,
      fromUser: transaction.fromUser,
      toUser: transaction.toUser,
      operatorId: transaction.operatorId,
      accountNumber: transaction.accountNumber,
    });

  } catch (error: any) {
    console.error("PIMPAY_TX_ERROR:", error.message);
    if (error.code === 'ERR_JWT_EXPIRED') {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
