export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose"; // ✅ Migration Jose pour la compatibilité Edge/Vercel

export async function GET() {
  try {
    // 1. SÉCURITÉ DU SECRET (Prévention du crash au build)
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      console.error("JWT_SECRET is not defined");
      return NextResponse.json({ error: "Erreur de configuration" }, { status: 500 });
    }

    // 2. EXTRACTION DU TOKEN DEPUIS LES COOKIES
    const token = cookies().get("pimpay_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // 3. VÉRIFICATION ASYNCHRONE ET SÉCURISÉE
    let payload;
    try {
      const secretKey = new TextEncoder().encode(SECRET);
      const { payload: verifiedPayload } = await jwtVerify(token, secretKey);
      payload = verifiedPayload;
    } catch (err) {
      return NextResponse.json({ error: "Session invalide ou expirée" }, { status: 401 });
    }

    // 4. VÉRIFICATION DU RÔLE ADMIN (Protection renforcée)
    if (payload.role !== "ADMIN") {
      console.warn(`Tentative d'accès admin non autorisée: User ID ${payload.id}`);
      return NextResponse.json({ error: "Accès refusé : privilèges insuffisants" }, { status: 403 });
    }

    // 5. RÉCUPÉRATION DES DONNÉES DEPUIS LA DB
    const admin = await prisma.user.findUnique({
      where: { id: payload.id as string },
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

  } catch (error: any) {
    console.error("ADMIN_ME_ERROR:", error.message);
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
