export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { autoConvertFeeToPi } from "@/lib/auto-fee-conversion";

/**
 * POST /api/admin/transactions/confirm
 * Admin can confirm or reject agent-initiated transactions (PENDING_CONFIRMATION)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Admin verification
    const payload = (await adminAuth(req)) as unknown as { id: string; role: string } | null;
    
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { transactionId, action } = await req.json();
    
    if (!transactionId) {
      return NextResponse.json({ error: "ID de transaction manquant" }, { status: 400 });
    }

    if (!action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    // 2. Get the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        toUser: {
          select: { id: true, firstName: true, lastName: true }
        },
        fromUser: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // Only allow confirmation of PENDING_CONFIRMATION transactions
    if (transaction.status !== 'PENDING_CONFIRMATION') {
      return NextResponse.json(
        { error: "Cette transaction ne peut pas etre confirmee par l'admin" },
        { status: 400 }
      );
    }

    // 3. Process the action
    if (action === 'reject') {
      // Reject and refund agent
      const result = await prisma.$transaction(async (tx) => {
        // Update transaction status
        const updatedTx = await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'REJECTED' }
        });

        // Refund the agent's wallet
        if (transaction.fromWalletId) {
          await tx.wallet.update({
            where: { id: transaction.fromWalletId },
            data: { balance: { increment: transaction.amount } }
          });
        }

        // Notify the customer
        if (transaction.toUserId) {
          await tx.notification.create({
            data: {
              userId: transaction.toUserId,
              title: "Transaction annulee",
              message: `La transaction de ${transaction.netAmount?.toLocaleString() || transaction.amount.toLocaleString()} ${transaction.currency} a ete annulee par l'administrateur.`,
              type: "WARNING",
              metadata: {
                transactionId: transaction.id,
                amount: transaction.netAmount || transaction.amount,
                currency: transaction.currency,
                cancelledByAdmin: true
              }
            }
          });
        }

        return updatedTx;
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          adminId: payload.id,
          adminName: "ADMIN",
          action: "REJECT_AGENT_TRANSACTION",
          details: `Rejet de la transaction agent ${transactionId}`
        }
      }).catch(() => null);

      return NextResponse.json({ success: true, status: 'REJECTED', data: result });
    }

    // Confirm the transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update transaction status
      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'SUCCESS' }
      });

      // Credit the customer's wallet
      if (transaction.toWalletId) {
        await tx.wallet.update({
          where: { id: transaction.toWalletId },
          data: { balance: { increment: transaction.netAmount || transaction.amount } }
        });
      }

      // Notify the customer
      if (transaction.toUserId) {
        await tx.notification.create({
          data: {
            userId: transaction.toUserId,
            title: "Transaction confirmee",
            message: `Votre ${transaction.type === 'DEPOSIT' ? 'depot' : 'transaction'} de ${transaction.netAmount?.toLocaleString() || transaction.amount.toLocaleString()} ${transaction.currency} a ete confirme par l'administrateur.`,
            type: "SUCCESS",
            metadata: {
              transactionId: transaction.id,
              amount: transaction.netAmount || transaction.amount,
              currency: transaction.currency,
              confirmedByAdmin: true
            }
          }
        });
      }

      return updatedTx;
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: payload.id,
        adminName: "ADMIN",
        action: "CONFIRM_AGENT_TRANSACTION",
        details: `Confirmation de la transaction agent ${transactionId}`
      }
    }).catch(() => null);

    // AUTO-CONVERSION DES FRAIS EN PI (sans intervention admin)
    if (transaction.fee && transaction.fee > 0) {
      autoConvertFeeToPi(
        transaction.fee,
        transaction.currency,
        transaction.id,
        transaction.reference
      ).catch((err) => {
        console.error("[ADMIN_CONFIRM] Fee conversion error (non-blocking):", err.message);
      });
    }

    return NextResponse.json({ success: true, status: 'SUCCESS', data: result });

  } catch (error: any) {
    console.error("ADMIN_CONFIRM_TRANSACTION_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors du traitement" },
      { status: 500 }
    );
  }
}
