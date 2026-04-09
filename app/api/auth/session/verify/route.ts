export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";

/**
 * API pour vérifier si la session actuelle est toujours valide dans la base de données.
 * Cette API est appelée périodiquement par le client pour détecter une déconnexion forcée.
 * Si la session a été révoquée (via logout-others ou autre), on retourne une erreur 401.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ 
        valid: false, 
        reason: "no_token" 
      }, { status: 401 });
    }

    // Vérifier le JWT
    let userId: string;
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);
      userId = payload.id as string;
    } catch (e) {
      return NextResponse.json({ 
        valid: false, 
        reason: "invalid_token" 
      }, { status: 401 });
    }

    // Vérifier si la session existe dans la base de données
    const session = await prisma.session.findFirst({
      where: {
        token: token,
        userId: userId
      },
      select: {
        id: true,
        expiresAt: true
      }
    });

    if (!session) {
      // La session a été révoquée (supprimée de la DB)
      return NextResponse.json({ 
        valid: false, 
        reason: "session_revoked" 
      }, { status: 401 });
    }

    // Vérifier l'expiration
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ 
        valid: false, 
        reason: "session_expired" 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      valid: true,
      sessionId: session.id 
    });

  } catch (error) {
    console.error("SESSION_VERIFY_ERROR:", error);
    return NextResponse.json({ 
      valid: false, 
      reason: "server_error" 
    }, { status: 500 });
  }
}
