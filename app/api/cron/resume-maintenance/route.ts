export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * GET /api/cron/resume-maintenance
 *
 * Appelé périodiquement (via Vercel Cron ou un appel externe).
 * Réactive automatiquement tous les utilisateurs en MAINTENANCE
 * dont la date de fin (maintenanceUntil) est passée.
 *
 * Peut aussi être appelé sans secret depuis le dashboard admin
 * via un appel interne authentifié (X-Internal-Admin: 1).
 */
export async function GET(req: NextRequest) {
  const isInternalCall = req.headers.get("x-internal-admin") === "1";

  // Autoriser : secret cron OU appel interne admin
  if (!isInternalCall && !verifyCronSecret(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();

    // Trouver tous les utilisateurs en MAINTENANCE dont la date est passée
    const expired = await prisma.user.findMany({
      where: {
        status: "MAINTENANCE",
        maintenanceUntil: { lte: now },
      },
      select: { id: true, username: true, email: true, maintenanceUntil: true },
    });

    if (expired.length === 0) {
      return NextResponse.json({ resumed: 0, message: "Aucune maintenance expirée" });
    }

    // Réactiver chaque utilisateur + envoyer notification
    const ops = expired.flatMap((u) => [
      prisma.user.update({
        where: { id: u.id },
        data: { status: "ACTIVE", maintenanceUntil: null, statusReason: null },
      }),
      prisma.notification.create({
        data: {
          userId: u.id,
          title: "Maintenance Terminée ✅",
          message:
            "La maintenance de votre compte est terminée automatiquement. Vous pouvez à nouveau utiliser tous les services PimPay.",
          type: "SUCCESS",
        },
      }),
    ]);

    await prisma.$transaction(ops);

    console.log(
      `[resume-maintenance] ${expired.length} compte(s) réactivé(s):`,
      expired.map((u) => u.username || u.email)
    );

    return NextResponse.json({
      resumed: expired.length,
      users: expired.map((u) => ({
        id: u.id,
        username: u.username,
        maintenanceUntil: u.maintenanceUntil,
      })),
    });
  } catch (error) {
    console.error("[resume-maintenance] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
