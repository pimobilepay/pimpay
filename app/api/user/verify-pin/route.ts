export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // 1. Lecture sécurisée du body
    const body = await req.json().catch(() => null);

    if (!body || typeof body.pin === 'undefined') {
      return NextResponse.json({ error: "Données manquantes : le champ 'pin' est requis." }, { status: 400 });
    }

    const pin = String(body.pin);

    // 2. Validation stricte du format (support 4 et 6 chiffres)
    if (!/^\d{4}$|^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "Le PIN doit contenir 4 ou 6 chiffres." }, { status: 400 });
    }

    // 3. Extraction et validation du Token
    const cookieStore = await cookies();
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    
    let userId: string | null = null;

    // Pi Network session
    if (piToken && piToken.length > 20) {
      userId = piToken;
    } 
    // Token JWT classique via verifyJWT
    else if (classicToken) {
      const payload = await verifyJWT(classicToken);
      if (!payload) {
        return NextResponse.json({ error: "Session expirée ou invalide." }, { status: 401 });
      }
      userId = payload.id;
    }
    
    if (!userId) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    // 5. Recherche de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pin: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 });
    }

    if (!user.pin) {
      return NextResponse.json({
        error: "Aucun code PIN configuré.",
        setupRequired: true
      }, { status: 403 });
    }

    // 6. Comparaison avec Bcrypt
    const isMatch = await bcrypt.compare(pin, user.pin);

    if (!isMatch) {
      console.warn(`[AUTH] Tentative de PIN incorrect pour l'utilisateur : ${userId}`);
      return NextResponse.json({ error: "Code PIN incorrect." }, { status: 400 });
    }

    // 7. Succès
    return NextResponse.json({
      success: true,
      message: "Accès autorisé"
    }, { status: 200 });

  } catch (error: any) {
    console.error("VERIFY_PIN_SERVER_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
