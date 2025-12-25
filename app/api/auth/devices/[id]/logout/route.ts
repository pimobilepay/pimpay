export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = auth.split(" ")[1];
    const payload: any = jwt.verify(token, JWT_SECRET);

    // 1. Trouver la session pour vérifier la propriété
    const session = await prisma.session.findUnique({
      where: { id: params.id },
    });

    // Sécurité : Vérifier que la session existe et appartient à l'utilisateur
    if (!session || session.userId !== payload.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. SOFT DELETE (FinTech Style)
    // Au lieu de supprimer (delete), on désactive pour alimenter l'onglet "Historique"
    // et on enregistre la date de fin de session.
    await prisma.session.update({
      where: { id: params.id },
      data: {
        isActive: false,
        // On peut aussi enregistrer la date de déconnexion si tu as le champ
        // lastActiveAt: new Date(), 
      },
    });

    // 3. Enregistrer l'action dans les logs d'audit (Optionnel mais recommandé pour Web3)
    try {
      await (prisma as any).auditLog.create({
        data: {
          adminId: payload.id, // ou userId selon ton schéma
          action: "DEVICE_LOGOUT",
          targetId: session.id,
          details: `Déconnexion forcée de l'appareil : ${session.deviceName || session.browser}`,
        }
      });
    } catch (auditError) {
      console.warn("AuditLog non configuré, saut de l'étape.");
    }

    return NextResponse.json({ 
      success: true, 
      message: "L'accès a été révoqué avec succès" 
    });

  } catch (err: any) {
    console.error("LOGOUT_ERROR:", err);
    if (err.name === "JsonWebTokenError") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

