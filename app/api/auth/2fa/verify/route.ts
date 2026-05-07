export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";

export async function POST(req: Request) {
  try {
    // [FIX V13] — Utiliser getAuthUserId() centralisé au lieu du pattern pi_session_token direct
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.length !== 6) {
      return NextResponse.json(
        { error: "Code invalide. Veuillez entrer un code a 6 chiffres." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "Aucun secret 2FA configure. Veuillez d'abord initialiser." },
        { status: 400 }
      );
    }

    const isValid = verifyTotp(user.twoFactorSecret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Code incorrect. Verifiez votre application Google Authenticator." },
        { status: 400 }
      );
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return NextResponse.json({
      success: true,
      message: "Google Authenticator active avec succes",
    });
  } catch (e) {
    console.error("2FA_VERIFY_ERROR:", e);
    return NextResponse.json(
      { error: "Erreur lors de la verification 2FA" },
      { status: 500 }
    );
  }
}
