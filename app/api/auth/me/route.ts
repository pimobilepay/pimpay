/**
 * app/api/auth/me/route.ts
 *
 * Route manquante — causait un 404 dans les logs Vercel.
 * Retourne le profil de l'utilisateur authentifié via le cookie JWT.
 * Utilisée par le dashboard et d'autres pages client pour vérifier la session.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Résolution unifiée de la session : JWT classique (cookies token /
    // pimpay_token) ET session Pi Browser (cookie pi_session_token).
    // Auparavant cette route ne vérifiait que le JWT classique, ce qui
    // renvoyait un 401 aux utilisateurs connectés via Pi Browser.
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        kycStatus: true,
        status: true,
        avatar: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("[API/AUTH/ME]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
