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

    // 1. AUTHENTIFICATION
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    // 2. APPROBATION (S2S)
    const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: { "Authorization": `Key ${PI_API_KEY}`, "Content-Type": "application/json" },
    });

    if (!approveRes.ok) {
      return NextResponse.json({ error: "Pi Network refuse l'approbation" }, { status: 403 });
    }

    // 3. TRANSACTION DANS LA BASE (Utilisation d'une Transaction Prisma pour la sécurité)
    // On crée la transaction ET on met à jour le solde en même temps
    const result = await prisma.$transaction(async (tx) => {
      // Vérifier si déjà traité
      const existing = await tx.transaction.findUnique({ where: { externalId: paymentId } });
      if (existing) throw new Error("Paiement déjà traité");

      // Créer l'enregistrement de la transaction
      const newTx = await tx.transaction.create({
        data: {
          reference: `DEP-${paymentId.slice(-6).toUpperCase()}`,
          externalId: paymentId,
          amount: parseFloat(amount),
          currency: "PI",
          type: "DEPOSIT",
          status: "COMPLETED", // On l'anticipe car on va appeler /complete
          description: memo || "Dépôt Pi Network",
          toUserId: userId,
        }
      });

      // CRÉDITER LE WALLET DE L'UTILISATEUR
      await tx.wallet.updateMany({
        where: { userId: userId, currency: "PI" },
        data: { balance: { increment: parseFloat(amount) } }
      });

      return newTx;
    });

    // 4. COMPLÉTION FINALE AUPRÈS DE PI (Indispensable !)
    const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: { "Authorization": `Key ${PI_API_KEY}`, "Content-Type": "application/json" },
    });

    if (!completeRes.ok) {
      console.error("⚠️ Erreur lors du /complete, mais DB mise à jour. PaymentId:", paymentId);
      // Optionnel: Logger pour intervention manuelle si le /complete échoue après le crédit DB
    }

    return NextResponse.json({ success: true, transaction: result });

  } catch (error: any) {
    console.error("❌ [PAYMENT_ERROR]:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
