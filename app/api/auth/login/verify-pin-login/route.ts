export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) return NextResponse.json({ error: "Erreur de configuration" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { userId, pin } = body;

    if (!userId || !pin) {
      return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    // 1. RECHERCHE DE L'UTILISATEUR (Selon ton schéma Prisma)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        pin: true,
        role: true,
        status: true,
        name: true
      }
    });

    if (!user || !user.pin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 401 });
    }

    // 2. VÉRIFICATION DU PIN
    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      return NextResponse.json({ error: "Code PIN incorrect" }, { status: 401 });
    }

    // 3. GÉNÉRATION DU TOKEN DE SESSION FINAL
    const secretKey = new TextEncoder().encode(SECRET);
    const token = await new SignJWT({
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username
      })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secretKey);

    // 4. RÉPONSE ET COOKIES
    const response = NextResponse.json({ 
      success: true, 
      user: { id: user.id, username: user.username, role: user.role, name: user.name } 
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 heures
    };

    response.cookies.set("token", token, cookieOptions);
    response.cookies.set("pimpay_token", token, cookieOptions);

    return response;

  } catch (error) {
    console.error("VERIFY_PIN_LOGIN_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
