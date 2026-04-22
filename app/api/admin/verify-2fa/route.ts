export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";

/**
 * Vérifie le code Google Authenticator de l'admin avant une action sensible.
 * POST /api/admin/verify-2fa
 * Body: { code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Privilèges insuffisants" }, { status: 403 });
    }

    if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
      // Si l'admin n'a pas configuré la 2FA, on laisse passer sans vérification
      return NextResponse.json({ success: true, message: "2FA non configurée, action autorisée" });
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.length !== 6) {
      return NextResponse.json(
        { error: "Code invalide. Veuillez entrer un code à 6 chiffres." },
        { status: 400 }
      );
    }

    const isValid = verifyTotp(admin.twoFactorSecret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Code incorrect. Vérifiez votre application Google Authenticator." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Identité vérifiée" });
  } catch (e) {
    console.error("ADMIN_2FA_VERIFY_ERROR:", e);
    return NextResponse.json({ error: "Erreur lors de la vérification" }, { status: 500 });
  }
}
