export const dynamic = 'force-dynamic';
import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthPayload } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // Vérification du rôle ADMIN
    if (payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        sidraAddress: true,
        xrpAddress: true,
        xlmAddress: true,
        kycStatus: true,
        // On ne sélectionne JAMAIS les clés privées ici
      },
      take: 50
    });

    return NextResponse.json(users);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
