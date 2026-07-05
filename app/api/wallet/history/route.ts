export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // [FIX V16] Auth centralisée et vérifiée cryptographiquement.
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // --- RÉCUPÉRATION AVANCÉE DES TRANSACTIONS ---
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      include: {
        // On récupère les pseudos pour afficher "De @Jean" ou "À @Marie"
        fromUser: { select: { username: true, firstName: true } },
        toUser: { select: { username: true, firstName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // More transactions for accurate chart data
    });

    // --- FORMATAGE INTELLIGENT POUR LE DASHBOARD ---
    const formattedTransactions = transactions.map(tx => {
      // Determine transaction direction for the current user
      let isDebit: boolean;

      if (tx.type === 'EXCHANGE') {
        // Exchanges: always show as swap (neutral), but technically debit from source
        isDebit = true;
      } else if (tx.type === 'DEPOSIT' || tx.type === 'AIRDROP' || tx.type === 'STAKING_REWARD') {
        // Deposits, airdrops, and staking rewards are ALWAYS incoming (credit)
        isDebit = false;
      } else {
        // For transfers, payments, withdrawals, etc.: check who initiated
        isDebit = tx.fromUserId === userId;
      }
      
      // Define the "other" person in the transaction
      const peer = isDebit ? tx.toUser : tx.fromUser;
      const peerName = peer?.username || peer?.firstName || "Utilisateur externe";

      return {
        id: tx.id,
        reference: tx.reference,
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type,
        status: tx.status,
        description: tx.description,
        createdAt: tx.createdAt,
        isDebit, // Très important pour mettre en rouge (-) ou vert (+)
        peerName // Pour afficher dynamiquement dans la liste
      };
    });

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions
    });

  } catch (error: any) {
    console.error("❌ [TRANSACTIONS_FETCH_ERROR]:", error.message);
    return NextResponse.json({ error: "Impossible de charger l'historique" }, { status: 500 });
  }
}
