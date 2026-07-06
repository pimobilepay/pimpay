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
    
    // Clear cookies
    response.cookies.delete("token");
    response.cookies.delete("pimpay_token");
    response.cookies.delete("refresh_token");
    response.cookies.delete("pi_session_token");

    return response;
  } catch (error: any) {
    console.error("LOGOUT_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
