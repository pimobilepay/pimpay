export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, amount, memo } = body;

    if (!paymentId || !amount) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    console.log(`[RECEIVE-PAYMENT] User ${user.username} requesting payment: ${amount} π`);

    // Vérifier si le paiement existe déjà
    const existingPayment = await prisma.transaction.findFirst({
      where: { externalId: paymentId }
    });

    if (existingPayment) {
      return NextResponse.json({ error: "Paiement déjà traité" }, { status: 400 });
    }

    // Créer une transaction en attente
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "DEPOSIT",
        currency: "PI",
        amount: parseFloat(amount),
        status: "PENDING",
        externalId: paymentId,
        description: memo || "Demande de paiement Pi Network",
        metadata: {
          paymentType: "receive_request",
          requestedAt: new Date().toISOString(),
        }
      }
    });

    console.log(`[RECEIVE-PAYMENT] Transaction created: ${transaction.id}`);

    // Ici, vous devriez appeler l'API Pi Network pour approuver le paiement
    // Pour l'instant, on retourne simplement la confirmation
    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      paymentId,
      message: "Paiement en attente d'approbation"
    });

  } catch (error: any) {
    console.error("[RECEIVE-PAYMENT] Error:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
