export const dynamic = 'force-dynamic';
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // 1. Extraction du token depuis les cookies (Méthode PimPay stable)
    const cookieHeader = req.headers.get("cookie");
    const currentToken = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!currentToken) {
      return NextResponse.json({ error: "Session manquante" }, { status: 401 });
    }

    // 2. Vérification de la session en base
    const dbSession = await prisma.session.findUnique({
      where: { token: currentToken },
      include: { user: true },
    });

    if (!dbSession || !dbSession.isActive || !dbSession.user) {
      return NextResponse.json({ error: "Non autorisé ou session expirée" }, { status: 401 });
    }

    const user = dbSession.user;
    const { oldPassword, newPassword } = await req.json();

    // 3. Vérification de l'ancien mot de passe (si existant)
    if (user.password) {
      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "L'ancien mot de passe est incorrect" }, { status: 400 });
      }
    }

    // 4. Hashage du nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // 5. TRANSACTION : Mise à jour + Sécurité
    await prisma.$transaction([
      // Mise à jour du mot de passe
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedNewPassword }
      }),
      // SÉCURITÉ : On révoque toutes les AUTRES sessions actives
      prisma.session.updateMany({
        where: {
          userId: user.id,
          token: { not: currentToken }, // On garde la session actuelle connectée
          isActive: true
        },
        data: { isActive: false }
      }),
      // Audit Log (selon ton schéma AuditLog)
      prisma.auditLog.create({
        data: {
          adminId: user.id, // Utilisé ici comme l'auteur de l'action
          action: "PASSWORD_CHANGE_SECURITY_REVOKE",
          details: "Changement de mot de passe réussi. Sessions secondaires révoquées.",
          targetId: user.id
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: "Mot de passe mis à jour et autres sessions révoquées."
    });

  } catch (err: any) {
    console.error("PASSWORD_CHANGE_ERROR:", err.message);
    return NextResponse.json({ error: "Une erreur est survenue lors de la mise à jour" }, { status: 500 });
  }
}
