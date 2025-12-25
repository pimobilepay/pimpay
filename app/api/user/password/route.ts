export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; // ou ton outil de hashage

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = auth.split(" ")[1];
    const payload: any = jwt.verify(token, JWT_SECRET);
    const { oldPassword, newPassword } = await req.json();

    // 1. Vérification de l'utilisateur
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 2. Vérification de l'ancien mot de passe
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) return NextResponse.json({ error: "Ancien mot de passe incorrect" }, { status: 400 });

    // 3. Mise à jour du mot de passe ET invalidation des sessions
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      // Mise à jour du password
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedNewPassword }
      }),
      // SÉCURITÉ : On passe toutes les sessions en 'false' sauf celle actuelle
      prisma.session.updateMany({
        where: {
          userId: user.id,
          token: { not: token }, // On garde la session en cours active
          isActive: true
        },
        data: { isActive: false }
      }),
      // Audit Log de l'action
      (prisma as any).auditLog.create({
        data: {
          adminId: user.id,
          action: "PASSWORD_CHANGE_GLOBAL_LOGOUT",
          details: "Le mot de passe a été changé. Déconnexion automatique des autres appareils."
        }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      message: "Mot de passe mis à jour et autres sessions révoquées." 
    });

  } catch (err) {
    console.error("PASSWORD_CHANGE_ERROR:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
