export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionStatus, TransactionType } from '@prisma/client';

// Fonction utilitaire pour exécuter la transaction avec retry automatique
async function executeWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable =
        error.code === 'P2034' || // Serialization failure
        error.code === 'P2024' || // Transaction timeout / not found
        (error.message && error.message.includes('Transaction not found'));

      if (isRetryable && attempt < retries) {
        // Attente exponentielle avant de retenter
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Nombre maximum de tentatives atteint');
}

export async function POST(req: Request) {
  try {
    const { transactionId, action, adminId } = await req.json();

    if (!transactionId || !action) {
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
    }

    // 1. Verification hors transaction (pas de lock inutile)
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    if (tx.status !== TransactionStatus.PENDING) {
      return NextResponse.json({ error: `Deja finalisee (${tx.status})` }, { status: 400 });
    }

    const isApprove = action === 'approve';
    const newStatus = isApprove ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;

    // 2. Transaction atomique avec retry automatique (sans Serializable pour eviter les deadlocks)
    const result = await executeWithRetry(() =>
      prisma.$transaction(async (p) => {

        // Re-verification dans la transaction pour eviter les race conditions
        const freshTx = await p.transaction.findUnique({
          where: { id: transactionId },
        });

        if (!freshTx || freshTx.status !== TransactionStatus.PENDING) {
          throw new Error('ALREADY_PROCESSED');
        }

        // Mise a jour de la transaction
        const existingMeta = (typeof tx.metadata === 'object' && tx.metadata !== null) ? tx.metadata : {};
        const updated = await p.transaction.update({
          where: { id: transactionId },
          data: {
            status: newStatus,
            note: `Admin Action: ${action.toUpperCase()} le ${new Date().toLocaleString('fr-FR')}`,
            metadata: { ...existingMeta, approvedBy: adminId || 'system' } as any,
          },
        });

        if (isApprove) {
          // Stats Globales Pi
          if (tx.currency === "PI") {
            await p.systemConfig.update({
              where: { id: "GLOBAL_CONFIG" },
              data: { totalVolumePi: { increment: tx.amount } }
            });
          }

          // Credit du portefeuille pour un Depot
          if (tx.type === TransactionType.DEPOSIT && tx.toUserId) {
            await p.wallet.update({
              where: {
                userId_currency: {
                  userId: tx.toUserId,
                  currency: tx.currency
                }
              },
              data: { balance: { increment: tx.amount } }
            });
          }
        } else {
          // Remboursement si Refus (pour Retraits et Transferts)
          if ((tx.type === TransactionType.WITHDRAW || tx.type === TransactionType.TRANSFER) && tx.fromUserId) {
            const refundAmount = tx.amount + (tx.fee || 0);
            await p.wallet.update({
              where: {
                userId_currency: {
                  userId: tx.fromUserId,
                  currency: tx.currency
                }
              },
              data: { balance: { increment: refundAmount } }
            });
          }
        }

        // 3. Notifications et Logs
        const targetId = tx.type === TransactionType.DEPOSIT ? tx.toUserId : tx.fromUserId;

        if (targetId) {
          await p.notification.create({
            data: {
              userId: targetId,
              title: isApprove ? "Operation validee" : "Operation refusee",
              message: `Votre ${tx.type.toLowerCase()} de ${tx.amount} ${tx.currency} a ete ${isApprove ? 'valide' : 'refuse'}.`,
              type: isApprove ? "success" : "error",
              metadata: { txRef: tx.reference }
            }
          });

          await p.auditLog.create({
            data: {
              adminId: adminId || null,
              action: isApprove ? "TRANSACTION_APPROVE" : "TRANSACTION_REJECT",
              targetId: targetId,
              details: `TX: ${tx.reference} | Statut: ${newStatus}`,
            }
          });
        }

        return updated;
      }, {
        maxWait: 10000,
        timeout: 30000,
      })
    );

    return NextResponse.json({ success: true, status: result.status });

  } catch (error: any) {
    console.error("PIMPAY_ERROR admin/transactions/update:", error.message || error);

    if (error.message === 'ALREADY_PROCESSED') {
      return NextResponse.json({
        error: "Cette transaction a deja ete traitee. Rafraichissez la page."
      }, { status: 409 });
    }

    if (error.code === 'P2024' || (error.message && error.message.includes('Transaction not found'))) {
      return NextResponse.json({
        error: "Connexion perdue avec la base de donnees. Veuillez reessayer."
      }, { status: 504 });
    }

    return NextResponse.json({
      error: "Erreur serveur. Veuillez reessayer."
    }, { status: 500 });
  }
}
