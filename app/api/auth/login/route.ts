export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

export async function POST(req: Request) {
  try {
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) return NextResponse.json({ error: "Config Error" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { email: identifier, password } = body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier?.toLowerCase().trim() },
          { username: identifier?.toLowerCase().trim() }
        ]
      },
    });

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // 1. GÉNÉRATION DU TOKEN
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

    // 2. RÉCUPÉRATION DES INFOS (IP & GÉO)
    const userAgent = req.headers.get("user-agent") || "Appareil";
    const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1";
    const country = req.headers.get("x-vercel-ip-country") || "Congo";
    const city = req.headers.get("x-vercel-ip-city") || "Brazzaville";
    
    // Détection de l'appareil pour l'icône
    const deviceType = userAgent.includes("iPhone") || userAgent.includes("Android") ? "Mobile" : "Desktop";
    const os = userAgent.includes("Android") ? "Android" : userAgent.includes("iPhone") ? "iPhone" : "Windows/Mac";

    // 3. CRÉATION DE LA NOTIFICATION (FORMAT STYLE ANCIEN)
    try {
      await prisma.session.create({
        data: { userId: user.id, token, isActive: true, userAgent, ip }
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "info",
          title: `Nouvelle connexion depuis un ${os}`,
          // Le message reste simple, les icônes sont gérées par les metadata
          message: `Nouvelle connexion détectée à ${city}, ${country}`,
          metadata: {
            ip: ip,
            location: `${city}, ${country}`,
            device: os,
            browser: userAgent.includes("Chrome") ? "Chrome" : "Navigateur",
            icon: deviceType.toLowerCase(), // Utilisé par le front pour l'icône
            showDetails: true
          }
        }
      });
    } catch (e) {
      console.error("Notif Error:", e);
    }

    // 4. RÉPONSE ET REDIRECTION
    const redirectUrl = user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
      redirectTo: redirectUrl,
      token: token
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    };

    // On force les deux cookies pour éviter les pages blanches/déconnexions
    response.cookies.set("pimpay_token", token, cookieOptions);
    response.cookies.set("token", token, cookieOptions);

    return response;

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
