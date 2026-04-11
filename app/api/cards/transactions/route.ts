export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth() as { id?: string } | null;
    const userId = session?.id;

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get cardId from URL params if provided
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get("cardId");

    // Get user's virtual cards to verify ownership
    const userCards = await prisma.virtualCard.findMany({
      where: { userId },
      select: { id: true, number: true }
    });

    if (userCards.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        message: "Aucune carte trouvée"
      });
    }

    // If cardId is provided, verify it belongs to the user
    if (cardId) {
      const cardBelongsToUser = userCards.some(c => c.id === cardId);
      if (!cardBelongsToUser) {
        return NextResponse.json({ error: "Carte non autorisée" }, { status: 403 });
      }
    }

    // Fetch card transactions (CARD_PURCHASE type or transactions with card metadata)
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: userId, type: "CARD_PURCHASE" },
          { fromUserId: userId, type: "PAYMENT" },
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Format transactions for the frontend
    const formattedTransactions = transactions.map(tx => {
      // Parse metadata if available for merchant info
      let merchant = tx.description || "Transaction carte";
      let category = "Achat";
      
      if (tx.metadata && typeof tx.metadata === 'object') {
        const meta = tx.metadata as { merchant?: string; category?: string };
        if (meta.merchant) merchant = meta.merchant;
        if (meta.category) category = meta.category;
      }

      // Determine transaction type (debit/credit)
      const isDebit = tx.fromUserId === userId;
      
      return {
        id: tx.id,
        merchant,
        amount: isDebit ? `-${tx.amount.toFixed(2)}` : `+${tx.amount.toFixed(2)}`,
        date: formatDate(tx.createdAt),
        type: isDebit ? "debit" : "credit",
        status: tx.status === "SUCCESS" ? "success" : tx.status === "PENDING" ? "pending" : "failed",
        category,
        currency: tx.currency || "USD",
        reference: tx.reference
      };
    });

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions
    });

  } catch (error) {
    console.error("API_CARD_TRANSACTIONS_ERROR:", error);
    return NextResponse.json({
      error: "Erreur serveur",
      success: false
    }, { status: 500 });
  }
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  const timeStr = date.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  if (days === 0) {
    return `Aujourd'hui, ${timeStr}`;
  } else if (days === 1) {
    return `Hier, ${timeStr}`;
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
