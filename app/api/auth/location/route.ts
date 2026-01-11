export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose"; // Utilisation de jose

export async function POST(req: Request) {
  try {
    // 1. Récupération sécurisée du secret
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
    }

    // 2. Extraction et vérification du token
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 401 });
    }

    // 3. Vérification asynchrone avec jose
    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);

    // 4. Traitement des données
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Coordonnées manquantes" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: payload.id as string },
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
