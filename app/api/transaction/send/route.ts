export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { WalletType } from "@prisma/client";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";

export async function POST(req: Request) {
  try {
    // 1. Authentification
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await req.json();
    const { recipientId, amount, description } = body;
    const senderId = session.id;

    // 2. Validation
    const amountNum = parseFloat(amount);
    if (!recipientId || isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Donnees invalides" }, { status: 400 });
    }

    if (recipientId === senderId) {
      return NextResponse.json({ error: "Envoi a soi-meme impossible" }, { status: 400 });
    }

    // 3. Recuperation centralisee des frais
    const feeConfig = await getFeeConfig();
    const { feeAmount: fee, totalDebit: totalDeduction } = calculateFee(amountNum, feeConfig, "transfer");

    // 4. TRANSACTION ATOMIQUE AVEC TIMEOUT AUGMENTE
    const result = await prisma.$transaction(async (tx) => {
      // Verifier que le destinataire existe
      const recipientUser = await tx.user.findUnique({
        where: { id: recipientId },
        select: { id: true, username: true, name: true }
      });

      if (!recipientUser) {
        throw new Error("Destinataire introuvable");
      }

      // Recuperer l'expediteur pour les notifications
      const senderUser = await tx.user.findUnique({
        where: { id: senderId },
        select: { name: true, username: true }
      });
      const senderName = senderUser?.name || senderUser?.username || "Un utilisateur PimPay";

      // Lecture du wallet expediteur
      const senderWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: senderId, currency: "PI" } }
      });

      if (!senderWallet || senderWallet.balance < totalDeduction) {
        throw new Error("Solde insuffisant (incluant les frais)");
      }

      // Upsert pour le wallet destinataire - le creer s'il n'existe pas
      const recipientWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: recipientId, currency: "PI" } },
        update: { balance: { increment: amountNum } },
        create: {
          userId: recipientId,
          currency: "PI",
          balance: amountNum,
          type: WalletType.PI
        }
      });

      // Debiter l'expediteur
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: totalDeduction } },
      });

      // Creation du log de transaction
      const transactionRecord = await tx.transaction.create({
        data: {
          reference: `TX-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amountNum,
          fee: fee,
          netAmount: amountNum,
          type: "TRANSFER",
          status: "SUCCESS",
          description: description || `Transfert P2P vers @${recipientUser.username || recipientUser.name || 'Pioneer'}`,
          fromUserId: senderId,
          toUserId: recipientId,
          fromWalletId: senderWallet.id,
          toWalletId: recipientWallet.id,
          currency: "PI"
        },
      });

      // Creer une notification pour le destinataire
      await tx.notification.create({
        data: {
          userId: recipientId,
          title: "Paiement recu !",
          message: `Vous avez recu ${amountNum.toLocaleString()} PI de ${senderName}.`,
          type: "PAYMENT_RECEIVED",
          metadata: { 
            amount: amountNum, 
            currency: "PI", 
            senderName, 
            reference: transactionRecord.reference 
          },
        },
      }).catch(() => {});

      // Mise a jour des stats globales
      await tx.systemConfig.upsert({
        where: { id: "GLOBAL_CONFIG" },
        update: {
          totalVolumePi: { increment: amountNum },
          totalProfit: { increment: fee }
        },
        create: {
          id: "GLOBAL_CONFIG",
          totalVolumePi: amountNum,
          totalProfit: fee
        }
      }).catch(() => {});

      return { transactionRecord, fee };
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    // AUTO-CONVERSION DES FRAIS EN PI (sans intervention admin)
    if (result.fee > 0) {
      autoConvertFeeToPi(
        result.fee,
        "PI",
        result.transactionRecord.id,
        result.transactionRecord.reference
      ).catch((err) => {
        console.error("[SEND] Fee conversion error (non-blocking):", err.message);
      });
    }

    return NextResponse.json({ success: true, data: result.transactionRecord });

  } catch (error: any) {
    console.error("TRANSACTION_SEND_ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du transfert" },
      { status: 400 }
    );
  }
}
