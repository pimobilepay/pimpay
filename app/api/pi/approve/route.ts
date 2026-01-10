export const dynamic = "force-dynamic";

// CORRECTION : Import depuis 'next/server'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. Vérification de la session
    const session = await auth() as any; 
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { paymentId, amount } = body;

    if (!paymentId) {
      return NextResponse.json({ error: "PaymentId manquant" }, { status: 400 });
    }

    // 2. Approbation via l'API Pi Network
    const piApiKey = process.env.PI_API_KEY;
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${piApiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorDetail = await response.json();
      console.error("PI_API_ERROR:", errorDetail);
      throw new Error("Échec de l'approbation côté Pi Network");
    }

    // 3. Enregistrement dans la base de données Pimpay
    // On utilise 'upsert' pour éviter les erreurs de doublons sur la 'reference'
    await prisma.transaction.upsert({
      where: { reference: paymentId },
      update: {
        status: "PENDING", // Devient PENDING après approbation, sera COMPLETED après le txid
      },
      create: {
        reference: paymentId,
        amount: parseFloat(amount) || 0,
        type: "PAYMENT",
        status: "PENDING",
        fromUserId: session.user.id,
        description: "Paiement Pi Network (Approuvé)",
        currency: "PI",
        metadata: {
          platform: "pi-browser",
          approvedAt: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("PI_APPROVE_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
