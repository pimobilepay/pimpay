export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";

/**
 * API pour vérifier si la session actuelle est toujours valide.
 * Cette API est appelée périodiquement par le client pour détecter une déconnexion forcée.
 * 
 * Supporte deux types de sessions:
 * 1. Token JWT classique (cookie "token" ou "pimpay_token") - vérifié via verifyJWT
 * 2. Pi Network session (cookie "pi_session_token") - vérifie l'existence de l'utilisateur
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    const piToken = cookieStore.get("pi_session_token")?.value;

    // 1. Vérification pour Pi Network session (pi_session_token contient directement le userId)
    if (piToken && piToken.length > 20) {
      const user = await prisma.user.findUnique({
        where: { id: piToken, status: "ACTIVE" },
        select: { id: true }
      });

      if (user) {
        return NextResponse.json({ valid: true, sessionType: "pi_network" });
      }
      
      return NextResponse.json({ valid: false, reason: "user_not_found" }, { status: 401 });
    }

    // 2. Vérification pour token JWT classique via verifyJWT (lib/auth.ts)
    if (!token) {
      return NextResponse.json({ valid: false, reason: "no_token" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ valid: false, reason: "invalid_token" }, { status: 401 });
    }

    // Vérifier que l'utilisateur existe et est actif
    const user = await prisma.user.findUnique({
      where: { id: payload.id, status: "ACTIVE" },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ valid: false, reason: "user_not_found" }, { status: 401 });
    }

    return NextResponse.json({ valid: true, userId: user.id, sessionType: "jwt" });

  } catch (error) {
    console.error("SESSION_VERIFY_ERROR:", error);
    return NextResponse.json({ valid: false, reason: "server_error" }, { status: 500 });
  }
}
