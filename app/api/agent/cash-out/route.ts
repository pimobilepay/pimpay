export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getFeeConfig, calculateFee } from '@/lib/fees';
import { WalletType } from '@prisma/client';
import { autoConvertFeeToPi } from '@/lib/auto-fee-conversion';

/**
 * POST /api/agent/cash-out
 * Effectue un retrait (cash-out) pour un client via l'agent
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
    const { customerId, amount, currency = 'XAF', description } = body;

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
    const { feeAmount: fee, totalDebit } = calculateFee(amountNum, feeConfig, "withdraw");
    const agentCommission = fee * 0.5; // L'agent garde 50% des frais

    // 5. Transaction atomique
    const result = await prisma.$transaction(async (tx) => {
      // Vérifier que le client existe
      const customer = await tx.user.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, username: true }
      });

      if (!customer) {
        throw new Error("Client introuvable");
      }

      // Récupérer le wallet du client
      const customerWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: customerId, currency } }
      });

      if (!customerWallet || customerWallet.balance < totalDebit) {
        throw new Error("Solde client insuffisant");
      }

      // Débiter le wallet du client
      await tx.wallet.update({
        where: { id: customerWallet.id },
        data: { balance: { decrement: totalDebit } }
      });

      // Créditer le float de l'agent
      const agentWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: authUser.id, currency } },
        update: { balance: { increment: amountNum + agentCommission } },
        create: {
          userId: authUser.id,
          currency,
          balance: amountNum + agentCommission,
          type: currency === 'PI' ? WalletType.PI : WalletType.FIAT
        }
      });

      // Créer l'enregistrement de transaction
      const transaction = await tx.transaction.create({
        data: {
          reference: `CO-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amountNum,
          fee,
          netAmount: amountNum,
          type: 'WITHDRAW',
          status: 'SUCCESS',
          description: description || `Retrait agent - ${currency}`,
          fromUserId: customerId,
          toUserId: authUser.id,
          fromWalletId: customerWallet.id,
          toWalletId: agentWallet.id,
          currency
        }
      });

      // Notification au client
      await tx.notification.create({
        data: {
          userId: customerId,
          title: "Retrait effectué",
          message: `Vous avez retiré ${amountNum.toLocaleString()} ${currency}. Frais: ${fee.toLocaleString()} ${currency}.`,
          type: "WITHDRAW",
          metadata: {
            amount: amountNum,
            fee,
            currency,
            agentId: authUser.id,
            reference: transaction.reference
          }
        }
      });

      // Mise à jour des stats globales
      await tx.systemConfig.upsert({
        where: { id: "GLOBAL_CONFIG" },
        update: {
          totalProfit: { increment: fee - agentCommission }
        },
        create: {
          id: "GLOBAL_CONFIG",
          totalProfit: fee - agentCommission
        }
      }).catch(() => {});

      return { transaction, newAgentBalance: agentWallet.balance, platformFee: fee - agentCommission };
    }, { maxWait: 10000, timeout: 30000 });

    // AUTO-CONVERSION DES FRAIS EN PI (sans intervention admin)
    // On convertit seulement les frais de la plateforme (50%), l'autre moitie va a l'agent
    if (result.platformFee > 0) {
      autoConvertFeeToPi(
        result.platformFee,
        currency,
        result.transaction.id,
        result.transaction.reference
      ).catch((err) => {
        console.error("[AGENT_CASH_OUT] Fee conversion error (non-blocking):", err.message);
      });
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      newFloatBalance: result.newAgentBalance
    });

  } catch (error: any) {
    console.error("Agent Cash-Out Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du retrait" },
      { status: 400 }
    );
  }
}
