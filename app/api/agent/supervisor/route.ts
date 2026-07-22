export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/agent/supervisor
 * Tableau de bord de supervision réservé aux agents SUPERVISOR (et ADMIN).
 * Retourne :
 *  - Les infos du superviseur
 *  - Son équipe (agents rattachés = agents parrainés par le superviseur)
 *  - Des statistiques agrégées sur le réseau
 *  - Le nombre de dossiers KYC en attente de validation
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = (await verifyAuth(req)) as any;

    if (!authUser?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    const supervisor = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        country: true,
        role: true,
        agentRole: true,
      },
    });

    if (!supervisor) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Seuls les superviseurs agents (ou les admins) accèdent à la supervision
    const isAllowed =
      supervisor.role === 'ADMIN' ||
      (supervisor.role === 'AGENT' && supervisor.agentRole === 'SUPERVISOR');

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Accès réservé aux superviseurs' },
        { status: 403 }
      );
    }

    // Équipe supervisée : agents parrainés directement par le superviseur
    const teamAgents = await prisma.user.findMany({
      where: {
        referredById: supervisor.id,
        role: 'AGENT',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        avatar: true,
        city: true,
        country: true,
        status: true,
        kycStatus: true,
        agentRole: true,
        agentId: true,
        createdAt: true,
        lastLoginAt: true,
        wallets: { select: { currency: true, balance: true } },
        _count: { select: { transactionsFrom: true, transactionsTo: true } },
      },
    });

    // Fenêtre "aujourd'hui" pour le volume du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const team = await Promise.all(
      teamAgents.map(async (a) => {
        const xafWallet = a.wallets.find((w) => w.currency === 'XAF');
        const floatBalance = xafWallet?.balance || 0;
        const txCount = (a._count?.transactionsFrom || 0) + (a._count?.transactionsTo || 0);

        const todayAgg = await prisma.transaction.aggregate({
          where: {
            status: 'SUCCESS',
            createdAt: { gte: today },
            OR: [{ fromUserId: a.id }, { toUserId: a.id }],
          },
          _sum: { amount: true },
          _count: { _all: true },
        });

        const isActive = a.status === 'ACTIVE';
        const kycVerified = a.kycStatus === 'VERIFIED' || a.kycStatus === 'APPROVED';

        return {
          id: a.id,
          name: a.name || a.username || 'Agent',
          username: a.username,
          phone: a.phone,
          avatar: a.avatar,
          city: a.city,
          country: a.country,
          agentId: a.agentId,
          status: a.status,
          isActive,
          kycStatus: a.kycStatus,
          kycVerified,
          floatBalance,
          transactionsCount: txCount,
          dailyVolume: todayAgg._sum.amount || 0,
          dailyTransactions: todayAgg._count._all || 0,
          joinedAt: a.createdAt,
          lastLoginAt: a.lastLoginAt,
        };
      })
    );

    // Statistiques agrégées de l'équipe
    const totalAgents = team.length;
    const activeAgents = team.filter((a) => a.isActive).length;
    const totalFloat = team.reduce((s, a) => s + a.floatBalance, 0);
    const networkDailyVolume = team.reduce((s, a) => s + a.dailyVolume, 0);
    const networkDailyTransactions = team.reduce((s, a) => s + a.dailyTransactions, 0);
    const pendingKycInTeam = team.filter((a) => !a.kycVerified).length;

    // Dossiers KYC en attente que le superviseur peut valider
    const pendingKycCount = await prisma.user.count({
      where: { kycStatus: 'PENDING' },
    });

    return NextResponse.json({
      success: true,
      supervisor: {
        id: supervisor.id,
        name: supervisor.name || supervisor.username,
        username: supervisor.username,
        avatar: supervisor.avatar,
        country: supervisor.country,
        agentRole: supervisor.agentRole,
      },
      stats: {
        totalAgents,
        activeAgents,
        totalFloat,
        networkDailyVolume,
        networkDailyTransactions,
        pendingKycInTeam,
        pendingKycCount,
        currency: 'XAF',
      },
      team,
    });
  } catch (error: any) {
    console.error('[API/AGENT/SUPERVISOR]', error?.message);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    );
  }
}
