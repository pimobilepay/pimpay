export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    // #23 FIX: await obligatoire — verifyAuth est async.
    // Sans await, payload contient une Promise (toujours truthy),
    // ce qui bypasse totalement le contrôle de rôle ADMIN.
    const payload = await adminAuth(req);
    if (!payload) {
      return NextResponse.json(
        { error: "Accès réservé aux administrateurs" },
        { status: 403 }
      );
    }

    const { userId, newPassword } = await req.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId manquant ou invalide" }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 8) {
      return NextResponse.json(
        { error: "Mot de passe invalide (minimum 8 caractères)" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur cible existe avant de hasher
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Bcrypt cost factor 12 (vs 10 précédemment — meilleure résistance brute force)
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Audit log : tracer qui a réinitialisé quel compte
    await prisma.auditLog.create({
      data: {
        adminId: payload.id,
        adminName: payload.name || payload.email || payload.id,
        action: "ADMIN_RESET_PASSWORD",
        details: `Réinitialisation mot de passe pour ${targetUser.email} (id: ${userId})`,
      },
    }).catch(() => {
      console.error("[AUDIT] Impossible de créer le log de réinitialisation");
    });

    return NextResponse.json({
      success: true,
      message: "Mot de passe réinitialisé avec succès",
    });

  } catch (error: any) {
    // #14 : ne jamais exposer error.message en production
    console.error("[ADMIN_RESET_PASSWORD]", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
