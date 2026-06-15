export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT, getAuthUserIdFromBearer } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * GET /api/security/pin-status
 *
 * Indique uniquement si l'utilisateur a deja configure un code PIN.
 * Ne renvoie JAMAIS le PIN ni son hash — seulement un booleen.
 * Utilise par la page Securite > PIN pour proposer la CREATION
 * d'un PIN aux utilisateurs qui n'en ont pas encore configure.
 */
export async function GET(req: Request) {
  try {
    // 1. Bearer token (localStorage) en priorite
    let userId: string | null = await getAuthUserIdFromBearer(req);

    // 2. Fallback sur les cookies (session Pi Network ou JWT classique)
    if (!userId) {
      const cookieStore = await cookies();
      const piToken = cookieStore.get("pi_session_token")?.value;
      const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

      if (piToken && piToken.length > 20) {
        userId = piToken;
      } else if (classicToken) {
        const payload = await verifyJWT(classicToken);
        if (!payload) {
          return NextResponse.json({ error: "Session expiree" }, { status: 401 });
        }
        userId = payload.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pin: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    return NextResponse.json({ hasPin: Boolean(user.pin) }, { status: 200 });
  } catch (error) {
    console.error("Erreur API PIN-STATUS:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
