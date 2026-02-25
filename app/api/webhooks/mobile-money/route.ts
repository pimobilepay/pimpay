import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Secret pour valider que l'appel vient bien de l'opérateur (à mettre dans .env)
const WEBHOOK_SECRET = process.env.MOBILE_MONEY_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference, status, externalId, amount, currency } = body;

    // 1. Trouver la transaction PENDING dans PimPay
    const transaction = await prisma.transaction.findUnique({
      where: { reference: reference },
      include: { toWallet: true, toUser: true }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction non trouvée" }, { status: 404 });
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json({ message: "Transaction déjà traitée" }, { status: 200 });
    }

    // 2. Si le paiement est réussi côté Opérateur
    if (status === "SUCCESSFUL" || status === "SUCCESS") {
      
      // UTILISATION D'UNE TRANSACTION PRISMA (Atomique)
      // On garantit que soit tout passe, soit rien ne passe (Évite les doublons/pertes)
      await prisma.$transaction([
        // A. Mettre à jour la transaction
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { 
            status: "SUCCESS", 
            externalId: externalId,
            netAmount: amount - (transaction.fee || 0) 
          },
        }),

        // B. Créditer le Wallet de l'utilisateur
        prisma.wallet.update({
          where: { id: transaction.toWalletId! },
          data: { 
            balance: { increment: amount } 
          },
        }),

        // C. Créer une notification pour l'utilisateur
        prisma.notification.create({
          data: {
            userId: transaction.toUserId!,
            title: "Dépôt Réussi ! ✅",
            message: `Votre dépôt de ${amount} ${currency} a été crédité sur votre compte PimPay.`,
            type: "payment",
          }
        }),

        // D. Log de sécurité pour l'audit
        prisma.securityLog.create({
          data: {
            userId: transaction.toUserId!,
            action: `DEPOSIT_MOBILE_SUCCESS_${reference}`,
            ip: "SYSTEM_WEBHOOK"
          }
        })
      ]);

      return NextResponse.json({ success: true, message: "Solde mis à jour" });
    } else {
      // Si l'opérateur dit que ça a échoué (ex: solde insuffisant du client)
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ success: false, message: "Transaction échouée" });
    }

  } catch (error) {
    console.error("WEBHOOK_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

