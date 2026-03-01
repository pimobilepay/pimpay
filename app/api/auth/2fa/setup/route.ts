export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";
import { generateSecret, generateOtpAuthUri } from "@/lib/totp";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Google Authenticator est deja active" },
        { status: 400 }
      );
    }

    // Generate a new TOTP secret
    const totpSecret = generateSecret();
    const accountName = user.email || user.username || user.id;
    const otpAuthUri = generateOtpAuthUri(totpSecret, accountName);

    // Save the secret temporarily (not yet enabled until verified)
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: totpSecret },
    });

    return NextResponse.json({
      secret: totpSecret,
      otpAuthUri,
      qrData: otpAuthUri,
    });
  } catch (e) {
    console.error("2FA_SETUP_ERROR:", e);
    return NextResponse.json(
      { error: "Erreur lors de la configuration 2FA" },
      { status: 500 }
    );
  }
}
