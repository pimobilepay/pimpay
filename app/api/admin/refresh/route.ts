export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken, signSessionToken } from "@/lib/jwt";

/**
 * POST /api/admin/refresh
 *
 * [FIX V17] — Refresh token admin dédié.
 *
 * Renouvelle silencieusement l'access token admin (1h) sans jamais rallonger sa
 * durée de vie, via un refresh token 7j révocable stocké en Session.
 *
 * Flux :
 *   1. Lire admin_refresh_token (cookie httpOnly).
 *   2. Vérifier la signature (JWT_REFRESH_SECRET).
 *   3. Vérifier que la Session correspondante existe et isActive = true.
 *   4. Re-vérifier en DB que le compte est TOUJOURS ADMIN + ACTIVE
 *      (le rôle peut avoir été révoqué depuis l'émission du refresh token).
 *   5. Émettre un nouvel access token 1h et le poser en cookie httpOnly.
 *
 * En cas d'échec → 401, révocation du cookie, le panel redirige vers le login.
 */
export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("admin_refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    // 1. Vérifier la signature du refresh token
    let payload: any;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      const res = NextResponse.json({ error: "Token invalide" }, { status: 401 });
      res.cookies.delete("admin_refresh_token");
      return res;
    }

    const userId = (payload.id || payload.userId) as string;
    if (!userId) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // 2. La session doit exister et être active (révocation au logout / compromission)
    const session = await prisma.session.findFirst({
      where: { userId, token: refreshToken, isActive: true },
      select: { id: true },
    });

    if (!session) {
      const res = NextResponse.json(
        { error: "Session révoquée, veuillez vous reconnecter" },
        { status: 401 }
      );
      res.cookies.delete("admin_refresh_token");
      return res;
    }

    // 3. Le compte doit TOUJOURS être ADMIN + ACTIVE (défense en profondeur :
    //    un rôle rétrogradé ou un compte suspendu ne peut plus renouveler).
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });

    if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") {
      // Révoquer la session : l'admin a perdu ses droits.
      await prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      const res = NextResponse.json({ error: "Accès révoqué" }, { status: 401 });
      res.cookies.delete("admin_refresh_token");
      return res;
    }

    // 4. Nouvel access token 1h
    const newAccessToken = await signSessionToken({ id: admin.id, role: admin.role }, "1h");

    await prisma.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    const response = NextResponse.json({ token: newAccessToken, success: true });
    response.cookies.set("token", newAccessToken, {
      httpOnly: true,
      secure:   true,
      sameSite: "strict",
      maxAge:   60 * 60, // 1 heure
      path:     "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
