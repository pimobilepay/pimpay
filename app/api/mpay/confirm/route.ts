export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";

export async function POST(req: Request) {
  try {
    // 1. Authentification
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ success: false, message: "Non autorise" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, to, method, txid } = body;
    const senderId = session.id;

    // 2. Validation
    const amountNum = parseFloat(amount);
    if (!to || isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ success: false, message: "Donnees invalides" }, { status: 400 });
    }

    // 3. Find recipient by merchant ID or username
    let recipientId: string | null = null;
    
    // Check if it's a PIMPAY merchant ID format
    if (to.startsWith("PIMPAY-")) {
      const userIdPart = to.replace("PIMPAY-", "").toLowerCase();
      const recipient = await prisma.user.findFirst({
        where: {
          id: { startsWith: userIdPart }
        },
        select: { id: true }
      });
      recipientId = recipient?.id || null;
    } else {
      // Try to find by username
      const recipient = await prisma.user.findFirst({
        where: {
          OR: [
            { username: to.replace("@", "") },
            { id: to }
          ]
        },
        select: { id: true }
      });
      recipientId = recipient?.id || null;
    }

    if (!recipientId) {
      return NextResponse.json({ 
        success: false, 
        message: "Destinataire introuvable" 
      }, { status: 404 });
    }

    if (recipientId === senderId) {
      return NextResponse.json({ 
        success: false, 
        message: "Envoi a soi-meme impossible" 
      }, { status: 400 });
    }

    // 4. Get fee configuration
    const feeConfig = await getFeeConfig();
    const { feeAmount: fee, totalDebit: totalDeduction } = calculateFee(amountNum, feeConfig, "transfer");

    // 5. Execute transaction atomically
    const result = await prisma.$transaction(async (tx) => {
      // Get both wallets
      const [senderWallet, recipientWallet] = await Promise.all([
        tx.wallet.findUnique({
          where: { userId_currency: { userId: senderId, currency: "PI" } }
        }),
        tx.wallet.findUnique({
          where: { userId_currency: { userId: recipientId!, currency: "PI" } }
        })
      ]);

      if (!senderWallet || senderWallet.balance < totalDeduction) {
        throw new Error("Solde insuffisant");
      }

      if (!recipientWallet) {
        throw new Error("Le destinataire n'a pas de wallet Pi");
      }

      // Update balances
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: totalDeduction } },
      });

      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: amountNum } },
      });

      // Create transaction record
      const txRef = txid || `MPAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const transactionRecord = await tx.transaction.create({
        data: {
          reference: txRef,
          amount: amountNum,
          fee: fee,
          netAmount: amountNum,
          type: "TRANSFER",
          status: "SUCCESS",
          description: `mPay payment to ${to}`,
          fromUserId: senderId,
          toUserId: recipientId!,
          fromWalletId: senderWallet.id,
          toWalletId: recipientWallet.id,
          currency: "PI"
        },
      });

      // Create notification for recipient
      await tx.notification.create({
        data: {
          userId: recipientId!,
          title: "Paiement recu",
          message: `Vous avez recu ${amountNum} Pi via mPay`,
          type: "PAYMENT_RECEIVED",
          metadata: JSON.stringify({
            amount: amountNum,
            from: session.name || session.username || "Pioneer",
            txRef: txRef
          })
        }
      });

      // Update global stats if exists
      try {
        await tx.systemConfig.update({
          where: { id: "GLOBAL_CONFIG" },
          data: {
            totalVolumePi: { increment: amountNum },
            totalProfit: { increment: fee }
          }
        });
      } catch {
        // Ignore if systemConfig doesn't exist
      }

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
        console.error("[MPAY_CONFIRM] Fee conversion error (non-blocking):", err.message);
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Transaction confirmee",
      data: {
        txid: result.transactionRecord.reference,
        amount: result.transactionRecord.amount,
        fee: result.transactionRecord.fee,
        status: result.transactionRecord.status
      }
    });

  } catch (error: any) {
    console.error("MPAY_CONFIRM_ERROR:", error.message);
    return NextResponse.json(
      { success: false, message: error.message || "Erreur lors du paiement" },
      { status: 400 }
    );
  }
}
