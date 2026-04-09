export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérification du token JWT
    let userId: string;
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);
      userId = payload.id as string;
    } catch (e) {
      return NextResponse.json({ error: "Session invalide ou expirée" }, { status: 401 });
    }

    // Compter les sessions avant suppression
    const sessionsCount = await prisma.session.count({
      where: {
        userId: userId,
        NOT: {
          token: token
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
          token: token
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
          message: `Action confirmée : ${result.count} session(s) tierce(s) déconnectée(s) de votre compte PimPay. Les appareils concernés seront automatiquement déconnectés dans les prochaines secondes.`,
        }
      });
    } catch (notifError) {
      console.error("Notification Error:", notifError);
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} session(s) déconnectée(s) avec succès. Les appareils seront déconnectés dans les 10 prochaines secondes.`
    });

  } catch (error) {
    console.error("LOGOUT_OTHERS_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
