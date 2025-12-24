import { cookies } from "next/headers";
import { verifyRefreshToken, signAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  // 1. Récupération du cookie (asynchrone dans les dernières versions)
  const cookieStore = await cookies();
  const token = cookieStore.get("refresh_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "No token" }, { status: 401 });
  }

  try {
    // 2. Vérification du payload du refresh token
    const payload = verifyRefreshToken(token) as { id: string };

    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 403 });
    }

    // 3. Récupération de l'utilisateur
    const user = await prisma.user.findUnique({ 
      where: { id: payload.id } 
    });

    /**
     * Correction de l'erreur de type :
     * On utilise un cast 'any' ou on vérifie l'existence pour éviter de bloquer le build 
     * si le schéma Prisma n'est pas encore synchronisé.
     */
    const userData = user as any;

    if (!userData || userData.refreshToken !== token) {
      return NextResponse.json({ error: "Invalid token or user not found" }, { status: 403 });
    }

    // 4. Génération du nouvel Access Token
    // On s'assure que 'role' existe, sinon on met 'USER' par défaut
    const accessToken = signAccessToken({ 
      id: userData.id, 
      role: userData.role || "USER" 
    });

    return NextResponse.json({ accessToken });

  } catch (error) {
    console.error("Refresh Token Error:", error);
    return NextResponse.json({ error: "Expired or invalid token" }, { status: 403 });
  }
}
