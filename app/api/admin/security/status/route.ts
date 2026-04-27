export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

/**
 * GET - Get the current admin's 2FA security status
 */
export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        username: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin introuvable" }, { status: 404 });
    }

    // Get last security log for 2FA verification
    const lastVerification = await prisma.securityLog.findFirst({
      where: {
        userId: admin.id,
        action: { contains: "MFA" },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    // Count active sessions as trusted devices
    const trustedDevices = await prisma.session.count({
      where: {
        userId: admin.id,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      status: {
        twoFactorEnabled: admin.twoFactorEnabled,
        lastVerified: lastVerification?.createdAt || null,
        backupCodesRemaining: admin.twoFactorEnabled ? 10 : 0, // Simulated
        trustedDevices,
        email: admin.email,
        username: admin.username,
      },
    });
  } catch (error: unknown) {
    console.error("SECURITY_STATUS_ERROR:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: "Erreur serveur", details: message }, { status: 500 });
  }
}
