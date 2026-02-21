export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const { transactionId, action } = await req.json();

    if (!transactionId || !action) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 1. Récupération de la transaction avec les relations nécessaires
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        fromUser: true,
        toUser: true,
      }
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // SÉCURITÉ : Ne pas traiter une transaction déjà finalisée (SUCCESS ou COMPLETED dans ton Enum)
    if (tx.status === TransactionStatus.SUCCESS || tx.status === TransactionStatus.FAILED || tx.status === TransactionStatus.COMPLETED) {
      return NextResponse.json({ error: "Transaction déjà traitée" }, { status: 400 });
    }

    const isApprove = action === 'approve';
    const newStatus = isApprove ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;

    const result = await prisma.$transaction(async (p) => {
      
      // 2. Mise à jour de la transaction
      const updated = await p.transaction.update({
        where: { id: transactionId },
        data: {
          status: newStatus,
          note: `Admin Action: ${action} à ${new Date().toISOString()}`
        },
      });

      // 3. Logique de solde et Stats
      if (isApprove) {
        // Mise à jour des stats globales dans SystemConfig
        await p.systemConfig.update({
          where: { id: "GLOBAL_CONFIG" },
          data: {
            totalVolumePi: tx.currency === "PI" ? { increment: tx.amount } : undefined,
          }
        });

        // SI c'est un dépôt qui était en attente, on crédite le portefeuille de destination
        if (tx.type === "DEPOSIT" && tx.toUserId) {
             await p.wallet.update({
                where: { userId_currency: { userId: tx.toUserId, currency: tx.currency } },
                data: { balance: { increment: tx.amount } }
             });
        }
      } 
      
      // 4. Logique de Rejet (Remboursement si c'était un retrait ou transfert)
      else if (!isApprove && tx.fromUserId) {
        await p.wallet.update({
          where: { userId_currency: { userId: tx.fromUserId, currency: tx.currency } },
          data: { balance: { increment: tx.amount + (tx.fee || 0) } }
        });
      }

      // 5. SYSTÈME DE NOTIFICATION (Vers l'initiateur de la transaction)
      const targetUserId = tx.fromUserId || tx.toUserId;
      if (targetUserId) {
        await p.notification.create({
          data: {
            userId: targetUserId,
            title: isApprove ? "Transaction Validée ✅" : "Transaction Refusée ❌",
            message: isApprove
              ? `Votre opération de ${tx.amount} ${tx.currency} a été approuvée.`
              : `Votre opération de ${tx.amount} ${tx.currency} a été rejetée. Les fonds (si déduits) ont été restitués.`,
            type: isApprove ? "success" : "error",
            metadata: { transactionId: tx.id, amount: tx.amount }
          },
        });
      }

      // 6. Audit Log (Lien avec le schéma : adminId et targetId)
      await p.auditLog.create({
        data: {
          action: isApprove ? "APPROVE_TRANSACTION" : "REJECT_TRANSACTION",
          details: `Statut: ${newStatus} | Type: ${tx.type} | Montant: ${tx.amount}`,
          targetId: targetUserId,
          // adminId: session.user.id (À ajouter si tu as une session admin active)
        }
      });

      return updated;
    });

    return NextResponse.json({ success: true, status: result.status });

  } catch (error: any) {
    console.error("CRITICAL_ERROR_PIMPAY:", error);
    return NextResponse.json({ error: "Erreur lors du traitement : " + error.message }, { status: 500 });
  }
}
