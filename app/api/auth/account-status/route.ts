export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        status: true,
        statusReason: true,
        maintenanceUntil: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Verifier si la maintenance est terminee automatiquement
    if (user.status === "MAINTENANCE" && user.maintenanceUntil) {
      if (new Date(user.maintenanceUntil) <= new Date()) {
        // Reactiver le compte automatiquement
        await prisma.user.update({
          where: { id: user.id },
          data: { status: "ACTIVE", statusReason: null, maintenanceUntil: null }
        });
        
        return NextResponse.json({
          status: "ACTIVE",
          isRestricted: false,
          wasInMaintenance: true, // Indique que le compte vient d'etre reactive
        });
      }
    }

    const isRestricted = ["SUSPENDED", "BANNED", "FROZEN", "MAINTENANCE"].includes(user.status);

    return NextResponse.json({
      status: user.status,
      isRestricted,
      reason: user.statusReason,
      maintenanceUntil: user.maintenanceUntil,
    });

  } catch (error) {
    console.error("ACCOUNT_STATUS_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
