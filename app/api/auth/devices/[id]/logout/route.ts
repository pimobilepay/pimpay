import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const payload = verifyAuth(req) as { id: string; role: string } | null;

    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false },
      }),
      prisma.auditLog.create({
        data: {
          adminId: payload.id,
          adminName: "Admin",
          action: "DEVICE_LOGOUT",
          targetId: session.userId,
          // Utilisation des champs réels du schéma : deviceName et osName
          details: `Déconnexion forcée : ${session.deviceName || 'Inconnu'} (${session.osName || 'OS inconnu'})`,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LOGOUT_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
