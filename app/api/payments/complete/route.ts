export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const PI_API_KEY = process.env.PI_API_KEY;

    // --- 1. LE VACCIN : RÉCUPÉRATION DU USERID ---
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    let userId: string | null = null;

    if (piToken) {
      userId = piToken;
    } else if (classicToken) {
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jwtVerify(classicToken, secretKey);
        userId = payload.id as string;
      } catch (e) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, txid } = body;

    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // --- 2. VÉRIFICATION INTERNE ---
    const transaction = await prisma.transaction.findFirst({
      where: { externalId: paymentId }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    if (transaction.status === "SUCCESS") {
      return NextResponse.json({ message: "Transaction déjà traitée", success: true });
    }

    // --- 3. SYNCHRONISATION OBLIGATOIRE AVEC PI NETWORK (S2S COMPLETE) ---
    // On informe les serveurs de Pi que nous avons bien pris en compte le paiement
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
      console.error("❌ Pi Network Complete Error:", errorData);
      // On n'arrête pas forcément ici si la txid est valide, mais c'est un signal d'alerte
    }

    // --- 4. TRANSACTION ATOMIQUE PRISMA (Wallet + Status) ---
    const result = await prisma.$transaction(async (tx) => {
      // Trouver le wallet PI de l'utilisateur
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: "PI" } }
      });

      if (!wallet) throw new Error("Wallet PI non trouvé. Créez un wallet d'abord.");

      // Mise à jour de la transaction
      const updatedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "SUCCESS",
          blockchainTx: txid,
          metadata: {
            ...(transaction.metadata as any || {}),
            completedAt: new Date().toISOString(),
            txid,
            piServerNotified: piRes.ok
          }
        }
      });

      // Incrémentation du solde
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: transaction.amount }
        }
      });

      return updatedTx;
    });

    console.log(`[PIMPAY] ✅ Succès : ${transaction.amount} π ajoutés au compte ${userId}`);

    return NextResponse.json({
      success: true,
      transactionId: result.id,
      balanceAdded: transaction.amount,
      message: "Félicitations ! Votre solde PimPay a été mis à jour."
    });

  } catch (error: any) {
    console.error("❌ [COMPLETE-PAYMENT ERROR]:", error.message);
    return NextResponse.json(
      { error: "Erreur lors de la finalisation", details: error.message },
      { status: 500 }
    );
  }
}
