export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) return NextResponse.json({ error: "Config Error" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { email: identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: "Identifiants requis" }, { status: 400 });
    }

    // 1. RECHERCHE DE L'UTILISATEUR
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { username: identifier.toLowerCase().trim() }
        ]
      },
    });

    // 2. VÉRIFICATION MOT DE PASSE
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // 3. VÉRIFICATION SI UN PIN EST CONFIGURÉ
    // Si l'utilisateur a un PIN, on ne le connecte pas encore.
    // On demande au front d'afficher le Modal PIN.
    if (user.pin) {
      // On crée un petit token temporaire (expire dans 5 min) juste pour l'ID
      const secretKey = new TextEncoder().encode(SECRET);
      const tempToken = await new SignJWT({ userId: user.id, purpose: "pin_verification" })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(secretKey);

      return NextResponse.json({
        success: true,
        requirePin: true,
        tempToken: tempToken,
        userId: user.id
      });
    }

    // 4. SI PAS DE PIN (Cas rare ou nouveau compte), CONNEXION DIRECTE
    // Note: Pour Pimpay, il est conseillé de forcer la création d'un PIN après.
    const secretKey = new TextEncoder().encode(SECRET);
    const token = await new SignJWT({
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secretKey);

    // LOGS ET INFOS (IP & GÉO)
    const userAgent = req.headers.get("user-agent") || "Appareil";
    const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1";
    const country = req.headers.get("x-vercel-ip-country") || "RDC";
    const city = req.headers.get("x-vercel-ip-city") || "Kinshasa";
    const os = userAgent.includes("Android") ? "Android" : userAgent.includes("iPhone") ? "iPhone" : "Desktop";

    try {
      await prisma.session.create({
        data: { userId: user.id, token, isActive: true, userAgent, ip }
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "info",
          title: `Connexion directe (Sans PIN)`,
          message: `Connecté depuis ${city}, ${country}`,
          metadata: { ip, location: `${city}, ${country}`, device: os }
        }
      });
    } catch (e) { console.error("Notif Error:", e); }

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
      redirectTo: user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard",
      token: token
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    };

    response.cookies.set("pimpay_token", token, cookieOptions);
    response.cookies.set("token", token, cookieOptions);

    return response;

  } catch (error) {
    console.error("LOGIN_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
