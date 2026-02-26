export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { nanoid } from 'nanoid';

// FONCTION DE VÉRIFICATION DU TOKEN
async function getAuthUser() {
  const cookieStore = await cookies();
  const SECRET = process.env.JWT_SECRET;
  const token = cookieStore.get("pimpay_token")?.value || cookieStore.get("token")?.value;
  if (!token || !SECRET) return null;
  try {
    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return payload.id as string;
  } catch { return null; }
}

// POST : CRÉATION DE LA TRANSACTION (Appelé par la page Deposit)
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUser();
    if (!userId) return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    const body = await req.json();
    const { amount, fee, type, currency, method, operatorId, accountNumber, countryCode, description } = body;

    // Génération d'une référence unique PimPay
    const reference = `PP-${nanoid(10).toUpperCase()}`;

    const transaction = await prisma.transaction.create({
      data: {
        reference,
        amount: parseFloat(amount),
        fee: parseFloat(fee || 0),
        netAmount: parseFloat(amount) - parseFloat(fee || 0),
        currency: currency || "USD",
        type: type || "DEPOSIT",
        status: "PENDING",
        description: description || `Dépôt via ${method}`,
        operatorId,
        accountNumber,
        countryCode,
        fromUserId: userId, // L'utilisateur initie le dépôt
      }
    });

    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error("❌ POST_TX_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}

// GET : RÉCUPÉRATION DU DÉTAIL (Appelé par Summary/Success)
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUser();
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const txid = searchParams.get("txid");
    const ref = searchParams.get("ref");

    const transaction = await prisma.transaction.findFirst({
      where: {
        AND: [
          { OR: [{ fromUserId: userId }, { toUserId: userId }] },
          { OR: [...(txid ? [{ blockchainTx: txid }] : []), ...(ref ? [{ reference: ref }] : []), ...(ref ? [{ externalId: ref }] : [])] }
        ]
      },
      include: {
        fromUser: { select: { username: true, firstName: true, avatar: true } },
        toUser: { select: { username: true, firstName: true, avatar: true } },
      }
    });

    if (!transaction) return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });

    return NextResponse.json({
      ...transaction,
      method: transaction.currency === "PI" ? "Pi Network" : (transaction.description?.split('via ')[1] || "Mobile Money")
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
