export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // 1. VERIFICATION AUTHENTICATION
    // FIX: Ajout de await car verifyAuth est une fonction asynchrone
    const payload = (await verifyAuth(req)) as { id: string; role: string } | null;

    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json({ error: "ID de log requis" }, { status: 400 });
    }

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
      const splitPart = part.split(": ");
      if (splitPart.length < 2) return; // Sécurité si le format est invalide

      const key = splitPart[0].trim();
      const values = splitPart[1];
      const oldValue = values.split(" → ")[0].trim();

      // Conversion de type intelligente pour Prisma & Postgres
      if (oldValue === "true") updateData[key] = true;
      else if (oldValue === "false") updateData[key] = false;
      else if (!isNaN(Number(oldValue)) && oldValue !== "" && key !== "appVersion") {
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
          action: "ROLLBACK_SYSTEM_CONFIG",
          details: `RESTORE: État du log #${logId.substring(0, 8)} rétabli.`,
          // FIX P2003: targetId doit être null car "SYSTEM" n'est pas un UUID d'utilisateur
          targetId: null, 
        }
      });

      return config;
    }, { maxWait: 10000, timeout: 30000 });

    // 5. GESTION DES COOKIES DE MAINTENANCE
    const response = NextResponse.json({ success: true, config: restoredConfig });

    if (updateData.maintenanceMode !== undefined) {
      if (updateData.maintenanceMode === true) {
        response.cookies.set("maintenance_mode", "true", {
          path: "/",
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 jours
        });
      } else {
        // Supprimer le cookie si on sort de maintenance
        response.cookies.delete("maintenance_mode");
      }
    }

    return response;

  } catch (error: any) {
    console.error("ROLLBACK_CRITICAL_ERROR:", error);
    return NextResponse.json(
      { error: "Échec critique du rollback", details: error.message }, 
      { status: 500 }
    );
  }
}
