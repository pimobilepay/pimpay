export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getAuthUserIdFromRequest } from "@/lib/auth";

/**
 * Changement de mot de passe FORCE.
 *
 * Declenche apres une connexion reussie lorsque `mustChangePassword = true`,
 * c.-a-d. :
 *   - apres que la limite de tentatives a ete atteinte (compte verrouille) ;
 *   - apres un deblocage manuel par un administrateur.
 *
 * Authentifie via le cookie de session (l'utilisateur vient de s'authentifier).
 * On ne redemande PAS l'ancien mot de passe : le but est justement de le remplacer.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { newPassword } = await req.json().catch(() => ({}));

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json({ error: "Nouveau mot de passe requis" }, { status: 400 });
    }

    // Politique de robustesse : 8+ caracteres, au moins une lettre et un chiffre.
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères." },
        { status: 400 }
      );
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins une lettre et un chiffre." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Le nouveau mot de passe ne doit pas etre identique a l'ancien.
    const sameAsOld = await bcrypt.compare(newPassword, user.password);
    if (sameAsOld) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit être différent de l'ancien." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        // Par securite on repart d'un compteur propre.
        failedLoginAttempts: 0,
        lockedUntil: null,
        securityLogs: {
          create: {
            action: "PASSWORD_CHANGE",
            ip: clientIp,
          },
        },
      },
    });

    return NextResponse.json({ success: true, message: "Mot de passe mis à jour avec succès" });
  } catch (error) {
    console.error("FORCE_PASSWORD_CHANGE_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
