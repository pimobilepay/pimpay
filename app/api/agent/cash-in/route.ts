export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getFeeConfig, calculateFee } from '@/lib/fees';
import { WalletType } from '@prisma/client';

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
    const { feeAmount: fee } = calculateFee(amountNum, feeConfig, "deposit");
    const netAmount = amountNum - fee;
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

      // Récupérer le wallet de l'agent pour déduire le float
      const agentWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: authUser.id, currency } }
      });

      if (!agentWallet || agentWallet.balance < amountNum) {
        throw new Error("Float insuffisant");
      }

      // Débiter le float de l'agent
      await tx.wallet.update({
        where: { id: agentWallet.id },
        data: { balance: { decrement: amountNum - agentCommission } }
      });

      // Créditer le wallet du client
      const customerWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: customerId, currency } },
        update: { balance: { increment: netAmount } },
        create: {
          userId: customerId,
          currency,
          balance: netAmount,
          type: currency === 'PI' ? WalletType.PI : WalletType.FIAT
        }
      });

      // Créer l'enregistrement de transaction
      const transaction = await tx.transaction.create({
        data: {
          reference: `CI-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amountNum,
          fee,
          netAmount,
          type: 'DEPOSIT',
          status: 'SUCCESS',
          description: description || `Dépôt agent - ${currency}`,
          fromUserId: authUser.id,
          toUserId: customerId,
          fromWalletId: agentWallet.id,
          toWalletId: customerWallet.id,
          currency
        }
      });

      // Notification au client
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

      // Mise à jour des stats globales
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

      return { transaction, newAgentBalance: agentWallet.balance - (amountNum - agentCommission) };
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      newFloatBalance: result.newAgentBalance
    });

  } catch (error: any) {
    console.error("Agent Cash-In Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du dépôt" },
      { status: 400 }
    );
  }
}
