export const dynamic = 'force-dynamic';

import { getErrorMessage } from '@/lib/error-utils';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // 1. EXTRACTION SÉCURISÉE DU TOKEN
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // 2. VÉRIFICATION via JWT (lib/auth)
    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Session expirée ou invalide" }, { status: 401 });
    }
    const userId = payload.id;

    // 4. RÉCUPÉRATION DES DONNÉES (Sélection stricte pour la performance)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        birthDate: true,
        avatar: true,
        role: true,
        createdAt: true,
        // Tu peux ajouter ici d'autres champs sans casser la logique
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Compte utilisateur introuvable" }, { status: 404 });
    }

    // 5. RÉPONSE STABLE
    return NextResponse.json({ user });

  } catch (error: unknown) {
    // Log détaillé pour le debug, mais message générique pour le client (sécurité)
    console.error("USER_ME_CRITICAL_ERROR:", getErrorMessage(error));
    return NextResponse.json({ error: "Une erreur est survenue lors de la récupération du profil" }, { status: 500 });
  }
}
