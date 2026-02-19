export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/maintenance/check
 * Verifie si la maintenance a expire et la desactive automatiquement.
 * Appele periodiquement par le GlobalAlert cote client.
 */
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ maintenanceMode: false, maintenanceUntil: null });
    }

    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: { maintenanceMode: true, maintenanceUntil: true },
    });

    if (!config) {
      return NextResponse.json({ maintenanceMode: false, maintenanceUntil: null });
    }

    // Auto-desactivation si la date est depassee
    if (config.maintenanceMode && config.maintenanceUntil) {
      const now = new Date();
      const until = new Date(config.maintenanceUntil);

      if (now >= until) {
        await prisma.systemConfig.update({
          where: { id: "GLOBAL_CONFIG" },
          data: { maintenanceMode: false, maintenanceUntil: null },
        });

        const response = NextResponse.json({
          maintenanceMode: false,
          maintenanceUntil: null,
          autoDisabled: true,
        });
        response.cookies.delete("maintenance_mode");
        return response;
      }
    }

    return NextResponse.json({
      maintenanceMode: config.maintenanceMode,
      maintenanceUntil: config.maintenanceUntil,
    });
  } catch (error) {
    console.error("MAINTENANCE_CHECK_ERROR:", error);
    return NextResponse.json({ maintenanceMode: false, maintenanceUntil: null });
  }
}
