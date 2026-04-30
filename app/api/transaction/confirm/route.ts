export const dynamic = 'force-dynamic';

import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { verifyTotp } from '@/lib/totp';
import { autoConvertFeeToPi } from '@/lib/auto-fee-conversion';

/**
 * POST /api/transaction/confirm
 * Confirm or reject a pending transaction with MFA
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionId, userId, pin, code, method, action } = body;

    if (!transactionId || !userId) {
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
    if (transaction.toUserId !== userId) {
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
      // BUG FIX: rembourser l'agent à l'expiration ici aussi
      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'EXPIRED' }
        });
        if (transaction.fromWalletId) {
          const refundAmount = transaction.amount - (transaction.fee * 0.5);
          await tx.wallet.update({
            where: { id: transaction.fromWalletId },
            data: { balance: { increment: refundAmount } }
          });
        }
      });

      return NextResponse.json(
        { error: "Transaction expiree" },
        { status: 400 }
      );
    }

    // Handle rejection (explicit reject action)
    if (action === 'reject') {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'REJECTED' }
      });

      // Rembourser l'agent : il a été débité de (amount - agentCommission)
      // agentCommission = fee * 0.5, donc montant remboursé = amount - fee/2
      if (transaction.fromWalletId) {
        const refundAmount = transaction.amount - (transaction.fee * 0.5);
        await prisma.wallet.update({
          where: { id: transaction.fromWalletId },
          data: { balance: { increment: refundAmount } }
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

      verified = verifyTotp(user.twoFactorSecret, code);
    } else if (method === 'pin' && pin) {
      // Verify PIN
      if (!user?.pin) {
        return NextResponse.json(
          { error: "PIN non configure" },
          { status: 400 }
        );
      }

      verified = await bcrypt.compare(pin, user.pin);
    } else {
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

    // Confirm the transaction atomiquement
    const result = await prisma.$transaction(async (tx) => {
      // Update transaction status
      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'SUCCESS' }
      });

      // BUG FIX: Créditer le wallet du client (était manquant si toWalletId null)
      if (transaction.toWalletId) {
        await tx.wallet.update({
          where: { id: transaction.toWalletId },
          data: { balance: { increment: transaction.netAmount ?? 0 } }
        });
      } else {
        // Fallback : créer le wallet si nécessaire
        await tx.wallet.upsert({
          where: { userId_currency: { userId: userId, currency: transaction.currency } },
          update: { balance: { increment: transaction.netAmount ?? 0 } },
          create: {
            userId: userId,
            currency: transaction.currency,
            balance: transaction.netAmount ?? 0,
            type: transaction.currency === 'PI' ? 'PI' : 'FIAT'
          }
        });
      }

      // Notification succès au client
      await tx.notification.create({
        data: {
          userId: userId,
          title: "Depot confirme !",
          message: `Votre compte a ete credite de ${transaction.netAmount?.toLocaleString()} ${transaction.currency}.`,
          type: "SUCCESS",
          metadata: {
            transactionId: transaction.id,
            amount: transaction.netAmount,
            currency: transaction.currency,
            reference: transaction.reference
          }
        }
      });

      // BUG FIX: Notification à l'agent que la transaction a été confirmée
      if (transaction.fromUserId) {
        await tx.notification.create({
          data: {
            userId: transaction.fromUserId,
            title: "Depot confirme par le client",
            message: `Le client a confirme le depot de ${transaction.amount?.toLocaleString()} ${transaction.currency}. Ref: ${transaction.reference}`,
            type: "SUCCESS",
            metadata: {
              transactionId: transaction.id,
              amount: transaction.amount,
              netAmount: transaction.netAmount,
              currency: transaction.currency,
              reference: transaction.reference
            }
          }
        });
      }

      // BUG FIX: Mise à jour des stats globales (était absente sur le chemin requireConfirmation)
      await tx.systemConfig.upsert({
        where: { id: "GLOBAL_CONFIG" },
        update: {
          totalVolumePi: transaction.currency === 'PI' ? { increment: transaction.amount } : undefined,
          totalProfit: { increment: (transaction.fee ?? 0) * 0.5 } // 50% des frais = part plateforme
        },
        create: {
          id: "GLOBAL_CONFIG",
          totalProfit: (transaction.fee ?? 0) * 0.5
        }
      }).catch(() => {}); // Non-bloquant si la table n'a pas ces champs

      return updatedTx;
    });

    // BUG FIX: Auto-conversion des frais plateforme en PI (était absente sur ce chemin)
    const platformFee = (transaction.fee ?? 0) * 0.5;
    if (platformFee > 0) {
      autoConvertFeeToPi(
        platformFee,
        transaction.currency,
        transaction.id,
        transaction.reference ?? ''
      ).catch((err) => {
        console.error("[TRANSACTION_CONFIRM] Fee conversion error (non-blocking):", getErrorMessage(err));
      });
    }

    return NextResponse.json({
      success: true,
      status: 'SUCCESS',
      transaction: result
    });

  } catch (error: unknown) {
    console.error("Transaction Confirm Error:", getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Erreur lors de la confirmation" },
      { status: 500 }
    );
  }
}
