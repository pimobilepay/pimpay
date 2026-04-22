export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { generateSecret, generateOtpAuthUri } from "@/lib/totp";

export async function POST(req: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 401 });
    }

    // Verify JWT token
    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const userId = decoded.id as string;

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Generate new TOTP secret
    const secret = generateSecret();
    const accountName = user.email || user.username || userId;
    const otpAuthUri = generateOtpAuthUri(secret, accountName);

    // Store secret temporarily (not enabled yet until verification)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        // twoFactorEnabled remains false until verification
      },
    });

    // QR code is now generated client-side using qrcode.react
    // We only return the otpAuthUri for the client to render
    return NextResponse.json({
      success: true,
      secret,
      otpAuthUri,
    });
  } catch (error) {
    console.error("SETUP_TOTP_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
