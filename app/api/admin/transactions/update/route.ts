import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { transactionId, action } = await req.json();

    if (!transactionId || !action) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 1. Récupérer la transaction actuelle pour obtenir l'utilisateur et le montant
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { fromUser: true }
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    const isApprove = action === 'approve';
    const newStatus = isApprove ? 'SUCCESS' : 'FAILED';

    // 2. Utilisation de $transaction pour sécuriser l'opération
    const result = await prisma.$transaction(async (p) => {
      // Mise à jour de la transaction
      const updated = await p.transaction.update({
        where: { id: transactionId },
        data: {
          status: newStatus,
          note: `Action effectuée par l'admin le ${new Date().toLocaleString()}`
        },
      });

      // Création de la notification pour l'utilisateur
      await p.notification.create({
        data: {
          userId: tx.fromUserId!,
          title: isApprove ? "Retrait Validé ✅" : "Retrait Refusé ❌",
          message: isApprove 
            ? `Votre retrait de ${tx.amount} ${tx.currency} a été approuvé et est en cours d'envoi.` 
            : `Votre retrait de ${tx.amount} ${tx.currency} a été rejeté. Le montant a été recrédité sur votre solde.`,
          type: isApprove ? "success" : "error",
        },
      });

      // 3. Gestion du solde en cas de REJET (FAILED)
      // Si la transaction est rejetée, on rend l'argent à l'utilisateur
      if (!isApprove && tx.fromUserId) {
        await p.wallet.update({
          where: {
            userId_currency: {
              userId: tx.fromUserId,
              currency: tx.currency
            }
          },
          data: {
            balance: {
              increment: tx.amount + (tx.fee || 0) // On rend le montant + les frais
            }
          }
        });
      }

      // 4. Log de l'action pour l'audit admin
      await p.auditLog.create({
        data: {
          action: isApprove ? "APPROVE_WITHDRAWAL" : "REJECT_WITHDRAWAL",
          details: `Transaction ${transactionId} traitée. Statut final: ${newStatus}`,
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
    console.error("Erreur Update Admin Pimpay:", error);
    return NextResponse.json({ error: "Erreur lors du traitement de la demande" }, { status: 500 });
  }
}
