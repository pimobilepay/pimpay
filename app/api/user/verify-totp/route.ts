export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/user/verify-totp
 *
 * Verifie un code Google Authenticator (TOTP) pour un utilisateur DEJA
 * authentifie, sans effet de bord (contrairement a /api/auth/2fa/verify qui
 * active le 2FA, ou /api/auth/mfa/verify-totp qui cree une nouvelle session
 * de connexion). Utilise pour re-confirmer l'identite avant une action
 * sensible (ex: suppression de compte).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.code === "undefined") {
      return NextResponse.json({ error: "Code requis." }, { status: 400 });
    }

    const code = String(body.code);

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Le code doit contenir 6 chiffres." }, { status: 400 });
    }

    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    // Meme politique que /api/user/verify-pin : 5 tentatives / 5 min / utilisateur.
    const rl = checkRateLimit(`verify-totp:${userId}`, 5, 5 * 60_000);
    if (rl.limited) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "Google Authenticator n'est pas configuré pour ce compte." },
        { status: 400 }
      );
    }

    const isValid = verifyTotp(user.twoFactorSecret, code);
    if (!isValid) {
      return NextResponse.json({ error: "Code incorrect." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Accès autorisé" }, { status: 200 });
  } catch (error) {
    console.error("VERIFY_TOTP_SERVER_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
