export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";

export async function POST(req: Request) {
  try {
    const { paymentId, amount, memo } = await req.json();
    const PI_API_KEY = process.env.PI_API_KEY;
    const JWT_SECRET = process.env.JWT_SECRET;

    // 🛡️ 1. AUTHENTIFICATION STRICTE (Comme sur les autres API)
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value; // On utilise ton token JWT principal

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Décryptage du token pour avoir le vrai ID utilisateur
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    if (!PI_API_KEY) {
      return NextResponse.json({ error: "Clé API Pi manquante" }, { status: 500 });
    }

    // 🛡️ 2. VÉRIFICATION DOUBLON (Sécurité Bancaire)
    const existingTx = await prisma.transaction.findUnique({
      where: { externalId: paymentId }
    });
    if (existingTx) {
      return NextResponse.json({ error: "Paiement déjà traité" }, { status: 400 });
    }

    // 🚀 3. APPROBATION AUPRÈS DE PI NETWORK (S2S)
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Pi API Rejection:", errorData);
      return NextResponse.json({ error: "Pi Network a refusé l'approbation" }, { status: 403 });
    }

    // 📊 4. ENREGISTREMENT PRISMA (Statut PENDING)
    await prisma.transaction.create({
      data: {
        reference: `RECV-${paymentId.slice(-8).toUpperCase()}`,
        externalId: paymentId,
        amount: parseFloat(amount) || 0,
        currency: "PI",
        type: "DEPOSIT",
        status: "PENDING",
        description: memo || "Dépôt PimPay via Pi Browser",
        toUserId: userId,
        metadata: {
          step: "approved",
          approvedAt: new Date().toISOString()
        }
      }
    });

    console.log(`✅ Paiement ${paymentId} approuvé pour l'utilisateur ${userId}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ [APPROVE_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur lors de l'approbation" }, { status: 500 });
  }
}
