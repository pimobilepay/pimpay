export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/agent/customer?q=search
 * Recherche un client par username, téléphone ou email
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const customerId = searchParams.get('id');

    // 3. Si on a un ID direct, retourner les infos du client
    if (customerId) {
      const customer = await prisma.user.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          name: true,
          username: true,
          phone: true,
          avatar: true,
          kycStatus: true,
          wallets: {
            select: { currency: true, balance: true }
          }
        }
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Client introuvable" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, customer });
    }

    // 4. Recherche par query
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Requête de recherche trop courte (min 2 caractères)" },
        { status: 400 }
      );
    }

    const customers = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: authUser.id } }, // Exclure l'agent lui-même
          { status: 'ACTIVE' },
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query } },
              { email: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        avatar: true,
        kycStatus: true
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      customers
    });

  } catch (error: any) {
    console.error("Agent Customer Search Error:", error.message);
    return NextResponse.json(
      { error: "Une erreur interne est survenue" },
      { status: 500 }
    );
  }
}
