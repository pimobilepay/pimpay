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

    // --- 1. RÉCUPÉRATION DU USERID (Sécurisée) ---
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    let userId = null;

    if (token) {
      try {
        const secretKey = new TextEncoder().encode(JWT_SECRET || "");
        const { payload } = await jwtVerify(token, secretKey);
        userId = payload.id;
      } catch (e) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Identification requise" }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, txid } = body;

    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Paiement non identifiable" }, { status: 400 });
    }

    // --- 2. VÉRIFICATION DE LA TRANSACTION DANS PIMPAY ---
    const transaction = await prisma.transaction.findUnique({
      where: { externalId: paymentId }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // Si déjà validée, on ne crédite pas deux fois !
    if (transaction.status === "SUCCESS") {
      return NextResponse.json({ message: "Déjà crédité", success: true });
    }

    // --- 3. FINALISATION AUPRÈS DE PI NETWORK (S2S) ---
    const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid }),
    });

    if (!piRes.ok) {
      const errorData = await piRes.json();
      console.error("❌ Erreur Pi Network /complete:", errorData);
      // On continue quand même si l'erreur est "already completed"
      if (errorData.message !== "Payment already completed") {
         return NextResponse.json({ error: "Pi Network n'a pas validé la complétion" }, { status: 403 });
      }
    }

    // --- 4. MISE À JOUR ATOMIQUE (BANQUE) ---
    const result = await prisma.$transaction(async (tx) => {
      // 1. Trouver le wallet PI
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: "PI" } }
      });

      if (!wallet) {
        throw new Error("Portefeuille PI introuvable pour cet utilisateur.");
      }

      // 2. Mettre à jour la transaction
      const updated = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "SUCCESS",
          blockchainTx: txid,
          metadata: {
            ...(transaction.metadata || {}),
            completedAt: new Date().toISOString(),
            piServerConfirmed: true
          }
        }
      });

      // 3. Ajouter les fonds (Incrémentation sécurisée)
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: transaction.amount }
        }
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: "Félicitations ! Votre solde PimPay a été mis à jour.",
      amount: transaction.amount
    });

  } catch (error) {
    console.error("❌ [COMPLETE_ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
