export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";

export async function POST() {
  try {
    // 🛡️ CORRECT : On déballe la Promise cookies() avec await
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // --- LOGIQUE DE VÉRIFICATION DU TOKEN ---
    let userId: string;
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);
      userId = payload.id as string;
    } catch (e) {
      return NextResponse.json({ error: "Session invalide ou expirée" }, { status: 401 });
    }

    // Suppression de toutes les sessions SAUF celle actuelle
    // Pour PimPay, on s'assure que l'utilisateur ne se déconnecte pas lui-même
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
          message: `Action confirmée : ${result.count} session(s) tierce(s) déconnectée(s) de votre compte PimPay.`,
        }
      });
    } catch (notifError) {
      console.error("Notification Error:", notifError);
    }

    return NextResponse.json({
      success: true,
      message: `${result.count} session(s) déconnectée(s).`
    });

  } catch (error) {
    console.error("LOGOUT_OTHERS_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
