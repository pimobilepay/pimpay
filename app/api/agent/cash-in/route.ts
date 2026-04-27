export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getFeeConfig, calculateFee } from '@/lib/fees';
import { WalletType } from '@prisma/client';
import { autoConvertFeeToPi } from '@/lib/auto-fee-conversion';

/**
 * POST /api/agent/cash-in
 * Effectue un dépôt (cash-in) pour un client via l'agent
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentification
    const authUser = await verifyAuth(req) as any;

    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    // 2. Vérifier le rôle agent
    if (authUser.role !== 'AGENT' && authUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Accès réservé aux agents" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { customerId, amount, currency = 'XAF', description, requireConfirmation = false } = body;

    // 3. Validation des données
    const amountNum = parseFloat(amount);
    if (!customerId || isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Données invalides" },
        { status: 400 }
      );
    }

    // 4. Récupérer les frais
    const feeConfig = await getFeeConfig();
    const { feeAmount: fee } = calculateFee(amountNum, feeConfig, "deposit");
    const netAmount = amountNum - fee;
    const agentCommission = fee * 0.5; // L'agent garde 50% des frais

    // 5. Transaction atomique
    const result = await prisma.$transaction(async (tx) => {
      // Vérifier que le client existe
      const customer = await tx.user.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, username: true, twoFactorEnabled: true }
      });

      if (!customer) {
        throw new Error("Client introuvable");
      }

      // Récupérer le wallet de l'agent pour déduire le float
      const agentWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: authUser.id, currency } }
      });

      if (!agentWallet || agentWallet.balance < amountNum) {
        throw new Error("Float insuffisant");
      }

      // Get agent name for notification
      const agent = await tx.user.findUnique({
        where: { id: authUser.id },
        select: { name: true, username: true }
      });
      const agentName = agent?.name || agent?.username || 'Agent';

      // Créditer ou créer le wallet du client (sans ajouter le solde pour l'instant si confirmation requise)
      const customerWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: customerId, currency } },
        update: requireConfirmation ? {} : { balance: { increment: netAmount } },
        create: {
          userId: customerId,
          currency,
          balance: requireConfirmation ? 0 : netAmount,
          type: currency === 'PI' ? WalletType.PI : WalletType.FIAT
        }
      });

      // Déterminer le statut de la transaction
      const transactionStatus = requireConfirmation ? 'PENDING_CONFIRMATION' : 'SUCCESS';

      // Débiter le float de l'agent (toujours, même si en attente)
      await tx.wallet.update({
        where: { id: agentWallet.id },
        data: { balance: { decrement: amountNum - agentCommission } }
      });

      // Créer l'enregistrement de transaction
      const transaction = await tx.transaction.create({
        data: {
          reference: `CI-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amountNum,
          fee,
          netAmount,
          type: 'DEPOSIT',
          status: transactionStatus,
          description: description || `Dépôt agent - ${currency}`,
          fromUserId: authUser.id,
          toUserId: customerId,
          fromWalletId: agentWallet.id,
          toWalletId: customerWallet.id,
          currency
        }
      });

      // Notification au client
      if (requireConfirmation) {
        // Notification de demande de confirmation MFA
        await tx.notification.create({
          data: {
            userId: customerId,
            title: "Confirmer le dépôt",
            message: `Un dépôt de ${amountNum.toLocaleString()} ${currency} requiert votre confirmation.`,
            type: "TRANSACTION_CONFIRM",
            metadata: {
              transactionId: transaction.id,
              amount: amountNum,
              netAmount,
              currency,
              agentId: authUser.id,
              agentName,
              reference: transaction.reference,
              requireMFA: true,
              twoFactorEnabled: customer.twoFactorEnabled || false,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
            }
          }
        });
      } else {
        await tx.notification.create({
          data: {
            userId: customerId,
            title: "Dépôt reçu !",
            message: `Votre compte a été crédité de ${netAmount.toLocaleString()} ${currency}.`,
            type: "DEPOSIT",
            metadata: {
              amount: netAmount,
              currency,
              agentId: authUser.id,
              reference: transaction.reference
            }
          }
        });
      }

      // Mise à jour des stats globales (seulement si transaction confirmée)
      if (!requireConfirmation) {
        await tx.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: {
            totalVolumePi: currency === 'PI' ? { increment: amountNum } : undefined,
            totalProfit: { increment: fee - agentCommission }
          },
          create: {
            id: "GLOBAL_CONFIG",
            totalProfit: fee - agentCommission
          }
        }).catch(() => {});
      }

      return { 
        transaction, 
        newAgentBalance: agentWallet.balance - (amountNum - agentCommission),
        pendingConfirmation: requireConfirmation,
        platformFee: fee - agentCommission // Frais plateforme (50% des frais totaux)
      };
    }, { maxWait: 10000, timeout: 30000 });

    // AUTO-CONVERSION DES FRAIS EN PI (sans intervention admin)
    // On convertit seulement les frais de la plateforme (50%), l'autre moitie va a l'agent
    const platformFee = result.platformFee;
    if (platformFee > 0 && !result.pendingConfirmation) {
      autoConvertFeeToPi(
        platformFee,
        currency,
        result.transaction.id,
        result.transaction.reference
      ).catch((err) => {
        console.error("[AGENT_CASH_IN] Fee conversion error (non-blocking):", err.message);
      });
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      transactionId: result.transaction.id,
      newFloatBalance: result.newAgentBalance,
      pendingConfirmation: result.pendingConfirmation
    });

  } catch (error: any) {
    console.error("Agent Cash-In Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du dépôt" },
      { status: 400 }
    );
  }
}
