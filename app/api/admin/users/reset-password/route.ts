import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    // 1. Vérifier que celui qui appelle est bien un ADMIN
    const payload = verifyAuth(req) as any;
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // 2. Hachage du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    // 3. Mise à jour forcée
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: "Mot de passe réinitialisé par l'admin" });

  } catch (error: any) {
    console.error("Admin Reset Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
