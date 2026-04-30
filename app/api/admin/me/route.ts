export const dynamic = 'force-dynamic';

import { getErrorMessage } from '@/lib/error-utils';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET() {
  try {
    // 1. AUTHENTIFICATION
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // 2. VÉRIFICATION DU RÔLE ADMIN (Protection renforcée)
    if (payload.role !== "ADMIN") {
      console.warn(`Tentative d'accès admin non autorisée: User ID ${payload.id}`);
      return NextResponse.json({ error: "Accès refusé : privilèges insuffisants" }, { status: 403 });
    }

    // 3. RÉCUPÉRATION DES DONNÉES DEPUIS LA DB
    const admin = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true, // Ajouté pour le dashboard admin
        status: true
      },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Administrateur introuvable" }, { status: 404 });
    }

    // 6. RÉPONSE
    return NextResponse.json({ admin });

  } catch (error: unknown) {
    console.error("ADMIN_ME_ERROR:", getErrorMessage(error));
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
