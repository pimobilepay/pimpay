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

    // Fetch card transactions (CARD_PURCHASE, CARD_RECHARGE, CARD_WITHDRAW and PAYMENT types)
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: userId, type: "CARD_PURCHASE" },
          { fromUserId: userId, type: "CARD_RECHARGE" },
          { fromUserId: userId, type: "CARD_WITHDRAW" },
          { fromUserId: userId, type: "PAYMENT" },
          // Also include transactions with card metadata
          { 
            fromUserId: userId,
            description: { contains: "carte" }
          },
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Format transactions for the frontend
    const formattedTransactions = transactions.map(tx => {
      // Parse metadata if available for merchant info
      let merchant = tx.description || "Transaction carte";
      let category = "Achat";
      let txCurrency = tx.currency || "USD";
      
      if (tx.metadata && typeof tx.metadata === 'object') {
        const meta = tx.metadata as { merchant?: string; category?: string; currency?: string; type?: string };
        if (meta.merchant) merchant = meta.merchant;
        if (meta.category) category = meta.category;
        // Get currency from metadata if available (more accurate for card transactions)
        if (meta.currency) txCurrency = meta.currency;
        // Set category based on transaction type
        if (meta.type === "CARD_RECHARGE") category = "Recharge";
        if (meta.type === "CARD_WITHDRAW") category = "Retrait";
      }

      // Determine transaction type based on transaction type field
      let isDebit = true;
      let displayType: "debit" | "credit" = "debit";
      
      if (tx.type === "CARD_RECHARGE") {
        // Recharge is debit from main wallet, credit to card
        isDebit = true;
        displayType = "credit"; // Show as credit on card view (money coming in)
        category = "Recharge";
      } else if (tx.type === "CARD_WITHDRAW") {
        // Withdraw is debit from card, credit to main wallet
        isDebit = true;
        displayType = "debit"; // Show as debit on card view (money going out)
        category = "Retrait";
      } else {
        isDebit = tx.fromUserId === userId;
        displayType = isDebit ? "debit" : "credit";
      }
      
      return {
        id: tx.id,
        merchant,
        amount: displayType === "debit" ? `-${tx.amount.toFixed(2)}` : `+${tx.amount.toFixed(2)}`,
        date: formatDate(tx.createdAt),
        type: displayType,
        status: tx.status === "SUCCESS" ? "success" : tx.status === "PENDING" ? "pending" : "failed",
        category,
        currency: txCurrency,
        reference: tx.reference,
        fee: tx.fee || 0,
        metadata: tx.metadata,
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
