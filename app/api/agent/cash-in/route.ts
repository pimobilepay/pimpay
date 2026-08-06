export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getFeeConfig, calculateFee, splitAgentFee } from '@/lib/fees';
import { WalletType } from '@prisma/client';
import { autoConvertFeeToPi } from '@/lib/auto-fee-conversion';
import {
  creditAgentFloat,
  debitAgentFloat,
  getOrCreateAgentFloat,
  normalizeFloatCurrency,
} from '@/lib/agent-float-account';

/**
 * POST /api/agent/cash-in
 * Depot (cash-in) pour un client via l'agent.
 *
 * REGLE METIER : un depot est une transaction ENTRANTE pour le client.
 * Le client n'a donc RIEN a confirmer : le credit est immediat et il recoit
 * simplement une notification l'informant du depot.
 * Seul le cash-out (retrait) exige une confirmation du client.
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
    const { customerId, amount, description } = body;
    // Devise de caisse : toujours une devise float valide (XAF par defaut).
    const currency = normalizeFloatCurrency(body.currency);

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
    // Partage des frais pilote par l'admin (Admin > Reglages > Commission agent).
    const { agentCommission, platformFee: platformShare } = splitAgentFee(
      fee,
      feeConfig.agentFeeShare
    );

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

      // CAISSE AGENT : le float est un compte dedie (AgentFloat), jamais le
      // wallet personnel de l'agent. On verifie le disponible avant tout.
      const agentFloat = await getOrCreateAgentFloat(tx, authUser.id, currency);
      const availableFloat = agentFloat.balance - agentFloat.reserved;

      if (availableFloat < amountNum) {
        throw new Error(
          `Float ${currency} insuffisant : disponible ${availableFloat.toLocaleString('fr-FR')} ${currency}`
        );
      }

      // Nom de l'agent pour la notification client
      const agent = await tx.user.findUnique({
        where: { id: authUser.id },
        select: { name: true, username: true }
      });
      const agentName = agent?.name || agent?.username || 'Agent';

      // Créditer immédiatement le wallet du client (transaction entrante)
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

      // Débiter la CAISSE agent (il conserve sa commission dans sa caisse).
      // Le wallet personnel de l'agent n'est jamais touché.
      await debitAgentFloat(tx, authUser.id, amountNum, currency);
      if (agentCommission > 0) {
        await creditAgentFloat(tx, authUser.id, agentCommission, currency);
      }
      const newFloatBalance = agentFloat.balance - amountNum + agentCommission;

      // Créer l'enregistrement de transaction (directement validée)
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
          // Aucun fromWalletId : les fonds proviennent de la caisse agent
          // (AgentFloat), pas d'un wallet personnel.
          toWalletId: customerWallet.id,
          currency,
          metadata: {
            source: 'AGENT_FLOAT',
            agentFloatId: agentFloat.id,
            agentCommission,
            floatBalanceAfter: newFloatBalance,
          }
        }
      });

      // Notification d'information au client (aucune action requise de sa part)
      await tx.notification.create({
        data: {
          userId: customerId,
          title: "Dépôt reçu !",
          message: `Votre compte a été crédité de ${netAmount.toLocaleString()} ${currency} par ${agentName}.`,
          type: "DEPOSIT",
          metadata: {
            transactionId: transaction.id,
            direction: 'in',
            type: 'DEPOSIT',
            amount: amountNum,
            netAmount,
            fee,
            currency,
            agentId: authUser.id,
            agentName,
            reference: transaction.reference
          }
        }
      });

      // Mise à jour des stats globales
      await tx.systemConfig.upsert({
        where: { id: "GLOBAL_CONFIG" },
        update: {
          totalVolumePi: currency === 'PI' ? { increment: amountNum } : undefined,
          totalProfit: { increment: platformShare }
        },
        create: {
          id: "GLOBAL_CONFIG",
          totalProfit: platformShare
        }
      }).catch(() => {});

      return {
        transaction,
        newAgentBalance: newFloatBalance,
        platformFee: platformShare // Part plateforme = frais totaux - commission agent
      };
    }, { maxWait: 10000, timeout: 30000 });

    // AUTO-CONVERSION DES FRAIS EN PI (sans intervention admin)
    // On convertit seulement la part plateforme, le reste va a l'agent.
    const platformFee = result.platformFee;
    if (platformFee > 0) {
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
      // Un depot n'est jamais mis en attente de confirmation client.
      pendingConfirmation: false
    });

  } catch (error: any) {
    console.error("Agent Cash-In Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du dépôt" },
      { status: 400 }
    );
  }
}
