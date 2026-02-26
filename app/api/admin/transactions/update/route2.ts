export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionStatus, TransactionType } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const { transactionId, action, adminId } = await req.json();

    if (!transactionId || !action) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // --- ÉTAPE 1 : VERIFICATION PRÉLIMINAIRE ---
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    if (tx.status !== TransactionStatus.PENDING) {
      return NextResponse.json({ error: `Déjà finalisée (${tx.status})` }, { status: 400 });
    }

    const isApprove = action === 'approve';
    const newStatus = isApprove ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;

    // --- ÉTAPE 2 : TRANSACTION ATOMIQUE ---
    // On passe un timeout plus long pour éviter les déconnexions sur mobile
    const result = await prisma.$transaction(async (p) => {

      // IMPORTANT : On met à jour la transaction EN PREMIER
      const updatedTx = await p.transaction.update({
        where: { id: transactionId },
        data: {
          status: newStatus,
          note: `Admin Action: ${action.toUpperCase()} le ${new Date().toLocaleString('fr-FR')}`
        },
      });

      if (isApprove) {
        // Stats Globales
        if (tx.currency === "PI") {
          await p.systemConfig.update({
            where: { id: "GLOBAL_CONFIG" },
            data: { totalVolumePi: { increment: tx.amount } }
          });
        }

        // Crédit du portefeuille (Cas Dépôt)
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
      }
      else {
        // Remboursement (Cas Refus Retrait/Transfert)
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

      // Notifications et Logs (Toujours via 'p' pour rester dans la transaction)
      const targetUserId = tx.fromUserId || tx.toUserId;
      if (targetUserId) {
        await p.notification.create({
          data: {
            userId: targetUserId,
            title: isApprove ? "Opération validée ✅" : "Opération refusée ❌",
            message: `Votre ${tx.type.toLowerCase()} de ${tx.amount} ${tx.currency} a été ${isApprove ? 'approuvé' : 'refusé'}.`,
            type: isApprove ? "success" : "error",
            metadata: { txRef: tx.reference }
          }
        });
      }

      await p.auditLog.create({
        data: {
          adminId: adminId || null,
          action: isApprove ? "TRANSACTION_APPROVE" : "TRANSACTION_REJECT",
          targetId: targetUserId,
          details: `TX: ${tx.reference} | Statut final: ${newStatus}`,
        }
      });

      return updatedTx;
    }, {
      timeout: 15000 // Augmente le temps limite à 15s pour éviter l'erreur de vos captures
    });

    return NextResponse.json({ success: true, status: result.status });

  } catch (error: any) {
    console.error("❌ ERROR UPDATE:", error.message);
    // On renvoie un message propre à l'interface
    return NextResponse.json({
      error: error.message.includes("Transaction not found")
        ? "La connexion a été perdue. Veuillez réessayer."
        : error.message
    }, { status: 500 });
  }
}
