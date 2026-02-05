export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    
    // --- LE VACCIN : RÉCUPÉRATION DU USERID ---
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

    // 1. Trouver la transaction créée lors de l'étape "approve"
    const transaction = await prisma.transaction.findFirst({
      where: { externalId: paymentId }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // Sécurité contre le double-paiement
    if (transaction.status === "COMPLETED" || transaction.status === "SUCCESS") {
      return NextResponse.json({ message: "Transaction déjà traitée" });
    }

    // 2. TRANSACTION ATOMIQUE : On met à jour la transaction ET le solde du Wallet
    const result = await prisma.$transaction(async (tx) => {
      // Trouver le wallet PI
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: "PI" } }
      });

      if (!wallet) throw new Error("Wallet PI non trouvé");

      // Mettre à jour la transaction (Status: SUCCESS selon ton Enum)
      const updatedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "SUCCESS",
          blockchainTx: txid,
          metadata: {
            ...(transaction.metadata as any || {}),
            completedAt: new Date().toISOString(),
            txid
          }
        }
      });

      // Mettre à jour le solde du wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: transaction.amount }
        }
      });

      return updatedTx;
    });

    console.log(`[PIMPAY] Paiement finalisé: ${transaction.amount} π pour ${userId}`);

    return NextResponse.json({
      success: true,
      transactionId: result.id,
      txid,
      message: "Paiement complété et solde mis à jour"
    });

  } catch (error: any) {
    console.error("[COMPLETE-PAYMENT] Error:", error.message);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
