export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getAgentFeeShare, getPiPrice } from '@/lib/fees';
import { agentCommissionOf, frozenAgentFeeShareOf } from '@/lib/agent-pending';
import { listAgentFloats, normalizeFloatCurrency } from '@/lib/agent-float-account';
import { DEFAULT_FLOAT_CURRENCY } from '@/lib/agent-float';

/**
 * GET /api/agent/dashboard
 * Récupère les données du tableau de bord agent (PimPayHub)
 *
 * Tous les montants renvoyés sont exprimés dans la devise du float de l'agent
 * (`currency`), jamais en USD : le hub doit afficher cette devise telle quelle.
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

    // 4. Soldes de CAISSE (AgentFloat) — jamais les wallets personnels.
    // La devise active est choisie par l'agent depuis le modal de selection
    // des soldes (?currency=), avec repli sur la devise de caisse par defaut.
    const AGENT_CURRENCY = normalizeFloatCurrency(
      new URL(req.url).searchParams.get('currency') ?? DEFAULT_FLOAT_CURRENCY
    );

    const floats = await listAgentFloats(prisma, authUser.id);
    const activeFloat = floats.find((f) => f.currency === AGENT_CURRENCY);
    const floatBalance = activeFloat?.available ?? 0;
    const piBalance = floats.find((f) => f.currency === 'PI')?.available ?? 0;

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

    // Part des frais reversee a l'agent, definie par l'admin
    // (Admin > Reglages > Frais > Commission agent).
    const currentAgentFeeShare = await getAgentFeeShare();

    /**
     * Commission d'une transaction : on utilise le taux fige au moment de la
     * transaction si present, sinon le taux courant. L'historique reste ainsi
     * coherent avec ce qui a reellement ete credite.
     */
    const commissionOf = (tx: { fee: number | null; metadata?: unknown }) =>
      agentCommissionOf(
        tx.fee,
        frozenAgentFeeShareOf(tx.metadata) ?? currentAgentFeeShare
      );

    // Calcul des commissions journalières (basé sur les frais des transactions)
    const dailyCommission = todayTransactions.reduce(
      (sum, tx) => sum + commissionOf(tx),
      0
    );

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
        commissionByDay[dayName].commission += commissionOf(tx);
        commissionByDay[dayName].transactions += 1;
      }
    });

    const commissionData = Object.entries(commissionByDay).map(([day, data]) => ({
      day,
      commission: Math.round(data.commission),
      transactions: data.transactions
    }));

    // 7.b Flux ENTRANT / SORTANT du jour (par heure) pour le graphique temps réel
    const classifyDirection = (tx: any): 'in' | 'out' => {
      const isOutgoing = tx.fromUserId === authUser.id;
      if (tx.type === 'DEPOSIT') return 'in';
      if (tx.type === 'WITHDRAW') return 'out';
      return isOutgoing ? 'out' : 'in';
    };

    // Initialiser 24 tranches horaires
    const flowByHour: { hour: string; entrant: number; sortant: number; count: number }[] = [];
    for (let h = 0; h < 24; h++) {
      flowByHour.push({
        hour: `${h.toString().padStart(2, '0')}h`,
        entrant: 0,
        sortant: 0,
        count: 0,
      });
    }

    todayTransactions.forEach((tx: any) => {
      const h = new Date(tx.createdAt).getHours();
      const bucket = flowByHour[h];
      if (!bucket) return;
      if (classifyDirection(tx) === 'in') {
        bucket.entrant += tx.amount;
      } else {
        bucket.sortant += tx.amount;
      }
      bucket.count += 1;
    });

    // Ne garder que les tranches jusqu'à l'heure actuelle (évite une longue ligne plate)
    const currentHour = new Date().getHours();
    const flowData = flowByHour
      .slice(0, currentHour + 1)
      .map((b) => ({
        hour: b.hour,
        entrant: Math.round(b.entrant),
        sortant: Math.round(b.sortant),
        count: b.count,
      }));

    // Totaux du jour
    const totalEntrant = flowData.reduce((s, b) => s + b.entrant, 0);
    const totalSortant = flowData.reduce((s, b) => s + b.sortant, 0);

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

    // 9. Conversion de la commission du jour en Pi au prix admin en vigueur
    const piPrice = await getPiPrice();
    const dailyCommissionPi =
      piPrice > 0 ? Math.round((dailyCommission / piPrice) * 100) / 100 : 0;

    // 10. Retourner toutes les données
    return NextResponse.json({
      success: true,
      // Devise de reference de tous les montants ci-dessous (jamais USD)
      currency: AGENT_CURRENCY,
      agentFeeShare: currentAgentFeeShare,
      agent: {
        id: agent.id,
        name: agent.name || agent.username,
        kycStatus: agent.kycStatus,
        agentRole: (agent as any).agentRole || null,
      },
      floatBalance,
      piBalance,
      dailyEarnings: {
        pi: dailyCommissionPi,
        // Montant dans la devise du float de l'agent
        amount: Math.round(dailyCommission),
        xaf: Math.round(dailyCommission)
      },
      liquidityHealth,
      dailyVolume,
      todayTransactionsCount: todayTransactions.length,
      commissionData,
      flowData,
      totalEntrant,
      totalSortant,
      recentTransactions,
      weeklyGrowth: commissionData.length > 1 
        ? Math.round(((commissionData[6]?.commission || 0) - (commissionData[0]?.commission || 0)) / Math.max(commissionData[0]?.commission || 1, 1) * 100)
        : 0
    });

  } catch (error: any) {
    console.error("Agent Dashboard Error:", error.message);
    return NextResponse.json(
      { error: "Une erreur interne est survenue" },
      { status: 500 }
    );
  }
}
