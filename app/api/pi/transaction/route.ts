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
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    const { searchParams } = new URL(req.url);
    const txid = searchParams.get("txid"); // Correspond à blockchainTx
    const ref = searchParams.get("ref");   // Correspond à reference

    if (!txid && !ref) {
      return NextResponse.json({ error: "Paramètre txid ou ref requis" }, { status: 400 });
    }

    // Recherche la transaction appartenant à l'utilisateur
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
              ...(ref ? [{ externalId: ref }] : []), // Sécurité supplémentaire pour le SDK Pi
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

    // Calcul dynamique du montant net si absent (Bancaire)
    const safeNetAmount = transaction.netAmount ?? (transaction.amount - transaction.fee);

    return NextResponse.json({
      ...transaction,
      netAmount: safeNetAmount,
      // On s'assure que le status est bien SUCCESS (seul enum valide selon tes instructions)
      status: transaction.status === "SUCCESS" ? "SUCCESS" : transaction.status,
    });

  } catch (error: any) {
    console.error("PIMPAY_TX_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
