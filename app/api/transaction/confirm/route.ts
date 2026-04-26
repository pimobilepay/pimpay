export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { verifyTOTP } from '@/lib/totp';

/**
 * POST /api/transaction/confirm
 * Confirm or reject a pending transaction with MFA
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionId, userId, pin, code, method, action } = body;

    console.log("[v0] Transaction confirm request:", { transactionId, userId, method, action, hasPin: !!pin, hasCode: !!code });

    if (!transactionId || !userId) {
      console.log("[v0] Missing data - transactionId:", transactionId, "userId:", userId);
      return NextResponse.json(
        { error: "Donnees manquantes" },
        { status: 400 }
      );
    }

    // Get the pending transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        toUser: {
          select: {
            id: true,
            pin: true,
            twoFactorSecret: true,
            twoFactorEnabled: true,
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction introuvable" },
        { status: 404 }
      );
    }

    // Check if the user is the recipient
    console.log("[v0] Transaction toUserId:", transaction.toUserId, "Request userId:", userId);
    if (transaction.toUserId !== userId) {
      console.log("[v0] User mismatch - transaction.toUserId:", transaction.toUserId, "!== userId:", userId);
      return NextResponse.json(
        { error: "Non autorise" },
        { status: 403 }
      );
    }

    // Check if transaction is pending confirmation
    if (transaction.status !== 'PENDING_CONFIRMATION') {
      return NextResponse.json(
        { error: "Transaction deja traitee" },
        { status: 400 }
      );
    }

    // Check if transaction has expired (5 minutes)
    const createdAt = new Date(transaction.createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    
    if (diffMinutes > 5) {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'EXPIRED' }
      });
      
      return NextResponse.json(
        { error: "Transaction expiree" },
        { status: 400 }
      );
    }

    // Handle rejection
    if (action === 'reject') {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'REJECTED' }
      });

      // Refund the agent's float
      if (transaction.fromWalletId) {
        await prisma.wallet.update({
          where: { id: transaction.fromWalletId },
          data: { balance: { increment: transaction.amount } }
        });
      }

      return NextResponse.json({ success: true, status: 'REJECTED' });
    }

    // Verify MFA
    const user = transaction.toUser;
    let verified = false;

    if (method === 'totp' && code) {
      // Verify TOTP code
      if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
        return NextResponse.json(
          { error: "2FA non active" },
          { status: 400 }
        );
      }

      verified = verifyTOTP(code, user.twoFactorSecret);
    } else if (method === 'pin' && pin) {
      // Verify PIN
      console.log("[v0] Verifying PIN - user has pin:", !!user?.pin);
      if (!user?.pin) {
        return NextResponse.json(
          { error: "PIN non configure" },
          { status: 400 }
        );
      }

      verified = await bcrypt.compare(pin, user.pin);
      console.log("[v0] PIN verification result:", verified);
    } else {
      console.log("[v0] Invalid verification method - method:", method, "hasPin:", !!pin, "hasCode:", !!code);
      return NextResponse.json(
        { error: "Methode de verification invalide" },
        { status: 400 }
      );
    }

    if (!verified) {
      return NextResponse.json(
        { error: method === 'totp' ? "Code incorrect" : "PIN incorrect" },
        { status: 400 }
      );
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
          data: { balance: { increment: transaction.netAmount } }
        });
      }

      // Create success notification
      await tx.notification.create({
        data: {
          userId: userId,
          title: "Transaction confirmee",
          message: `Votre ${transaction.type === 'DEPOSIT' ? 'depot' : 'retrait'} de ${transaction.netAmount?.toLocaleString()} ${transaction.currency} a ete confirme.`,
          type: "SUCCESS",
          metadata: {
            transactionId: transaction.id,
            amount: transaction.netAmount,
            currency: transaction.currency
          }
        }
      });

      return updatedTx;
    });

    return NextResponse.json({
      success: true,
      status: 'SUCCESS',
      transaction: result
    });

  } catch (error: any) {
    console.error("Transaction Confirm Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la confirmation" },
      { status: 500 }
    );
  }
}
