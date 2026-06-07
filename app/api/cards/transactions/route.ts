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
    // Include transactions where user is either sender or receiver for recharges/withdrawals
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          // Card purchase transactions
          { fromUserId: userId, type: "CARD_PURCHASE" },
          // Card recharge transactions (money going INTO the card)
          { fromUserId: userId, type: "CARD_RECHARGE" },
          // Card withdraw transactions (money going OUT of the card)  
          { fromUserId: userId, type: "CARD_WITHDRAW" },
          // Payment transactions
          { fromUserId: userId, type: "PAYMENT" },
          // Also include transactions with card metadata or description containing "carte"
          { 
            fromUserId: userId,
            description: { contains: "carte", mode: "insensitive" }
          },
          // Include transactions referencing card in description (case insensitive)
          { 
            fromUserId: userId,
            description: { contains: "Recharge carte", mode: "insensitive" }
          },
          { 
            fromUserId: userId,
            description: { contains: "Retrait carte", mode: "insensitive" }
          },
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Increased limit to show more history
      distinct: ['id'], // Avoid duplicates
    });

    // Format transactions for the frontend
    const formattedTransactions = transactions.map(tx => {
      // Parse metadata if available for merchant info
      let merchant = tx.description || "Transaction carte";
      let category = "Achat";
      let txCurrency = tx.currency || "USD";

      // Display amount & currency may differ from the stored values.
      // Card purchases are debited in PI (a tiny fraction), but should be
      // shown to the user in the card's fiat price (USD/EUR).
      let displayAmount = tx.amount;
      let displayCurrency = txCurrency;

      let meta: {
        merchant?: string;
        category?: string;
        currency?: string;
        type?: string;
        priceUSD?: number;
        priceEUR?: number;
        priceInPi?: number;
        piRate?: number;
        cardTier?: string;
        cardType?: string;
        displayCurrency?: string;
      } = {};

      if (tx.metadata && typeof tx.metadata === 'object') {
        meta = tx.metadata as typeof meta;
        if (meta.merchant) merchant = meta.merchant;
        if (meta.category) category = meta.category;
        // Get currency from metadata if available (more accurate for card transactions)
        if (meta.currency) txCurrency = meta.currency;
        // Set category based on transaction type
        if (meta.type === "CARD_RECHARGE") category = "Recharge";
        if (meta.type === "CARD_WITHDRAW") category = "Retrait";

        // Prefer the fiat price stored in metadata for the displayed amount
        if (meta.displayCurrency && meta.displayCurrency !== "PI") {
          displayCurrency = meta.displayCurrency;
          if (meta.displayCurrency === "EUR" && typeof meta.priceEUR === "number") {
            displayAmount = meta.priceEUR;
          } else if (typeof meta.priceUSD === "number") {
            displayAmount = meta.priceUSD;
            displayCurrency = "USD";
          }
        }
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

      // For card purchases, ensure we surface the fiat price (USD) instead of
      // the tiny PI amount that was actually debited from the wallet.
      if (tx.type === "CARD_PURCHASE" || tx.reference?.toUpperCase().startsWith("CARD-BUY") || tx.reference?.toUpperCase().startsWith("CARD-PUB")) {
        const resolvedUsd = resolveCardPurchaseUsdPrice(meta, tx.description);
        if (resolvedUsd !== null) {
          displayAmount = resolvedUsd;
          displayCurrency = "USD";
        } else if (displayCurrency === "PI") {
          // Last resort: keep the original currency rather than showing PI dust.
          displayCurrency = txCurrency === "PI" ? "USD" : txCurrency;
        }
      }

      return {
        id: tx.id,
        merchant,
        amount: displayType === "debit" ? `-${displayAmount.toFixed(2)}` : `+${displayAmount.toFixed(2)}`,
        date: formatDate(tx.createdAt),
        type: displayType,
        status: tx.status === "SUCCESS" ? "success" : tx.status === "PENDING" ? "pending" : "failed",
        category,
        currency: displayCurrency,
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

// USD price for each card tier (kept in sync with /api/user/card/order config).
const CARD_TIER_USD_PRICE: Record<string, number> = {
  PLATINIUM: 10,
  PREMIUM: 25,
  GOLD: 50,
  ULTRA: 100,
  VISA_CLASSIC: 15,
  VISA_GOLD: 35,
  VISA_PLATINUM: 75,
  VISA_INFINITE: 150,
};

// Resolve the USD price for a card-purchase transaction.
// Priority: explicit priceUSD > priceEUR (approx) > tier map > PI * piRate.
function resolveCardPurchaseUsdPrice(
  meta: { priceUSD?: number; priceEUR?: number; cardTier?: string; cardType?: string; piRate?: number; priceInPi?: number },
  description?: string | null
): number | null {
  if (typeof meta.priceUSD === "number" && meta.priceUSD > 0) {
    return meta.priceUSD;
  }

  // Try to match a known tier from metadata or the description text.
  const tierKey = (meta.cardTier || meta.cardType || "").toUpperCase();
  if (tierKey && CARD_TIER_USD_PRICE[tierKey] !== undefined) {
    return CARD_TIER_USD_PRICE[tierKey];
  }

  if (description) {
    const upper = description.toUpperCase();
    // Check longer keys first so VISA_INFINITE matches before INFINITE, etc.
    const sortedKeys = Object.keys(CARD_TIER_USD_PRICE).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (upper.includes(key.replace(/_/g, " ")) || upper.includes(key)) {
        return CARD_TIER_USD_PRICE[key];
      }
    }
  }

  // Derive from the PI amount and the GCV rate as a final fallback.
  if (typeof meta.priceInPi === "number" && typeof meta.piRate === "number" && meta.priceInPi > 0) {
    return Math.round(meta.priceInPi * meta.piRate * 100) / 100;
  }

  return null;
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
