export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const PI_API_KEY = process.env.PI_API_KEY;
    const JWT_SECRET = process.env.JWT_SECRET;

    // --- 1. AUTHENTIFICATION ---
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id;

    const { paymentId, txid } = await request.json();
    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Données de paiement incomplètes" }, { status: 400 });
    }

    // --- 2. RÉCUPÉRATION DE LA TRANSACTION ---
    // On utilise findUnique car externalId est marqué @unique dans ton schéma
    const transaction = await prisma.transaction.findUnique({
      where: { externalId: paymentId }
    });

    if (!transaction) {
      console.error(`[PIMPAY] ❌ Transaction introuvable pour ID: ${paymentId}`);
      return NextResponse.json({ error: "Transaction non enregistrée en base" }, { status: 404 });
    }

    // Sécurité : Ne pas traiter deux fois
    if (transaction.status === "SUCCESS" || transaction.status === "COMPLETED") {
      return NextResponse.json({ success: true, message: "Déjà traité" });
    }

    // --- 3. VALIDATION PI NETWORK (S2S) ---
    const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid }),
    });

    const piData = await piRes.json();

    if (!piRes.ok) {
      // Si Pi dit que c'est déjà complété, on ne bloque pas l'utilisateur
      if (piData.message !== "Payment already completed") {
        console.error("❌ Pi Network Error:", piData);
        return NextResponse.json({ error: "Échec de validation Pi Network" }, { status: 403 });
      }
    }

    // --- 4. MISE À JOUR BANCAIRE ATOMIQUE ---
    const finalResult = await prisma.$transaction(async (tx) => {
      // Vérifier le Wallet PI de l'utilisateur
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: "PI" } }
      });

      if (!wallet) throw new Error("Wallet PI manquant.");

      // Mise à jour de la transaction (On utilise SUCCESS pour correspondre à ton Enum)
      const updatedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "SUCCESS",
          blockchainTx: txid,
          metadata: {
            ...(transaction.metadata || {}),
            completedAt: new Date().toISOString(),
            confirmedVia: "PiServer"
          }
        }
      });

      // Créditer le solde
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: transaction.amount } }
      });

      return updatedTx;
    });

    console.log(`[PIMPAY] ✅ Dépôt réussi: ${transaction.amount} PI pour ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Votre solde PimPay a été mis à jour avec succès !",
      amount: transaction.amount
    });

  } catch (error) {
    console.error("❌ [CRITICAL_PAYMENT_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur interne de traitement" }, { status: 500 });
  }
}
