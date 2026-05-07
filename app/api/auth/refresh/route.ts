export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken, signAccessToken } from "@/lib/jwt";

/**
 * POST /api/auth/refresh
 *
 * [FIX V15] — Renouvellement de l'access token (15min) via refresh token (7j).
 *
 * Flux :
 *   1. Lire le refresh_token depuis le cookie httpOnly
 *   2. Vérifier la signature JWT (JWT_REFRESH_SECRET)
 *   3. Vérifier que la Session correspondante existe et isActive = true en DB
 *   4. Émettre un nouvel access token 15min
 *   5. Mettre à jour Session.lastActiveAt
 *
 * En cas d'échec → 401, le client redirige vers /auth/login.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken =
      cookieStore.get("refresh_token")?.value ||
      cookieStore.get("pimpay_refresh")?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    // 1. Vérifier la signature
    let payload: any;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const userId = (payload.id || payload.userId) as string;
    if (!userId) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // 2. Vérifier que la session est active en DB
    const session = await prisma.session.findFirst({
      where: {
        userId,
        token: refreshToken,
        isActive: true,
      },
      select: { id: true },
    });

    if (!session) {
      // Session révoquée (logout, compromission) → forcer la reconnexion
      cookieStore.delete("refresh_token");
      cookieStore.delete("pimpay_refresh");
      return NextResponse.json(
        { error: "Session révoquée, veuillez vous reconnecter" },
        { status: 401 }
      );
    }

    // 3. Émettre un nouvel access token 15min
    const newAccessToken = await signAccessToken({
      id:       userId,
      role:     payload.role,
      email:    payload.email,
      username: payload.username,
      piUserId: payload.piUserId,
    });

    // 4. Mettre à jour lastActiveAt
    await prisma.session.update({
      where: { id: session.id },
      data:  { lastActiveAt: new Date() },
    });

    // 5. Poser le nouvel access token en cookie httpOnly
    const response = NextResponse.json({ success: true });
    response.cookies.set("token", newAccessToken, {
      httpOnly: true,
      secure:   true,
      sameSite: "strict",
      maxAge:   60 * 15, // 15 minutes
      path:     "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
