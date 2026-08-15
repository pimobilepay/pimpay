export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getAuthUserId } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    // La session courante est identifiée par le REFRESH token (c'est lui qui
    // est stocké dans `session.token`). L'ancien code comparait avec l'access
    // token du cookie `token`, qui ne correspond jamais à `session.token` :
    // le `NOT` ne protégeait donc PAS la session courante et la déconnexion
    // "totale" supprimait aussi la session de l'appareil en cours.
    const currentRefreshToken =
      cookieStore.get("refresh_token")?.value ||
      cookieStore.get("pimpay_refresh")?.value ||
      "";

    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Compter les sessions avant suppression
    const sessionsCount = await prisma.session.count({
      where: {
        userId: userId,
        NOT: {
          token: currentRefreshToken
        }
      }
    });

    if (sessionsCount === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "Aucune autre session active à déconnecter."
      });
    }

    // Suppression immédiate de toutes les sessions SAUF celle actuelle
    // Les autres appareils seront automatiquement déconnectés car le SessionGuard 
    // vérifie toutes les 10 secondes si la session existe toujours en DB
    const result = await prisma.session.deleteMany({
      where: {
        userId: userId,
        NOT: {
          token: currentRefreshToken
        }
      }
    });

    // Création d'une notification de sécurité
    try {
      await prisma.notification.create({
        data: {
          userId: userId,
          type: "SECURITY",
          title: "Alerte de sécurité",
          message: `Action confirmée : ${result.count} session(s) tierce(s) déconnectée(s) de votre compte PIMOBIPAY. Les appareils concernés seront automatiquement déconnectés dans les prochaines secondes.`,
        }
      });
    } catch (notifError) {
      console.error("Notification Error:", notifError);
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} session(s) déconnectée(s) avec succès. Les appareils concernés ont été déconnectés instantanément.`
    });

  } catch (error) {
    console.error("LOGOUT_OTHERS_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
