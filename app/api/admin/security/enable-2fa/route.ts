export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";
import { verifyTotp } from "@/lib/totp";

/**
 * POST - Enable 2FA after verifying the first TOTP code
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
      return NextResponse.json({ error: "Code manquant" }, { status: 400 });
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

    if (admin.twoFactorEnabled) {
      return NextResponse.json({ error: "2FA deja active" }, { status: 400 });
    }

    if (!admin.twoFactorSecret) {
      return NextResponse.json(
        { error: "Veuillez d'abord generer un secret 2FA via /api/auth/mfa/setup-totp" },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verifyTotp(admin.twoFactorSecret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Code incorrect. Verifiez votre application Google Authenticator." },
        { status: 401 }
      );
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: admin.id },
      data: { twoFactorEnabled: true },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.email || admin.username || "Admin",
        action: "2FA_ENABLED",
        targetId: admin.id,
        details: "Google Authenticator active avec succes",
      },
    });

    // Create security log
    await prisma.securityLog.create({
      data: {
        userId: admin.id,
        action: "2FA_ENABLED",
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
        device: req.headers.get("user-agent") || "Unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Google Authenticator active avec succes!",
    });
  } catch (error: unknown) {
    console.error("ENABLE_2FA_ERROR:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: "Erreur serveur", details: message }, { status: 500 });
  }
}
