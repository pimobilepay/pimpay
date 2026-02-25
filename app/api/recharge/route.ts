export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose"; // ✅ Changement : jose au lieu de jsonwebtoken
import { sendNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    // 1. SÉCURITÉ CONFIGURATION (Build-safe)
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Erreur configuration serveur" }, { status: 500 });
    }

    // 2. AUTHENTICATION (Cookies & Jose)
    const cookieStore = await cookies();
    const token = cookieStore.get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET));
      userId = payload.id as string;
    } catch (err) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // 3. RÉCUPÉRATION ET VALIDATION NUMÉRIQUE
    const body = await req.json().catch(() => ({}));
    const { phoneNumber, amount, operator, piAmount } = body;

    const parsedPiAmount = parseFloat(piAmount);

    if (!phoneNumber || isNaN(parsedPiAmount) || parsedPiAmount <= 0) {
      return NextResponse.json({ error: "Données de recharge invalides" }, { status: 400 });
    }

    // 4. VÉRIFICATION DU SOLDE (Wallet PI)
    const wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: "PI" } }
    });

    if (!wallet || wallet.balance < parsedPiAmount) {
      return NextResponse.json({ error: "Solde Pi insuffisant" }, { status: 400 });
    }

    // 5. TRANSACTION ATOMIQUE (Sécurité financière Pimpay)
    const result = await prisma.$transaction(async (tx) => {
      // Débiter le compte avec vérification de solde intégrée (Double sécurité)
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: parsedPiAmount } }
      });

      if (updatedWallet.balance < 0) {
        throw new Error("Erreur : Solde devenu négatif");
      }

      // Créer la transaction d'historique
      return await tx.transaction.create({
        data: {
          reference: `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          amount: parsedPiAmount,
          type: "PAYMENT",
          status: "SUCCESS", // Harmonisé avec tes enums
          description: `Recharge mobile ${operator || 'Global'} pour ${phoneNumber}`,
          fromUserId: userId,
          fromWalletId: wallet.id,
          metadata: { phoneNumber, operator, amountUSD: amount }
        },
      });
    });

    // 6. NOTIFICATION SYSTÈME (Non-bloquante pour la réponse)
    try {
      await sendNotification({
        userId,
        title: "Recharge réussie",
        message: `Votre recharge vers ${phoneNumber} a été effectuée.`,
        type: "success"
      });
    } catch (notifErr) {
      console.warn("Notification non envoyée:", notifErr);
    }

    return NextResponse.json({ 
      success: true, 
      txId: result.id,
      newBalance: result.amount // Optionnel pour mettre à jour l'UI
    });

  } catch (error: any) {
    console.error("RECHARGE_ERROR:", error);
    return NextResponse.json({ 
      error: "Échec du processus de recharge",
      details: error.message 
    }, { status: 500 });
  }
}
