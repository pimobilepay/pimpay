export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserIdFromBearer } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserIdFromBearer(req);
    if (!userId) {
      return NextResponse.json({ error: "Token manquant ou invalide" }, { status: 401 });
    }

    // Traitement des données
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Coordonnées manquantes" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { latitude, longitude },
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("LOCATION_UPDATE_ERROR:", error);
    // Gestion des erreurs de token (expiré ou invalide)
    if (error.code === 'ERR_JWT_EXPIRED' || error.code === 'ERR_JWS_INVALID') {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
