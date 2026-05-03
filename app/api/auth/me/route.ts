/**
 * app/api/auth/me/route.ts
 *
 * Route manquante — causait un 404 dans les logs Vercel.
 * Retourne le profil de l'utilisateur authentifié via le cookie JWT.
 * Utilisée par le dashboard et d'autres pages client pour vérifier la session.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get("token")?.value ||
      cookieStore.get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    let payload: jose.JWTPayload;

    try {
      const verified = await jose.jwtVerify(token, secret);
      payload = verified.payload;
    } catch {
      // Token expiré ou invalide
      const response = NextResponse.json(
        { error: "Session expirée" },
        { status: 401 }
      );
      response.cookies.delete("token");
      response.cookies.delete("pimpay_token");
      return response;
    }

    if (!payload.id) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        isVerified: true,
        avatar: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("[API/AUTH/ME]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
