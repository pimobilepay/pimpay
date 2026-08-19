import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { verifyTotp } from "@/lib/totp";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * DELETE /api/user/delete-account
 *
 * Suppression definitive du compte. Exige une re-confirmation MFA (PIN ou
 * Google Authenticator) dans la meme requete : la verification n'est pas
 * separee de l'action pour eviter qu'un appel direct a cet endpoint
 * contourne la modale de confirmation cote client.
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Session expirée" }, { status: 401 });

    // Rate limit dedie a la suppression, independant de verify-pin/verify-totp,
    // pour empecher le brute force du PIN/TOTP via cet endpoint precis.
    const rl = checkRateLimit(`delete-account:${userId}`, 5, 5 * 60_000);
    if (rl.limited) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const body = await req.json().catch(() => null);
    const method = body?.method;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pin: true, twoFactorEnabled: true, twoFactorSecret: true },
    });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    if (method === "totp") {
      const code = String(body?.code || "");
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: "Code invalide. Veuillez entrer un code à 6 chiffres." }, { status: 400 });
      }
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        return NextResponse.json({ error: "Google Authenticator n'est pas configuré pour ce compte." }, { status: 400 });
      }
      if (!verifyTotp(user.twoFactorSecret, code)) {
        return NextResponse.json({ error: "Code incorrect." }, { status: 401 });
      }
    } else if (method === "pin") {
      const pin = String(body?.pin || "");
      if (!/^\d{4}$|^\d{6}$/.test(pin)) {
        return NextResponse.json({ error: "Le PIN doit contenir 4 ou 6 chiffres." }, { status: 400 });
      }
      if (!user.pin) {
        return NextResponse.json({ error: "Aucun code PIN configuré." }, { status: 400 });
      }
      const isMatch = await bcrypt.compare(pin, user.pin);
      if (!isMatch) {
        return NextResponse.json({ error: "Code PIN incorrect." }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Confirmation MFA requise." }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("USER_ACCOUNT_DELETE_ERROR", error);
    return NextResponse.json({ error: "Le compte ne peut pas être supprimé pour le moment." }, { status: 500 });
  }
}
