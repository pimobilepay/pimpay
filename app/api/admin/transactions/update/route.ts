export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { transactionId, action } = await req.json();

    if (!transactionId || !action) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 1. Récupération de la transaction avec les infos utilisateur
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // SÉCURITÉ : Ne pas traiter une transaction déjà finalisée
    if (tx.status === 'SUCCESS' || tx.status === 'FAILED') {
      return NextResponse.json({ error: "Transaction déjà traitée" }, { status: 400 });
    }

    const isApprove = action === 'approve';
    const newStatus = isApprove ? 'SUCCESS' : 'FAILED';

    const result = await prisma.$transaction(async (p) => {
      // 2. Mise à jour de la transaction
      const updated = await p.transaction.update({
        where: { id: transactionId },
        data: {
          status: newStatus,
          note: `Admin Action: ${action} à ${new Date().toISOString()}`
        },
      });

      // 3. Logique de solde (Wallet) et Stats
      if (isApprove) {
        // Mise à jour des stats globales PimPay
        await p.systemConfig.update({
          where: { id: "GLOBAL_CONFIG" },
          data: {
            totalVolumePi: tx.currency === "PI" ? { increment: tx.amount } : undefined,
          }
        });
      } else if (tx.fromUserId) {
        // En cas de rejet : on recrédite le montant + les frais prélevés à l'origine
        await p.wallet.update({
          where: {
            userId_currency: {
              userId: tx.fromUserId,
              currency: tx.currency
            }
          },
          data: {
            balance: {
              increment: tx.amount + (tx.fee || 0)
            }
          }
        });
      }

      // 4. SYSTÈME DE NOTIFICATION DYNAMIQUE
      if (tx.fromUserId) {
        await p.notification.create({
          data: {
            userId: tx.fromUserId,
            title: isApprove ? "Transaction Réussie ✅" : "Transaction Refusée ❌",
            message: isApprove
              ? `Votre retrait de ${tx.amount.toLocaleString()} ${tx.currency} a été validé par le système.`
              : `Votre retrait de ${tx.amount.toLocaleString()} ${tx.currency} a été rejeté. Les fonds ont été restitués.`,
            type: isApprove ? "success" : "error",
            // On stocke l'ID de la transaction dans les metadata pour le futur (clic sur notif)
            metadata: {
              transactionId: tx.id,
              amount: tx.amount,
              currency: tx.currency,
              timestamp: new Date().toISOString()
            }
          },
        });
      }

      // 5. Audit Log (Sécurité Banque)
      await p.auditLog.create({
        data: {
          action: isApprove ? "APPROVE_WITHDRAWAL" : "REJECT_WITHDRAWAL",
          details: `Statut: ${newStatus} | TX: ${transactionId}`,
          targetId: tx.fromUserId,
        }
      });

      return updated;
    });

    return NextResponse.json({ 
      success: true, 
      status: result.status 
    });

  } catch (error) {
    console.error("CRITICAL_ERROR_UPDATE_PIMPAY:", error);
    return NextResponse.json({ error: "Échec du traitement sécurisé" }, { status: 500 });
  }
}
