export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const SECRET = process.env.JWT_SECRET;
    
    // Récupération sécurisée du token PimPay
    const token = cookieStore.get("pimpay_token")?.value || cookieStore.get("token")?.value;

    if (!token || !SECRET) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 401 });
    }

    // Décodage et extraction de l'ID utilisateur
    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    const { searchParams } = new URL(req.url);
    const txid = searchParams.get("txid"); // ID Blockchain (Pi/Crypto)
    const ref = searchParams.get("ref");   // Référence interne PimPay

    if (!txid && !ref) {
      return NextResponse.json({ error: "Identifiant requis (ref ou txid)" }, { status: 400 });
    }

    // Requête Prisma optimisée avec filtrage par propriétaire
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
              ...(ref ? [{ externalId: ref }] : []),
            ]
          }
        ]
      },
      include: {
        fromUser: { select: { username: true, firstName: true, avatar: true } },
        toUser: { select: { username: true, firstName: true, avatar: true } },
      }
    });

    // Si la transaction n'est pas encore créée (latence), on renvoie un flag retry
    if (!transaction) {
      return NextResponse.json({ 
        error: "Transaction introuvable ou en cours...", 
        retry: true 
      }, { status: 404 });
    }

    // Préparation de la réponse pour le ticket récapitulatif
    return NextResponse.json({
      id: transaction.id,
      reference: transaction.reference,
      externalId: transaction.externalId,
      amount: transaction.amount,
      fee: transaction.fee,
      netAmount: transaction.netAmount || (transaction.amount - transaction.fee),
      currency: transaction.currency,
      type: transaction.type,
      status: transaction.status,
      description: transaction.description,
      createdAt: transaction.createdAt,
      fromUser: transaction.fromUser,
      toUser: transaction.toUser,
      accountNumber: transaction.accountNumber,
      operatorId: transaction.operatorId,
      // On définit un label clair pour l'affichage UI
      methodLabel: transaction.description?.split(' - ')[0] || 
                   (transaction.currency === "PI" ? "Pi Bridge" : "PimPay")
    });

  } catch (error: any) {
    console.error("❌ PIMPAY_DETAILS_API_ERROR:", error.message);
    
    if (error.code === 'ERR_JWT_EXPIRED') {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
