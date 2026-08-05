export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { AGENT_FLOAT_PURPOSE } from '@/lib/agent-float';
import { buildCsv, csvFilename, csvResponse, type CsvCell } from '@/lib/csv';

/**
 * GET /api/agent/reports
 *
 * Rapport de performance de l'agent + liste de ses utilisateurs affilies.
 *
 * Query params :
 *   period = 7d | 30d | 90d | 1y            (defaut 30d)
 *   format = json | csv                     (defaut json)
 *   report = performance | affiliates
 *          | transactions | commissions     (utilise seulement si format=csv)
 *
 * Note : la part des frais reversee a l'agent est identique a celle utilisee
 * par /api/agent/dashboard afin que les chiffres concordent entre les pages.
 */

const AGENT_FEE_SHARE = 0.5;

const PERIODS: Record<string, { days: number; label: string }> = {
  '7d': { days: 7, label: '7 derniers jours' },
  '30d': { days: 30, label: '30 derniers jours' },
  '90d': { days: 90, label: '90 derniers jours' },
  '1y': { days: 365, label: '12 derniers mois' },
};

type TxRow = {
  id: string;
  reference: string;
  type: string;
  amount: number;
  fee: number;
  status: string;
  currency: string;
  purpose: string | null;
  description: string | null;
  createdAt: Date;
  fromUserId: string | null;
  toUserId: string | null;
  fromUser: { name: string | null; username: string | null } | null;
  toUser: { name: string | null; username: string | null } | null;
};

/** Sens de l'operation vue de la caisse de l'agent. */
function direction(tx: TxRow, agentId: string): 'in' | 'out' {
  if (tx.type === 'DEPOSIT') return 'in';
  if (tx.type === 'WITHDRAW' || tx.type === 'WITHDRAWAL') return 'out';
  return tx.fromUserId === agentId ? 'out' : 'in';
}

