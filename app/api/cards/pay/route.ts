import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTIFICATION DE L'UTILISATEUR
    const userPayload = await verifyAuth(req);
    if (!userPayload) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { cardNumber, amount, merchantName, currency = "USD" } = await req.json();

    // 2. RÉCUPÉRATION DE LA CARTE ET VÉRIFICATION DU STATUT
    const card = await prisma.virtualCard.findUnique({
      where: { number: cardNumber },
      include: { user: true }
    });

    if (!card || card.userId !== userPayload.id) {
      return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
    }

    if (card.locked) {
      return NextResponse.json({ error: "Cette carte est verrouillée" }, { status: 403 });
    }

    // 3. VÉRIFICATION DE LA LIMITE JOURNALIÈRE
    // On calcule le total dépensé aujourd'hui
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayTransactions = await prisma.transaction.aggregate({
      where: {
        fromUserId: userPayload.id,
        type: "PAYMENT",
        status: "COMPLETED",
        createdAt: { gte: startOfDay }
      },
      _sum: { amount: true }
    });

    const spentToday = todayTransactions._sum.amount || 0;

    if (spentToday + amount > card.dailyLimit) {
      return NextResponse.json({ 
        error: "Limite journalière dépassée",
        remaining: card.dailyLimit - spentToday 
      }, { status: 400 });
    }

    // 4. VÉRIFICATION DU SOLDE (Conversion Pi/USD si nécessaire)
    const wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId: userPayload.id, currency: "PI" } }
    });

    // On récupère le prix du Pi pour la conversion
    const config = await prisma.systemConfig.findFirst();
    const piPrice = config?.consensusPrice || 314159;
    
    // Si l'achat est en USD, on convertit le montant en Pi
    const amountInPi = amount / piPrice;

    if (!wallet || wallet.balance < amountInPi) {
      return NextResponse.json({ error: "Solde Pi insuffisant pour cet achat" }, { status: 400 });
    }

    // 5. TRANSACTION ATOMIQUE (Débit + Log)
    const payment = await prisma.$transaction(async (tx) => {
      // Débiter le Wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amountInPi } }
      });

      // Créer la transaction
      return await tx.transaction.create({
        data: {
          reference: `VPAY-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amount, // Montant facial en USD
          fee: 0,
          type: "PAYMENT",
          status: "COMPLETED",
          description: `Paiement Carte chez ${merchantName}`,
          fromUserId: userPayload.id,
          metadata: {
            cardNumber: cardNumber.slice(-4), // Stocke juste les 4 derniers chiffres pour la sécurité
            currency: currency,
            piUsed: amountInPi
          }
        }
      });
    });

    return NextResponse.json({ 
      success: true, 
      transactionId: payment.id,
      remainingLimit: card.dailyLimit - (spentToday + amount)
    });

  } catch (error: any) {
    console.error("PAYMENT_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors du traitement du paiement" }, { status: 500 });
  }
}
