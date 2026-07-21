export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/agent/referral
 * Retourne les informations de parrainage de l'agent :
 * - Code parrain / QR
 * - Liste des clients recrutés (filleuls) avec statut KYC et activation
 * - Statistiques (total, actifs, commissions débloquées)
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = (await verifyAuth(req)) as any;

    if (!authUser || !authUser.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    if (authUser.role !== 'AGENT' && authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux agents' }, { status: 403 });
    }

    // Infos de l'agent
    const agent = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        email: true,
        avatar: true,
        country: true,
        referralCode: true,
        agentRole: true,
        createdAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    }

    // Filleuls directs de l'agent
    const referred = await prisma.user.findMany({
      where: { referredById: authUser.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        avatar: true,
        kycStatus: true,
        status: true,
        createdAt: true,
        _count: {
          select: { transactionsFrom: true, transactionsTo: true },
        },
      },
    });

    const clients = referred.map((c) => {
      const txCount = (c._count?.transactionsFrom || 0) + (c._count?.transactionsTo || 0);
      const kycVerified = c.kycStatus === 'VERIFIED' || c.kycStatus === 'APPROVED';
      // Un client est "activé" s'il est vérifié KYC et a réalisé au moins une transaction
      const activated = kycVerified && txCount > 0;
      return {
        id: c.id,
        name: c.name || c.username || 'Client',
        username: c.username,
        phone: c.phone,
        avatar: c.avatar,
        kycStatus: c.kycStatus,
        activated,
        transactionsCount: txCount,
        joinedAt: c.createdAt,
      };
    });

    const totalReferred = clients.length;
    const activatedCount = clients.filter((c) => c.activated).length;
    const pendingKyc = clients.filter(
      (c) => c.kycStatus !== 'VERIFIED' && c.kycStatus !== 'APPROVED'
    ).length;

    // Génère l'URL de parrainage publique
    const origin = req.nextUrl.origin;
    const code = agent.referralCode || agent.username || agent.id;
    const referralLink = `${origin}/register?ref=${encodeURIComponent(code)}`;

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name || agent.username,
        username: agent.username,
        phone: agent.phone,
        email: agent.email,
        avatar: agent.avatar,
        country: agent.country,
        agentRole: agent.agentRole,
        referralCode: code,
        createdAt: agent.createdAt,
      },
      referralLink,
      stats: {
        totalReferred,
        activatedCount,
        pendingKyc,
      },
      clients,
    });
  } catch (error: any) {
    console.error('[API/AGENT/REFERRAL]', error?.message);
    return NextResponse.json({ error: 'Une erreur interne est survenue' }, { status: 500 });
  }
}