function counterpartyName(tx: TxRow, agentId: string): string {
  const other = tx.fromUserId === agentId ? tx.toUser : tx.fromUser;
  return other?.name || other?.username || 'Client';
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function growthPct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function GET(req: NextRequest) {
  try {
    const authUser = (await verifyAuth(req)) as any;

    if (!authUser || !authUser.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }
    if (authUser.role !== 'AGENT' && authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acces reserve aux agents' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const periodKey = PERIODS[searchParams.get('period') || ''] ? searchParams.get('period')! : '30d';
    const { days, label: periodLabel } = PERIODS[periodKey];
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';
    const report = searchParams.get('report') || 'performance';

    const now = new Date();
    const start = new Date(now.getTime() - days * 86_400_000);
    const previousStart = new Date(start.getTime() - days * 86_400_000);

    const agent = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        email: true,
        country: true,
        agentId: true,
        agentRole: true,
        referralCode: true,
        createdAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    }

    const agentId = agent.id;
    const selfFilter = { OR: [{ fromUserId: agentId }, { toUserId: agentId }] };

    // --- Transactions de l'agent sur la periode courante et la precedente ---
    const [rawCurrent, rawPrevious, referred] = await Promise.all([
      prisma.transaction.findMany({
        where: { ...selfFilter, createdAt: { gte: start } },
        orderBy: { createdAt: 'desc' },
        take: 20_000,
        select: {
          id: true,
          reference: true,
          type: true,
          amount: true,
          fee: true,
          status: true,
          currency: true,
          purpose: true,
          description: true,
          createdAt: true,
          fromUserId: true,
          toUserId: true,
          fromUser: { select: { name: true, username: true } },
          toUser: { select: { name: true, username: true } },
        },
      }),
      prisma.transaction.findMany({
        where: { ...selfFilter, createdAt: { gte: previousStart, lt: start } },
        take: 20_000,
        select: { amount: true, fee: true, status: true, purpose: true },
      }),
      prisma.user.findMany({
        where: { referredById: agentId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          username: true,
          phone: true,
          email: true,
          avatar: true,
          country: true,
          kycStatus: true,
          status: true,
          createdAt: true,
          _count: { select: { transactionsFrom: true, transactionsTo: true } },
        },
      }),
    ]);

    // Les mouvements de provisionnement de float ne sont pas des operations
    // de caisse : on les isole des statistiques de performance.
    const isFloat = (p: string | null | undefined) => p === AGENT_FLOAT_PURPOSE;
    const current = (rawCurrent as TxRow[]).filter((tx) => !isFloat(tx.purpose));
    const previous = rawPrevious.filter((tx) => !isFloat(tx.purpose));

    const success = current.filter((tx) => tx.status === 'SUCCESS');
    const pendingCount = current.filter((tx) => tx.status === 'PENDING').length;
    const failedCount = current.filter(
      (tx) => tx.status === 'FAILED' || tx.status === 'REJECTED' || tx.status === 'CANCELLED'
    ).length;

    const volume = success.reduce((s, tx) => s + tx.amount, 0);
    const commissions = success.reduce((s, tx) => s + (tx.fee || 0) * AGENT_FEE_SHARE, 0);
    const feesCollected = success.reduce((s, tx) => s + (tx.fee || 0), 0);

    let cashIn = 0;
    let cashInCount = 0;
    let cashOut = 0;
    let cashOutCount = 0;
    for (const tx of success) {
      if (direction(tx, agentId) === 'in') {
        cashIn += tx.amount;
        cashInCount += 1;
      } else {
        cashOut += tx.amount;
        cashOutCount += 1;
      }
    }

    const prevSuccess = previous.filter((tx) => tx.status === 'SUCCESS');
    const prevVolume = prevSuccess.reduce((s, tx) => s + tx.amount, 0);
    const prevCommissions = prevSuccess.reduce((s, tx) => s + (tx.fee || 0) * AGENT_FEE_SHARE, 0);

    // --- Serie temporelle : journaliere jusqu'a 90j, mensuelle au dela ---
    const granularity: 'day' | 'month' = days > 90 ? 'month' : 'day';
    const bucketKey = (d: Date) =>
      granularity === 'day' ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 7);

    const buckets = new Map<
      string,
      { volume: number; cashIn: number; cashOut: number; commission: number; count: number }
    >();

    // Pre-remplit les tranches pour eviter les trous dans le graphique.
    if (granularity === 'day') {
      for (let i = days - 1; i >= 0; i--) {
        buckets.set(new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10), {
          volume: 0,
          cashIn: 0,
          cashOut: 0,
          commission: 0,
          count: 0,
        });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.set(d.toISOString().slice(0, 7), {
          volume: 0,
          cashIn: 0,
          cashOut: 0,
          commission: 0,
          count: 0,
        });
      }
    }

    for (const tx of success) {
      const key = bucketKey(new Date(tx.createdAt));
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.volume += tx.amount;
      bucket.count += 1;
      bucket.commission += (tx.fee || 0) * AGENT_FEE_SHARE;
      if (direction(tx, agentId) === 'in') bucket.cashIn += tx.amount;
      else bucket.cashOut += tx.amount;
    }

    const series = Array.from(buckets.entries()).map(([key, b]) => ({
      key,
      label:
        granularity === 'day'
          ? new Date(`${key}T00:00:00Z`).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
            })
          : new Date(`${key}-01T00:00:00Z`).toLocaleDateString('fr-FR', {
              month: 'short',
              year: '2-digit',
            }),
      volume: Math.round(b.volume),
      cashIn: Math.round(b.cashIn),
      cashOut: Math.round(b.cashOut),
      commission: Math.round(b.commission),
      count: b.count,
    }));

    const activeBuckets = series.filter((s) => s.count > 0);
    const best = activeBuckets.reduce<(typeof series)[number] | null>(
      (acc, s) => (!acc || s.volume > acc.volume ? s : acc),
      null
    );

    // --- Utilisateurs affilies : volume et commissions generes sur la periode ---
    const referredIds = referred.map((r) => r.id);
    const perAffiliate = new Map<string, { volume: number; fees: number; count: number }>();

    if (referredIds.length > 0) {
      const [outgoing, incoming] = await Promise.all([
        prisma.transaction.groupBy({
          by: ['fromUserId'],
          where: { fromUserId: { in: referredIds }, status: 'SUCCESS', createdAt: { gte: start } },
          _sum: { amount: true, fee: true },
          _count: { _all: true },
        }),
        prisma.transaction.groupBy({
          by: ['toUserId'],
          where: { toUserId: { in: referredIds }, status: 'SUCCESS', createdAt: { gte: start } },
          _sum: { amount: true, fee: true },
          _count: { _all: true },
        }),
      ]);

      const accumulate = (id: string | null, sum: any, count: number) => {
        if (!id) return;
        const entry = perAffiliate.get(id) || { volume: 0, fees: 0, count: 0 };
        entry.volume += sum?.amount || 0;
        entry.fees += sum?.fee || 0;
        entry.count += count;
        perAffiliate.set(id, entry);
      };

      for (const g of outgoing) accumulate(g.fromUserId, g._sum, g._count._all);
      for (const g of incoming) accumulate(g.toUserId, g._sum, g._count._all);
    }

    const affiliates = referred.map((u) => {
      const stats = perAffiliate.get(u.id) || { volume: 0, fees: 0, count: 0 };
      const lifetimeTx = (u._count?.transactionsFrom || 0) + (u._count?.transactionsTo || 0);
      const kycVerified = u.kycStatus === 'VERIFIED' || u.kycStatus === 'APPROVED';
      return {
        id: u.id,
        name: u.name || u.username || 'Client',
        username: u.username,
        phone: u.phone,
        email: u.email,
        avatar: u.avatar,
        country: u.country,
        kycStatus: u.kycStatus,
        accountStatus: u.status,
        kycVerified,
        // Un affilie est "actif" s'il est verifie et a deja transige.
        activated: kycVerified && lifetimeTx > 0,
        activeInPeriod: stats.count > 0,
        transactionsTotal: lifetimeTx,
        transactionsPeriod: stats.count,
        volumePeriod: Math.round(stats.volume),
        commissionPeriod: round(stats.fees * AGENT_FEE_SHARE),
        joinedAt: u.createdAt,
        isNew: u.createdAt >= start,
      };
    });

    const affiliateStats = {
      total: affiliates.length,
      activated: affiliates.filter((a) => a.activated).length,
      pendingKyc: affiliates.filter((a) => !a.kycVerified).length,
      newInPeriod: affiliates.filter((a) => a.isNew).length,
      activeInPeriod: affiliates.filter((a) => a.activeInPeriod).length,
      volumePeriod: affiliates.reduce((s, a) => s + a.volumePeriod, 0),
      commissionPeriod: round(affiliates.reduce((s, a) => s + a.commissionPeriod, 0)),
      transactionsPeriod: affiliates.reduce((s, a) => s + a.transactionsPeriod, 0),
    };

    const performance = {
      transactions: current.length,
      successCount: success.length,
      pendingCount,
      failedCount,
      successRate: current.length > 0 ? Math.round((success.length / current.length) * 100) : 0,
      volume: Math.round(volume),
      cashIn: Math.round(cashIn),
      cashInCount,
      cashOut: Math.round(cashOut),
      cashOutCount,
      commissions: Math.round(commissions),
      feesCollected: Math.round(feesCollected),
      avgTicket: success.length > 0 ? Math.round(volume / success.length) : 0,
      activeDays: activeBuckets.length,
      dailyAverage: Math.round(volume / Math.max(days, 1)),
      bestDay: best ? { label: best.label, key: best.key, volume: best.volume, count: best.count } : null,
      volumeGrowth: growthPct(volume, prevVolume),
      commissionGrowth: growthPct(commissions, prevCommissions),
      previousVolume: Math.round(prevVolume),
      previousCommissions: Math.round(prevCommissions),
      currency: 'XAF',
    };

    const agentInfo = {
      id: agent.id,
      name: agent.name || agent.username || 'Agent',
      username: agent.username,
      phone: agent.phone,
      email: agent.email,
      country: agent.country,
      agentId: agent.agentId,
      agentRole: agent.agentRole,
      referralCode: agent.referralCode,
      memberSince: agent.createdAt,
    };

    // ---------------------------- Export CSV ----------------------------
    if (format === 'csv') {
      const meta: CsvCell[][] = [
        ['Agent', agentInfo.name],
        ['Identifiant agent', agentInfo.agentId || agentInfo.username || agentInfo.id],
        ['Telephone', agentInfo.phone || ''],
        ['Periode', periodLabel],
        ['Du', start.toISOString().slice(0, 10)],
        ['Au', now.toISOString().slice(0, 10)],
        ['Genere le', now.toISOString()],
      ];

      if (report === 'affiliates') {
        const csv = buildCsv([
          { title: 'RAPPORT DES UTILISATEURS AFFILIES', rows: meta },
          {
            title: 'SYNTHESE',
            rows: [
              ['Total affilies', affiliateStats.total],
              ['Affilies actives', affiliateStats.activated],
              ['KYC en attente', affiliateStats.pendingKyc],
              ['Nouveaux sur la periode', affiliateStats.newInPeriod],
              ['Actifs sur la periode', affiliateStats.activeInPeriod],
              ['Volume genere (XAF)', affiliateStats.volumePeriod],
              ['Commissions generees (XAF)', affiliateStats.commissionPeriod],
            ],
          },
          {
            title: 'DETAIL DES AFFILIES',
            header: [
              'Nom',
              'Identifiant',
              'Telephone',
              'Email',
              'Pays',
              'Statut KYC',
              'Statut compte',
              'Active',
              'Transactions (total)',
              'Transactions (periode)',
              'Volume periode (XAF)',
              'Commission periode (XAF)',
              'Inscrit le',
            ],
            rows: affiliates.map((a) => [
              a.name,
              a.username || '',
              a.phone || '',
              a.email || '',
              a.country || '',
              a.kycStatus,
              a.accountStatus,
              a.activated,
              a.transactionsTotal,
              a.transactionsPeriod,
              a.volumePeriod,
              a.commissionPeriod,
              new Date(a.joinedAt).toISOString().slice(0, 10),
            ]),
          },
        ]);
        return csvResponse(csv, csvFilename(`affilies_${periodKey}`));
      }

      if (report === 'transactions') {
        const csv = buildCsv([
          { title: 'RAPPORT DE TRANSACTIONS', rows: meta },
          {
            title: 'DETAIL',
            header: [
              'Date',
              'Reference',
              'Type',
              'Sens',
              'Contrepartie',
              'Montant',
              'Devise',
              'Frais',
              'Commission agent',
              'Statut',
              'Description',
            ],
            rows: current.map((tx) => [
              new Date(tx.createdAt).toISOString(),
              tx.reference,
              tx.type,
              direction(tx, agentId) === 'in' ? 'Cash-in' : 'Cash-out',
              counterpartyName(tx, agentId),
              tx.amount,
              tx.currency || 'XAF',
              tx.fee || 0,
              round((tx.fee || 0) * AGENT_FEE_SHARE),
              tx.status,
              tx.description || '',
            ]),
          },
        ]);
        return csvResponse(csv, csvFilename(`transactions_${periodKey}`));
      }

      if (report === 'commissions') {
        const csv = buildCsv([
          { title: 'RAPPORT DE COMMISSIONS', rows: meta },
          {
            title: 'SYNTHESE',
            rows: [
              ['Frais collectes (XAF)', performance.feesCollected],
              ['Commissions agent (XAF)', performance.commissions],
              ['Part agent', `${AGENT_FEE_SHARE * 100}%`],
              ['Evolution vs periode precedente', `${performance.commissionGrowth}%`],
            ],
          },
          {
            title: granularity === 'day' ? 'COMMISSIONS PAR JOUR' : 'COMMISSIONS PAR MOIS',
            header: ['Periode', 'Transactions', 'Volume (XAF)', 'Commission (XAF)'],
            rows: series.map((s) => [s.key, s.count, s.volume, s.commission]),
          },
        ]);
        return csvResponse(csv, csvFilename(`commissions_${periodKey}`));
      }

      // Rapport de performance (defaut)
      const csv = buildCsv([
        { title: 'RAPPORT DE PERFORMANCE AGENT', rows: meta },
        {
          title: 'INDICATEURS',
          rows: [
            ['Transactions totales', performance.transactions],
            ['Transactions reussies', performance.successCount],
            ['Transactions en attente', performance.pendingCount],
            ['Transactions echouees', performance.failedCount],
            ['Taux de reussite (%)', performance.successRate],
            ['Volume total (XAF)', performance.volume],
            ['Cash-in (XAF)', performance.cashIn],
            ['Nombre de cash-in', performance.cashInCount],
            ['Cash-out (XAF)', performance.cashOut],
            ['Nombre de cash-out', performance.cashOutCount],
            ['Commissions (XAF)', performance.commissions],
            ['Ticket moyen (XAF)', performance.avgTicket],
            ['Moyenne journaliere (XAF)', performance.dailyAverage],
            ['Jours actifs', performance.activeDays],
            ['Meilleure journee', performance.bestDay?.label || ''],
            ['Volume meilleure journee (XAF)', performance.bestDay?.volume || 0],
            ['Evolution du volume (%)', performance.volumeGrowth],
            ['Evolution des commissions (%)', performance.commissionGrowth],
          ],
        },
        {
          title: 'RESEAU AFFILIE',
          rows: [
            ['Total affilies', affiliateStats.total],
            ['Affilies actives', affiliateStats.activated],
            ['Nouveaux sur la periode', affiliateStats.newInPeriod],
            ['Volume genere par les affilies (XAF)', affiliateStats.volumePeriod],
            ['Commissions affilies (XAF)', affiliateStats.commissionPeriod],
          ],
        },
        {
          title: granularity === 'day' ? 'EVOLUTION QUOTIDIENNE' : 'EVOLUTION MENSUELLE',
          header: ['Periode', 'Transactions', 'Volume (XAF)', 'Cash-in (XAF)', 'Cash-out (XAF)', 'Commission (XAF)'],
          rows: series.map((s) => [s.key, s.count, s.volume, s.cashIn, s.cashOut, s.commission]),
        },
      ]);
      return csvResponse(csv, csvFilename(`performance_${periodKey}`));
    }

    // ---------------------------- Reponse JSON ----------------------------
    return NextResponse.json({
      success: true,
      agent: agentInfo,
      period: {
        key: periodKey,
        label: periodLabel,
        days,
        granularity,
        start: start.toISOString(),
        end: now.toISOString(),
      },
      performance,
      series,
      affiliateStats,
      affiliates,
      topAffiliates: [...affiliates]
        .sort((a, b) => b.volumePeriod - a.volumePeriod || b.transactionsTotal - a.transactionsTotal)
        .slice(0, 5),
      recentTransactions: current.slice(0, 15).map((tx) => ({
        id: tx.id,
        reference: tx.reference,
        type: tx.type,
        direction: direction(tx, agentId),
        counterparty: counterpartyName(tx, agentId),
        amount: tx.amount,
        currency: tx.currency || 'XAF',
        fee: tx.fee || 0,
        commission: round((tx.fee || 0) * AGENT_FEE_SHARE),
        status: tx.status,
        createdAt: tx.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[API/AGENT/REPORTS]', error?.message);
    return NextResponse.json({ error: 'Une erreur interne est survenue' }, { status: 500 });
  }
}
