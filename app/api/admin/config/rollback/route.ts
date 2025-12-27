import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // 1. VERIFICATION AUTHENTICATION
    const payload = verifyAuth(req) as { id: string; role: string } | null;
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { logId } = await req.json();

    // 2. RECUPERATION DU LOG ET DE L'ADMIN
    const [log, adminUser] = await Promise.all([
      prisma.auditLog.findUnique({ where: { id: logId } }),
      prisma.user.findUnique({ where: { id: payload.id } })
    ]);

    if (!log || !log.details) {
      return NextResponse.json({ error: "Log introuvable ou corrompu" }, { status: 404 });
    }

    // 3. PARSING DES VALEURS (Extraction de l'état AVANT modification)
    const updateData: any = {};
    const detailParts = log.details.split(" | ");

    detailParts.forEach(part => {
      const [keyWithColon, values] = part.split(": ");
      const key = keyWithColon.trim();
      const oldValue = values.split(" → ")[0].trim();

      // Conversion de type intelligente pour Prisma & Postgres
      if (oldValue === "true") updateData[key] = true;
      else if (oldValue === "false") updateData[key] = false;
      else if (!isNaN(Number(oldValue)) && oldValue !== "") {
        updateData[key] = parseFloat(oldValue);
      } else {
        updateData[key] = oldValue;
      }
    });

    // 4. EXECUTION DU ROLLBACK (Transaction pour garantir l'intégrité)
    const restoredConfig = await prisma.$transaction(async (tx) => {
      // Mise à jour de la config
      const config = await tx.systemConfig.update({
        where: { id: "GLOBAL_CONFIG" },
        data: updateData
      });

      // Création du log de traçabilité du Rollback
      await tx.auditLog.create({
        data: {
          adminId: payload.id,
          adminName: adminUser?.name || adminUser?.email || "Admin",
          action: "UPDATE_SYSTEM_CONFIG",
          details: `RESTORE: État du log #${logId.substring(0, 8)} rétabli.`,
          targetId: "SYSTEM",
        }
      });

      return config;
    });

    // 5. GESTION DES COOKIES DE MAINTENANCE (Si l'état a changé via le rollback)
    const response = NextResponse.json({ success: true, config: restoredConfig });

    if (updateData.maintenanceMode !== undefined) {
      if (updateData.maintenanceMode === true) {
        response.cookies.set("maintenance_mode", "true", {
          path: "/",
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
        });
      } else {
        response.cookies.set("maintenance_mode", "false", { path: "/", maxAge: 0 });
      }
    }

    return response;

  } catch (error: any) {
    console.error("ROLLBACK_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Échec critique du rollback" }, { status: 500 });
  }
}
