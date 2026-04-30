export const dynamic = "force-dynamic";

import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTICATION via lib/auth.ts
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const userId = user.id;

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
    }, { maxWait: 10000, timeout: 30000 });    // 6. NOTIFICATION SYSTÈME (Non-bloquante pour la réponse)
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

  } catch (error: unknown) {
    console.error("RECHARGE_ERROR:", error);
    return NextResponse.json({ 
      error: "Échec du processus de recharge",
      details: getErrorMessage(error) 
    }, { status: 500 });
  }
}
