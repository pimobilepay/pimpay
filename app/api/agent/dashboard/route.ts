export const dynamic = 'force-dynamic';

import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/agent/dashboard
 * Récupère les données du tableau de bord agent (PimPayHub)
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Vérification de l'authentification
    const authUser = await verifyAuth(req) as any;

    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    // 2. Vérifier que l'utilisateur est bien un agent
    if (authUser.role !== 'AGENT' && authUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Accès réservé aux agents" },
        { status: 403 }
      );
    }

    // 3. Récupérer les informations de l'agent
    const agent = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        wallets: true,
        transactionsFrom: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            toUser: { select: { name: true, username: true } }
          }
        },
        transactionsTo: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            fromUser: { select: { name: true, username: true } }
          }
        }
      }
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent introuvable" },
        { status: 404 }
      );
    }

    // 4. Calculer le solde Float (XAF wallet)
    const xafWallet = agent.wallets.find(w => w.currency === 'XAF');
    const piWallet = agent.wallets.find(w => w.currency === 'PI');
    const floatBalance = xafWallet?.balance || 0;
    const piBalance = piWallet?.balance || 0;

    // 5. Calculer les statistiques du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: authUser.id },
          { toUserId: authUser.id }
        ],
        createdAt: { gte: today },
        status: 'SUCCESS'
      }
    });

    // Calcul des commissions journalières (basé sur les frais des transactions)
    const dailyCommission = todayTransactions.reduce((sum, tx) => {
      // L'agent gagne une partie des frais (ex: 50%)
      return sum + (tx.fee || 0) * 0.5;
    }, 0);

    const dailyVolume = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    // 6. Calculer la santé de liquidité (basée sur le ratio float/volume journalier)
    const avgDailyVolume = dailyVolume || 100000; // Valeur par défaut
    const liquidityHealth = Math.min(100, Math.round((floatBalance / avgDailyVolume) * 100));

    // 7. Données du graphique des commissions (7 derniers jours)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: authUser.id },
          { toUserId: authUser.id }
        ],
        createdAt: { gte: weekAgo },
        status: 'SUCCESS'
      }
    });

    const commissionByDay: Record<string, { commission: number; transactions: number }> = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Initialiser tous les jours
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayName = days[date.getDay()];
      commissionByDay[dayName] = { commission: 0, transactions: 0 };
    }

    // Remplir avec les vraies données
    weekTransactions.forEach(tx => {
      const dayName = days[new Date(tx.createdAt).getDay()];
      if (commissionByDay[dayName]) {
        commissionByDay[dayName].commission += (tx.fee || 0) * 0.5;
        commissionByDay[dayName].transactions += 1;
      }
    });

    const commissionData = Object.entries(commissionByDay).map(([day, data]) => ({
      day,
      commission: Math.round(data.commission),
      transactions: data.transactions
    }));

    // 8. Formater les transactions récentes
    const allTransactions = [...agent.transactionsFrom, ...agent.transactionsTo]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const recentTransactions = allTransactions.map(tx => {
      const isOutgoing = tx.fromUserId === authUser.id;
      let type: 'cash-in' | 'cash-out' | 'transfer' = 'transfer';
      
      if (tx.type === 'DEPOSIT') {
        type = 'cash-in';
      } else if (tx.type === 'WITHDRAW') {
        type = 'cash-out';
      } else if (isOutgoing) {
        type = 'cash-out';
      } else {
        type = 'cash-in';
      }

      const customer = isOutgoing 
        ? (tx as any).toUser?.name || (tx as any).toUser?.username || 'Client'
        : (tx as any).fromUser?.name || (tx as any).fromUser?.username || 'Client';

      return {
        id: tx.id,
        type,
        amount: tx.amount,
        currency: tx.currency || 'XAF',
        status: tx.status.toLowerCase() as 'success' | 'pending' | 'issue',
        customer: customer.split(' ')[0] + ' ' + (customer.split(' ')[1]?.charAt(0) || '') + '.',
        timestamp: new Date(tx.createdAt).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        reference: tx.reference.slice(-8).toUpperCase(),
        source: (tx.type === 'DEPOSIT' || tx.type === 'WITHDRAW') ? 'hub' : 'app',
        createdAt: tx.createdAt
      };
    });

    // 9. Retourner toutes les données
    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name || agent.username,
        kycStatus: agent.kycStatus
      },
      floatBalance,
      piBalance,
      dailyEarnings: {
        pi: Math.round(dailyCommission / 314159 * 100) / 100, // Conversion approximative
        xaf: Math.round(dailyCommission)
      },
      liquidityHealth,
      dailyVolume,
      todayTransactionsCount: todayTransactions.length,
      commissionData,
      recentTransactions,
      weeklyGrowth: commissionData.length > 1 
        ? Math.round(((commissionData[6]?.commission || 0) - (commissionData[0]?.commission || 0)) / Math.max(commissionData[0]?.commission || 1, 1) * 100)
        : 0
    });

  } catch (error: unknown) {
    console.error("Agent Dashboard Error:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Une erreur interne est survenue" },
      { status: 500 }
    );
  }
}
