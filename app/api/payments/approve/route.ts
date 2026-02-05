export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { paymentId, amount, memo } = await req.json();
    const PI_API_KEY = process.env.PI_API_KEY;

    // 1. Protection : On récupère l'utilisateur qui fait l'action
    const cookieStore = await cookies();
    const userId = cookieStore.get("pi_session_token")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Session non identifiée" }, { status: 401 });
    }

    if (!PI_API_KEY) {
      return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });
    }

    // 2. Appel aux serveurs de Pi Network pour APPROUVER le paiement
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Pi API Error:", errorData);
      throw new Error("Approbation échouée auprès de Pi Network");
    }

    // 3. ENREGISTREMENT DANS PRISMA (Étape cruciale pour PimPay)
    // On crée une transaction en statut PENDING avec le paymentId en externalId
    await prisma.transaction.create({
      data: {
        reference: `RECV-${paymentId.slice(-8).toUpperCase()}`,
        externalId: paymentId, // On stocke l'ID Pi ici
        amount: parseFloat(amount) || 0,
        currency: "PI",
        type: "DEPOSIT",
        status: "PENDING", // En attente de la finalisation (txid)
        description: memo || "Réception Pi via SDK",
        toUserId: userId,
        metadata: {
          step: "approved",
          piPaymentId: paymentId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ [APPROVE_ERROR]:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
