export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    // --- 1. Invalider la session en base de donnees ---
    if (token) {
      try {
        const secretStr = process.env.JWT_SECRET;
        if (secretStr) {
          const secret = new TextEncoder().encode(secretStr);
          const { payload } = await jose.jwtVerify(token, secret);
          const userId = payload.id as string;

          if (userId) {
            // Desactiver la session actuelle
            await prisma.session.updateMany({
              where: { userId, token, isActive: true },
              data: { isActive: false },
            });
          }
        }
      } catch {
        // Token expire ou invalide -- on continue la suppression des cookies
      }
    }

    // --- 2. Supprimer TOUS les cookies de session ---
    // On doit matcher les memes attributs que ceux utilises a la creation
    // Pi login utilise sameSite:"none" + secure:true en production
    const isProduction = process.env.NODE_ENV === "production";

    // Options "standard" (login classique avec sameSite:"lax")
    const laxOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      expires: new Date(0),
      path: "/",
    };

    // Options "Pi Browser" (pi-login utilise sameSite:"none" + secure en prod)
    const noneOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "none" as const,
      expires: new Date(0),
      path: "/",
    };

    // Supprimer avec les deux variantes de sameSite pour couvrir tous les cas
    const cookieNames = ["token", "pimpay_token", "session", "pi_session_token"];

    for (const name of cookieNames) {
      cookieStore.set(name, "", laxOptions);
      if (isProduction) {
        cookieStore.set(name, "", noneOptions);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Deconnecte avec succes",
      redirectTo: "/auth/login",
    });
  } catch (error) {
    console.error("[PimPay] Logout error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la deconnexion" },
      { status: 500 }
    );
  }
}
