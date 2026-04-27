export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";
import { verifyTotp } from "@/lib/totp";

/**
 * POST - Disable 2FA (requires current TOTP code for security)
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Code 2FA requis pour desactiver" }, { status: 400 });
    }

    // Validate code format
    if (typeof code !== "string" || code.length !== 6 || !/^\d+$/.test(code)) {
      return NextResponse.json(
        { error: "Code invalide. Veuillez entrer un code a 6 chiffres." },
        { status: 400 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        username: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin introuvable" }, { status: 404 });
    }

    if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
      return NextResponse.json({ error: "2FA n'est pas active" }, { status: 400 });
    }

    // Verify the TOTP code before disabling
    const isValid = verifyTotp(admin.twoFactorSecret, code);

    if (!isValid) {
      // Log failed attempt
      await prisma.securityLog.create({
        data: {
          userId: admin.id,
          action: "2FA_DISABLE_FAILED",
          ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
          device: req.headers.get("user-agent") || "Unknown",
        },
      });

      return NextResponse.json(
        { error: "Code incorrect. La desactivation du 2FA necessite un code valide." },
        { status: 401 }
      );
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.email || admin.username || "Admin",
        action: "2FA_DISABLED",
        targetId: admin.id,
        details: "Google Authenticator desactive",
      },
    });

    // Create security log
    await prisma.securityLog.create({
      data: {
        userId: admin.id,
        action: "2FA_DISABLED",
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
        device: req.headers.get("user-agent") || "Unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Google Authenticator desactive. Votre compte est maintenant moins securise.",
    });
  } catch (error: unknown) {
    console.error("DISABLE_2FA_ERROR:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: "Erreur serveur", details: message }, { status: 500 });
  }
}
