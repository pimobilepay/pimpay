export const dynamic = 'force-dynamic';
import { getErrorMessage } from '@/lib/error-utils';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ : Vérifier que l'appelant est bien connecté
    const authUserId = await getAuthUserId();
    if (!authUserId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
    }

    // 2. RÉCUPÉRATION : Trouver la transaction PENDING appartenant à cet utilisateur
    const transaction = await prisma.transaction.findFirst({
      where: { 
        OR: [
          { reference: reference },
          { externalId: reference }
        ],
        status: "PENDING",
        toUserId: authUserId // Sécurité : on ne valide que si c'est pour MOI
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable ou déjà validée" }, { status: 404 });
    }

    // 3. CALCULS BANCAIRES
    const fee = transaction.fee || 0;
    const netAmount = transaction.amount - fee;

    // 4. ATOMICITÉ : Transaction Prisma
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Mise à jour ou création du Wallet (ex: PI ou USD)
      const wallet = await tx.wallet.upsert({
        where: {
          userId_currency: {
            userId: authUserId,
            currency: transaction.currency,
          },
        },
        update: {
          balance: { increment: netAmount },
        },
        create: {
          userId: authUserId,
          currency: transaction.currency,
          balance: netAmount,
          type: transaction.currency === "PI" ? "PI" : "FIAT",
        },
      });

      // B. Mise à jour de la transaction
      const completedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "SUCCESS",
          netAmount: netAmount,
          toWalletId: wallet.id,
          description: transaction.description || `Dépôt ${transaction.currency} réussi`
        },
      });

      // C. Création d'une notification pour l'utilisateur avec metadonnees
      await tx.notification.create({
        data: {
          userId: authUserId,
          title: "Depot recu !",
          message: `Votre compte a ete credite de ${netAmount.toLocaleString()} ${transaction.currency}.`,
          type: "SUCCESS",
          metadata: JSON.stringify({
            amount: netAmount,
            currency: transaction.currency,
            fee: fee,
            reference: transaction.reference,
            method: "Depot PimPay",
            status: "SUCCESS",
          }),
        }
      });

      return { completedTx, wallet, fee };
    }, { maxWait: 10000, timeout: 30000 });

    // AUTO-CONVERSION DES FRAIS EN PI (sans intervention admin)
    if (result.fee > 0) {
      autoConvertFeeToPi(
        result.fee,
        transaction.currency,
        result.completedTx.id,
        result.completedTx.reference
      ).catch((err) => {
        console.error("[DEPOSIT_CONFIRM] Fee conversion error (non-blocking):", getErrorMessage(err));
      });
    }

    return NextResponse.json({ 
      success: true, 
      status: "SUCCESS",
      balance: result.wallet.balance 
    });

  } catch (error: unknown) {
    console.error("[CONFIRM_ERROR]:", error);
    return NextResponse.json({
      error: "Erreur lors de la validation",
      message: getErrorMessage(error)
    }, { status: 500 });
  }
}
