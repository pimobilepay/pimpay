export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
};

export async function GET(req: Request) {
  try {
    // 1. Essayer d'abord via cookie (session DB)
    const cookieHeader = req.headers.get("cookie");
    const cookieToken = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    // 2. Fallback sur Authorization header
    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    const token = cookieToken || bearerToken;

    if (!token) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // 3. Trouver l'utilisateur via session DB ou JWT
    let userId: string | null = null;

    const dbSession = await prisma.session.findUnique({
      where: { token },
      select: { userId: true, isActive: true },
    });

    if (dbSession && dbSession.isActive) {
      userId = dbSession.userId;
    } else {
      const secret = getJwtSecret();
      if (secret) {
        try {
          const { payload } = await jose.jwtVerify(token, secret);
          userId = payload.id as string;
        } catch {
          return NextResponse.json({ error: "Session expiree" }, { status: 401 });
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // 4. Recuperer les informations de securite de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        passwordUpdatedAt: true,
        pinUpdatedAt: true,
        pinVersion: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    return NextResponse.json({
      passwordUpdatedAt: user.passwordUpdatedAt || user.createdAt,
      pinUpdatedAt: user.pinUpdatedAt || user.createdAt,
      pinVersion: user.pinVersion || 1,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    }, { status: 200 });

  } catch (error) {
    console.error("Erreur API Security Info:", error);
    return NextResponse.json({ 
      error: "Erreur serveur" 
    }, { status: 500 });
  }
}
