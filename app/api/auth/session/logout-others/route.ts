export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose"; // Utilisation de jose pour valider le token

export async function POST() {
  try {
    const token = cookies().get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // --- LOGIQUE DE VÉRIFICATION DU TOKEN (Remplace getCurrentUser) ---
    let userId: string;
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);
      userId = payload.id as string;
    } catch (e) {
      return NextResponse.json({ error: "Session invalide ou expirée" }, { status: 401 });
    }
    // ------------------------------------------------------------------

    // Suppression de toutes les sessions de cet utilisateur SAUF celle actuelle
    const result = await prisma.session.deleteMany({
      where: {
        userId: userId,
        NOT: {
          token: token
        }
      }
    });

    // Création d'une notification de sécurité pour informer l'utilisateur
    try {
      await prisma.notification.create({
        data: {
          userId: userId,
          type: "SECURITY",
          title: "Sécurité du compte",
          message: `Toutes les autres sessions (${result.count}) ont été déconnectées avec succès.`,
        }
      });
    } catch (notifError) {
      // On ne bloque pas la réponse si la notification échoue
      console.error("Notification Error:", notifError);
    }

    return NextResponse.json({
      success: true,
      message: `${result.count} sessions déconnectées.`
    });

  } catch (error) {
    console.error("LOGOUT_OTHERS_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
