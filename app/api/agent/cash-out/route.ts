export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getFeeConfig, calculateFee, splitAgentFee } from '@/lib/fees';
import { WalletType } from '@prisma/client';
import { autoConvertFeeToPi } from '@/lib/auto-fee-conversion';
import { CONFIRMATION_WINDOW_MS } from '@/lib/agent-pending';

/**
 * POST /api/agent/cash-out
 * Retrait (cash-out) d'un client via l'agent.
 *
 * REGLE METIER : un retrait est une transaction SORTANTE pour le client.
 * C'est donc CETTE operation qui exige la confirmation du client (PIN / 2FA)
 * avant que l'agent ne recoive les fonds.
 *
 * Pendant la fenetre de confirmation (5 min), le montant + les frais sont mis
 * en reserve sur le wallet du client afin d'eviter toute double depense. Le
 * float de l'agent n'est credite qu'apres confirmation. En cas de refus ou
 * d'expiration, la reserve est integralement rendue au client.
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
    const {
      customerId,
      amount,
      currency = 'XAF',
      description,
      // Un retrait requiert la confirmation du client par defaut.
      requireConfirmation = true,
    } = body;

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
        select: { id: true, name: true, username: true, twoFactorEnabled: true }
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

      // Nom de l'agent pour la notification client
      const agent = await tx.user.findUnique({
        where: { id: authUser.id },
        select: { name: true, username: true }
      });
      const agentName = agent?.name || agent?.username || 'Agent';

      // Débiter (ou mettre en réserve) le wallet du client.
      // Dans les deux cas le montant quitte le solde disponible : cela évite
      // qu'il soit dépensé ailleurs pendant la fenêtre de confirmation.
      await tx.wallet.update({
        where: { id: customerWallet.id },
        data: { balance: { decrement: totalDebit } }
      });

      // Le float de l'agent n'est crédité qu'une fois la transaction confirmée.
      const agentWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: authUser.id, currency } },
        update: requireConfirmation
          ? {}
          : { balance: { increment: amountNum + agentCommission } },
        create: {
          userId: authUser.id,
          currency,
          balance: requireConfirmation ? 0 : amountNum + agentCommission,
          type: currency === 'PI' ? WalletType.PI : WalletType.FIAT
        }
      });

      const transactionStatus = requireConfirmation ? 'PENDING_CONFIRMATION' : 'SUCCESS';

      // Créer l'enregistrement de transaction
      const transaction = await tx.transaction.create({
        data: {
          reference: `CO-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: amountNum,
          fee,
          netAmount: amountNum,
          type: 'WITHDRAW',
          status: transactionStatus,
          description: description || `Retrait agent - ${currency}`,
          fromUserId: customerId,
          toUserId: authUser.id,
          fromWalletId: customerWallet.id,
          toWalletId: agentWallet.id,
          currency,
          // On fige la part agent au moment de la creation : si l'admin change
          // le taux pendant la fenetre de confirmation, le reglement utilise
          // bien le taux annonce a l'agent et au client.
          metadata: { agentFeeShare: feeConfig.agentFeeShare }
        }
      });

      if (requireConfirmation) {
        // Demande de confirmation MFA au client (transaction sortante)
        await tx.notification.create({
          data: {
            userId: customerId,
            title: "Confirmer le retrait",
            message: `Un retrait de ${amountNum.toLocaleString()} ${currency} requiert votre confirmation.`,
            type: "TRANSACTION_CONFIRM",
            metadata: {
              transactionId: transaction.id,
              type: 'WITHDRAW',
              direction: 'out',
              amount: amountNum,
              netAmount: amountNum,
              fee,
              totalDebit,
              currency,
              agentId: authUser.id,
              agentName,
              reference: transaction.reference,
              requireMFA: true,
              twoFactorEnabled: customer.twoFactorEnabled || false,
              expiresAt: new Date(Date.now() + CONFIRMATION_WINDOW_MS).toISOString()
            }
          }
        });
      } else {
        await tx.notification.create({
          data: {
            userId: customerId,
            title: "Retrait effectué",
            message: `Vous avez retiré ${amountNum.toLocaleString()} ${currency}. Frais: ${fee.toLocaleString()} ${currency}.`,
            type: "WITHDRAW",
            metadata: {
              transactionId: transaction.id,
              direction: 'out',
              type: 'WITHDRAW',
              amount: amountNum,
              fee,
              totalDebit,
              currency,
              agentId: authUser.id,
              agentName,
              reference: transaction.reference
            }
          }
        });

        // Mise à jour des stats globales (uniquement si déjà finalisée)
        await tx.systemConfig.upsert({
          where: { id: "GLOBAL_CONFIG" },
          update: {
            totalProfit: { increment: platformShare }
          },
          create: {
            id: "GLOBAL_CONFIG",
            totalProfit: platformShare
          }
        }).catch(() => {});
      }

      return {
        transaction,
        newAgentBalance: requireConfirmation
          ? agentWallet.balance
          : agentWallet.balance + amountNum + agentCommission,
        pendingConfirmation: requireConfirmation,
        platformFee: platformShare
      };
    }, { maxWait: 10000, timeout: 30000 });

    // AUTO-CONVERSION DES FRAIS EN PI (sans intervention admin)
    // On convertit seulement la part plateforme, le reste va a l'agent.
    // Si la transaction attend la confirmation du client, la conversion se fera
    // dans /api/transaction/confirm.
    if (result.platformFee > 0 && !result.pendingConfirmation) {
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
      transactionId: result.transaction.id,
      newFloatBalance: result.newAgentBalance,
      pendingConfirmation: result.pendingConfirmation
    });

  } catch (error: any) {
    console.error("Agent Cash-Out Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur lors du retrait" },
      { status: 400 }
    );
  }
}
