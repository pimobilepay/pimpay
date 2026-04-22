export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * API pour déconnecter TOUTES les sessions de l'utilisateur (y compris la session actuelle).
 * Utilisé pour une déconnexion globale instantanée.
 */
export async function POST() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Compter les sessions avant suppression
    const sessionsCount = await prisma.session.count({
      where: { userId }
    });

    if (sessionsCount === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "Aucune session active."
      });
    }

    // Suppression immédiate de TOUTES les sessions (y compris la session actuelle)
    const result = await prisma.session.deleteMany({
      where: { userId }
    });

    // Supprimer les cookies côté serveur
    const cookieStore = await cookies();
    
    // Note: On ne peut pas supprimer les cookies HttpOnly ici, mais on les invalide
    // La suppression côté client se fait dans le composant LogoutAllButton

    // Création d'une notification de sécurité
    try {
      await prisma.notification.create({
        data: {
          userId: userId,
          type: "SECURITY",
          title: "Déconnexion globale",
          message: `Toutes vos sessions (${result.count}) ont été déconnectées de votre compte PimPay.`,
        }
      });
    } catch (notifError) {
      console.error("Notification Error:", notifError);
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} session(s) déconnectée(s) avec succès.`
    });

  } catch (error) {
    console.error("LOGOUT_ALL_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
