export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limit";

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

    // 3. [FIX V16] Auth centralisée et vérifiée cryptographiquement.
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    // 4. [FIX] Rate limiting — 5 tentatives / 5 min par utilisateur.
    // Un PIN à 4 chiffres n'a que 10 000 combinaisons : sans cette limite,
    // une session compromise (cookie volé, XSS) permet de le brute-forcer
    // en quelques minutes pour valider une action sensible. Même politique
    // que /api/auth/verify-pin, scopée par userId plutôt que par IP puisque
    // l'utilisateur est déjà authentifié à ce stade.
    const rl = checkRateLimit(`verify-pin:${userId}`, 5, 5 * 60_000);
    if (rl.limited) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
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
