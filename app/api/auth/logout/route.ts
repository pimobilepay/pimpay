/**
 * app/api/auth/logout/route.ts
 * [FIX V23] Proper token revocation on logout
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { revokeTokenJWT } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;

    // [FIX V23] Revoke both tokens in Redis blacklist
    if (token) {
      await revokeTokenJWT(token, 900); // 15 min TTL
    }
    if (refreshToken) {
      await revokeTokenJWT(refreshToken, 604800); // 7 days TTL
    }

    // [FIX V23] Invalidate session in DB
    await prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    }).catch(() => {});

    // Log security event
    try {
      await prisma.auditLog.create({
        data: {
          adminId: userId,
          action: "LOGOUT",
          targetId: userId,
          category: "security",
          status: "SUCCESS"
        }
      });
    } catch (e) {
      console.error("Audit log error:", e);
    }

    const response = NextResponse.json({ success: true, message: "Déconnecté" });

    // [FIX] Le Pi Browser charge PimPay dans une iframe cross-origin (voir
    // proxy.ts / CSP frame-ancestors). Les cookies de session sont donc poses
    // avec SameSite=None; Secure (obligatoire pour survivre dans ce contexte
    // cross-site). `response.cookies.delete(name)` genere un Set-Cookie de
    // suppression SANS ces attributs : dans un contexte cross-site, le
    // navigateur ignore silencieusement une suppression de cookie qui ne
    // porte pas SameSite=None; Secure, donc le cookie httpOnly "token" /
    // "pimpay_token" restait vivant et l'utilisateur Pi Network restait
    // connecte apres avoir clique sur Deconnexion. On reecrit chaque cookie
    // avec exactement les memes attributs qu'a la pose (voir pi-login) mais
    // avec maxAge: 0, pour que la suppression soit acceptee dans TOUS les
    // contextes (Pi Browser iframe ET navigateur classique).
    const isProduction = process.env.NODE_ENV === "production";
    const clearCookieOptions = {
      path: "/",
      maxAge: 0,
      sameSite: isProduction ? ("none" as const) : ("lax" as const),
      secure: isProduction,
      httpOnly: true,
    };
    for (const name of ["token", "pimpay_token", "refresh_token", "pi_session_token"]) {
      response.cookies.set(name, "", clearCookieOptions);
    }

    return response;
  } catch (error: any) {
    console.error("LOGOUT_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
