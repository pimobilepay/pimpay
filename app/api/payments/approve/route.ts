export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";

export async function POST(req: Request) {
  try {
    const { paymentId, amount, memo, txid } = await req.json(); // Ajout du txid si disponible
    const PI_API_KEY = process.env.PI_API_KEY;
    const JWT_SECRET = process.env.JWT_SECRET;

    // 1. AUTHENTIFICATION
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id;

    // 2. APPROBATION S2S (Server-to-Server)
    const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: "POST",
      headers: { 
        "Authorization": `Key ${PI_API_KEY}`, 
        "Content-Type": "application/json" 
      },
    });

    if (!approveRes.ok) {
      const err = await approveRes.json();
      console.error("❌ Erreur Pi Approve:", err);
      return NextResponse.json({ error: "Pi Network refuse l'approbation" }, { status: 403 });
    }

    // 3. TRANSACTION ATOMIQUE PRISMA
    const result = await prisma.$transaction(async (tx) => {
      // Vérifier si la transaction existe déjà
      const existing = await tx.transaction.findUnique({ 
        where: { externalId: paymentId } 
      });
      if (existing) return existing;

      // Création de la transaction avec le statut PENDING ou SUCCESS selon ton flux
      // Ici on met SUCCESS car on va appeler /complete juste après
      const newTx = await tx.transaction.create({
        data: {
          reference: `DEP-${paymentId.slice(-6).toUpperCase()}`,
          externalId: paymentId,
          blockchainTx: txid || null,
          amount: parseFloat(amount),
          currency: "PI",
          type: "DEPOSIT",
          status: "SUCCESS", // Aligné avec ton Enum TransactionStatus
          description: memo || "Dépôt Pi Network",
          toUserId: userId,
        }
      });

      // Trouver le wallet pour s'assurer qu'il existe
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: "PI" } }
      });

      if (!wallet) throw new Error("Wallet PI introuvable");

      // Incrémentation du solde
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: parseFloat(amount) } }
      });

      return newTx;
    });

    // 4. COMPLÉTION FINALE (Informer Pi que c'est bon)
    const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: { 
        "Authorization": `Key ${PI_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ txid: txid || "" }), // Important pour Pi
    });

    if (!completeRes.ok) {
      console.warn(`⚠️ Pi /complete en attente pour ${paymentId}`);
    }

    return NextResponse.json({ success: true, transaction: result });

  } catch (error) {
    console.error("❌ [PAYMENT_ERROR]:", error.message);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
