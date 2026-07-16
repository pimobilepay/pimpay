export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();

    if (!pin) {
      return NextResponse.json({ error: "Code PIN requis" }, { status: 400 });
    }

    // [FIX V16] Auth centralisée et vérifiée cryptographiquement.
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // [FIX] Rate limiting — 5 tentatives / 5 min par utilisateur, même
    // politique que /api/auth/verify-pin et /api/user/verify-pin. Un PIN à
    // 4 chiffres (10 000 combinaisons) est brute-forçable en quelques
    // minutes sans cette limite si une session est compromise.
    const rl = checkRateLimit(`verify-pin:${userId}`, 5, 5 * 60_000);
    if (rl.limited) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pin: true },
    });

    if (!user || !user.pin) {
      return NextResponse.json({ error: "Utilisateur non trouvé ou PIN non configuré" }, { status: 404 });
    }

    // Comparaison sécurisée du PIN
    const isMatch = await bcrypt.compare(pin, user.pin);

    if (isMatch) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Ancien code PIN incorrect" }, { status: 400 });
    }

  } catch (error) {
    console.error("Erreur API Verify PIN:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
