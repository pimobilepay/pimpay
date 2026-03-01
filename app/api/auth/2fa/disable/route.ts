export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import { verifyTotp } from "@/lib/totp";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

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

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "Google Authenticator n'est pas active" },
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

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Google Authenticator desactive avec succes",
    });
  } catch (e) {
    console.error("2FA_DISABLE_ERROR:", e);
    return NextResponse.json(
      { error: "Erreur lors de la desactivation 2FA" },
      { status: 500 }
    );
  }
}
