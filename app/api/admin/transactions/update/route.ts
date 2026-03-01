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

    // 1. On récupère la transaction hors bloc transactionnel pour économiser des ressources
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { 
        fromUser: true, 
        toUser: true 
      }
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    if (tx.status !== TransactionStatus.PENDING) {
      return NextResponse.json({ error: `Déjà finalisée (${tx.status})` }, { status: 400 });
    }

    const isApprove = action === 'approve';
    const newStatus = isApprove ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;

    // 2. TRANSACTION ATOMIQUE OPTIMISÉE
    const result = await prisma.$transaction(async (p) => {
      
      // Mise à jour de la transaction
      const updated = await p.transaction.update({
        where: { id: transactionId },
        data: {
          status: newStatus,
          note: `Admin Action: ${action.toUpperCase()} le ${new Date().toLocaleString('fr-FR')}`,
          // On enregistre l'admin qui a fait l'action dans les métadonnées si besoin
          metadata: { ...(tx.metadata as object || {}), approvedBy: adminId }
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

        // Crédit du portefeuille pour un Dépôt
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

      // 3. LOGS ET NOTIFICATIONS (Détachés ou intégrés avec précaution)
      const targetId = tx.type === TransactionType.DEPOSIT ? tx.toUserId : tx.fromUserId;
      
      if (targetId) {
        await p.notification.create({
          data: {
            userId: targetId,
            title: isApprove ? "Opération validée ✅" : "Opération refusée ❌",
            message: `Votre ${tx.type.toLowerCase()} de ${tx.amount} ${tx.currency} a été ${isApprove ? 'validé' : 'refusé'}.`,
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
      isolationLevel: "Serializable" // Sécurité maximale pour PimPay
    });

    return NextResponse.json({ success: true, status: result.status });

  } catch (error: any) {
    console.error("❌ PIMPAY_ERROR:", error);
    
    // Gestion spécifique du timeout Prisma
    if (error.code === 'P2024') {
      return NextResponse.json({ 
        error: "Le serveur de base de données est trop lent. L'action a peut-être été effectuée, rafraîchissez la page." 
      }, { status: 504 });
    }

    return NextResponse.json({ 
      error: "Erreur réseau. Veuillez vérifier votre connexion et réessayer." 
    }, { status: 500 });
  }
}
