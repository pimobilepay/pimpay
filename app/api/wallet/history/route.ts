export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    
    // --- RÉCUPÉRATION HYBRIDE (Le Vaccin) ---
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    
    let userId: string | null = null;

    if (piToken) {
      userId = piToken; // Session Pi Browser directe
    } else if (classicToken) {
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jwtVerify(classicToken, secretKey);
        userId = payload.id as string;
      } catch (e) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // --- RÉCUPÉRATION DES TRANSACTIONS ---
    // On utilise ton schéma : transactionsFrom et transactionsTo
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        type: true,
        status: true,
        description: true,
        createdAt: true,
        fromUserId: true,
        toUserId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    // Formater pour que le Dashboard sache si c'est un débit (-) ou crédit (+)
    const formattedTransactions = transactions.map(tx => ({
      ...tx,
      isDebit: tx.fromUserId === userId
    }));

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions
    });

  } catch (error: any) {
    console.error("TRANSACTIONS_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
