export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";

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
    const body = await req.json();
    const { code, secret } = body;

    if (!code || !secret) {
      return NextResponse.json({ error: "Code et secret requis" }, { status: 400 });
    }

    // Validate code format (6 digits)
    if (typeof code !== "string" || code.length !== 6 || !/^\d+$/.test(code)) {
      return NextResponse.json(
        { error: "Code invalide. Veuillez entrer un code a 6 chiffres." },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Verify that the secret matches what was stored
    if (user.twoFactorSecret !== secret) {
      return NextResponse.json(
        { error: "Secret invalide. Veuillez recommencer la configuration." },
        { status: 400 }
      );
    }

    // Verify TOTP code
    const isValid = verifyTotp(secret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Code incorrect. Verifiez votre application Google Authenticator." },
        { status: 401 }
      );
    }

    // Enable 2FA for the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    });

    // Create notification
    try {
      await prisma.notification.create({
        data: {
          userId: userId,
          type: "SECURITY",
          title: "Google Authenticator active",
          message: "L'authentification a deux facteurs (2FA) a ete configuree avec succes pour votre compte.",
          metadata: { method: "TOTP", configuredAt: new Date().toISOString() },
        },
      });
    } catch (notifError) {
      console.error("NOTIFICATION_ERROR:", notifError);
      // Don't fail if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: "Google Authenticator configure avec succes",
    });
  } catch (error) {
    console.error("VERIFY_SETUP_TOTP_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
