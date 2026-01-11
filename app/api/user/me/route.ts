export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose"; // ✅ Standard moderne pour Pimpay

export async function GET(req: Request) {
  try {
    // 1. GESTION ROBUSTE DES SECRETS (Empêche les crashs de build futurs)
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      console.error("CRITICAL: JWT_SECRET is not defined in environment variables.");
      return NextResponse.json({ error: "Erreur de configuration serveur" }, { status: 500 });
    }

    // 2. EXTRACTION SÉCURISÉE DU TOKEN
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // 3. VÉRIFICATION ASYNCHRONE (Compatible avec tous les runtimes Next.js)
    let userId: string;
    try {
      const secretKey = new TextEncoder().encode(SECRET);
      const { payload } = await jwtVerify(token, secretKey);
      
      if (!payload.id || typeof payload.id !== 'string') {
        throw new Error("Payload ID missing");
      }
      userId = payload.id;
    } catch (err) {
      return NextResponse.json({ error: "Session expirée ou invalide" }, { status: 401 });
    }

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

  } catch (error: any) {
    // Log détaillé pour le debug, mais message générique pour le client (sécurité)
    console.error("USER_ME_CRITICAL_ERROR:", error.message);
    return NextResponse.json({ error: "Une erreur est survenue lors de la récupération du profil" }, { status: 500 });
  }
}
