export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

/**
 * API DE VÉRIFICATION DU CODE PIN
 * Utilisée avant les transactions ou les actions sensibles.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTIFICATION DE LA SESSION
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    // 2. RÉCUPÉRATION DU PIN ENVOYÉ
    const body = await req.json();
    const { pin } = body; // Le code PIN à 4 ou 6 chiffres envoyé par le front

    if (!pin) {
      return NextResponse.json({ error: "Code PIN requis" }, { status: 400 });
    }

    // 3. RÉCUPÉRATION DE L'UTILISATEUR DANS LA DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pin: true, status: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    if (user.status === "BANNED" || user.status === "FROZEN") {
      return NextResponse.json({ error: "Compte restreint" }, { status: 403 });
    }

    // Si l'utilisateur n'a pas encore configuré de PIN
    if (!user.pin) {
      return NextResponse.json({ 
        error: "Aucun code PIN configuré", 
        code: "NO_PIN_SET" 
      }, { status: 400 });
    }

    // 4. COMPARAISON SÉCURISÉE AVEC BCRYPT
    const isPinValid = await bcrypt.compare(pin, user.pin);

    if (!isPinValid) {
      // Optionnel : On pourrait ici incrémenter un compteur de tentatives échouées
      return NextResponse.json({ error: "Code PIN incorrect" }, { status: 401 });
    }

    // 5. RÉPONSE POSITIVE
    // On peut renvoyer un "token de transaction" temporaire si on veut être ultra-safe,
    // mais pour le lancement, une confirmation suffit.
    return NextResponse.json({ 
      success: true, 
      message: "Code PIN validé" 
    });

  } catch (error: any) {
    console.error("PIN_VERIFY_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors de la vérification" }, { status: 500 });
  }
}
