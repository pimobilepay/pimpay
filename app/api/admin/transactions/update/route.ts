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

    // 1. Récupération de la transaction avec les relations
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // SÉCURITÉ : On bloque si la transaction n'est pas en PENDING
    if (tx.status !== TransactionStatus.PENDING) {
      return NextResponse.json({ error: `Transaction déjà finalisée (${tx.status})` }, { status: 400 });
    }

    const isApprove = action === 'approve';
    const newStatus = isApprove ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;

    const result = await prisma.$transaction(async (p) => {

      // 2. Mise à jour du statut de la transaction
      const updated = await p.transaction.update({
        where: { id: transactionId },
        data: {
          status: newStatus,
          note: `Admin Action: ${action.toUpperCase()} le ${new Date().toLocaleString('fr-FR')}`
        },
      });

      // 3. LOGIQUE D'APPROBATION (SUCCESS)
      if (isApprove) {
        // Mise à jour des statistiques globales (Volume Pi)
        if (tx.currency === "PI") {
          await p.systemConfig.update({
            where: { id: "GLOBAL_CONFIG" },
            data: { totalVolumePi: { increment: tx.amount } }
          });
        }

        // Cas Dépôt : On crédite enfin le portefeuille du destinataire
        if (tx.type === TransactionType.DEPOSIT && tx.toUserId) {
          await p.wallet.update({
            where: { userId_currency: { userId: tx.toUserId, currency: tx.currency } },
            data: { balance: { increment: tx.amount } }
          });
        }
        
        // Note: Pour un TRANSFER, les fonds sont déjà mouvementés au moment de l'envoi 
        // ou gérés par le statut SUCCESS ici si c'est un transfert manuel.
      }

      // 4. LOGIQUE DE REFUS (FAILED) - REMBOURSEMENT
      else {
        // Si c'est un retrait (WITHDRAW) ou un transfert qui a déjà débité l'expéditeur
        if ((tx.type === TransactionType.WITHDRAW || tx.type === TransactionType.TRANSFER) && tx.fromUserId) {
          const refundAmount = tx.amount + (tx.fee || 0);
          await p.wallet.update({
            where: { userId_currency: { userId: tx.fromUserId, currency: tx.currency } },
            data: { balance: { increment: refundAmount } }
          });
        }
      }

      // 5. NOTIFICATION UTILISATEUR
      const notificationUserId = tx.fromUserId || tx.toUserId;
      if (notificationUserId) {
        await p.notification.create({
          data: {
            userId: notificationUserId,
            title: isApprove ? "Opération validée ✅" : "Opération refusée ❌",
            message: isApprove
              ? `Votre ${tx.type.toLowerCase()} de ${tx.amount} ${tx.currency} a été approuvé avec succès.`
              : `Votre ${tx.type.toLowerCase()} de ${tx.amount} ${tx.currency} a été refusé.`,
            type: isApprove ? "success" : "error",
            metadata: { txRef: tx.reference }
          },
        });
      }

      // 6. AUDIT LOG (Pour l'historique admin)
      await p.auditLog.create({
        data: {
          adminId: adminId || null,
          action: isApprove ? "TRANSACTION_APPROVE" : "TRANSACTION_REJECT",
          targetId: notificationUserId,
          details: `TX: ${tx.reference} | Montant: ${tx.amount} ${tx.currency} | Statut final: ${newStatus}`,
        }
      });

      return updated;
    });

    return NextResponse.json({ success: true, status: result.status });

  } catch (error: any) {
    console.error("❌ [ADMIN_TX_UPDATE_ERROR]:", error.message);
    return NextResponse.json({ error: "Erreur serveur : " + error.message }, { status: 500 });
  }
}
