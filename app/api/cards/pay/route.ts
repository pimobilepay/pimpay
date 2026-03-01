export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth/verify"; // Vérifie bien le chemin vers ton verifyAuth

export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTIFICATION DE L'UTILISATEUR
    // Utilisation de unknown pour bypasser l'erreur de promesse au build
    const userPayload = (await verifyAuth(req)) as unknown as { id: string; role: string } | null;
    
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

    // CORRECTION TYPE : On vérifie si locked existe, sinon on utilise le status
    const isLocked = (card as any).locked === true || (card as any).status === "LOCKED" || (card as any).status === "FROZEN";

    if (isLocked) {
      return NextResponse.json({ error: "Cette carte est verrouillée" }, { status: 403 });
    }

    // 3. VÉRIFICATION DE LA LIMITE JOURNALIÈRE
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayTransactions = await prisma.transaction.aggregate({
      where: {
        fromUserId: userPayload.id,
        type: "PAYMENT",
        status: "SUCCESS",
        createdAt: { gte: startOfDay }
      },
      _sum: { amount: true }
    });

    const spentToday = todayTransactions._sum.amount || 0;
    const dailyLimit = (card as any).dailyLimit || 1000; // Fallback si le champ manque

    if (spentToday + amount > dailyLimit) {
      return NextResponse.json({
        error: "Limite journalière dépassée",
        remaining: dailyLimit - spentToday
      }, { status: 400 });
    }

    // 4. VÉRIFICATION DU SOLDE (Conversion Pi/USD)
    const wallet = await prisma.wallet.findFirst({
      where: { userId: userPayload.id, currency: "PI" }
    });

    const config = await prisma.systemConfig.findFirst();
    const piPrice = config?.consensusPrice || 314159;

    // Calcul du montant en Pi (Si montant est en USD)
    const amountInPi = amount / piPrice;

    if (!wallet || wallet.balance < amountInPi) {
      return NextResponse.json({ error: "Solde Pi insuffisant" }, { status: 400 });
    }

    // 5. TRANSACTION ATOMIQUE
    const payment = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amountInPi } }
      });

      return await tx.transaction.create({
        data: {
          reference: `VPAY-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amount,
          fee: 0,
          type: "PAYMENT",
          status: "SUCCESS",
          description: `Paiement Carte chez ${merchantName}`,
          fromUserId: userPayload.id,
          metadata: {
            cardNumber: cardNumber.slice(-4),
            currency: currency,
            piUsed: amountInPi
          }
        }
      });
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({
      success: true,
      transactionId: payment.id,
      remainingLimit: dailyLimit - (spentToday + amount)
    });

  } catch (error: any) {
    console.error("PAYMENT_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors du traitement" }, { status: 500 });
  }
}
