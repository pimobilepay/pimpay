export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET || "";
    const body = await req.json();
    const { pin, userId: bodyUserId } = body;

    const cookieStore = await cookies();
    let userId = bodyUserId;

    if (!userId || !pin) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 1. RECHERCHE USER
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.pin) {
      return NextResponse.json({ error: "Utilisateur ou PIN non configuré" }, { status: 401 });
    }

    // 2. VÉRIFICATION DU PIN
    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      return NextResponse.json({ error: "Code PIN incorrect" }, { status: 401 });
    }

    // 3. GÉNÉRATION DU TOKEN FINAL
    const secretKey = new TextEncoder().encode(SECRET);
    const newToken = await new SignJWT({
        id: user.id,
        role: user.role,
        email: user.email,
        username: user.username
      })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secretKey);

    // --- DEBUT DES CORRECTIONS SESSIONS & LOGS ---
    const userAgent = req.headers.get("user-agent") || "Appareil Inconnu";
    const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1";
    const country = req.headers.get("x-vercel-ip-country") || "CG";
    const city = req.headers.get("x-vercel-ip-city") || "Oyo";
    const os = userAgent.includes("Android") ? "Android" : userAgent.includes("iPhone") ? "iPhone" : "Desktop";
    const browser = userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Safari") ? "Safari" : "Navigateur";

    try {
      // MISE À JOUR DE L'UTILISATEUR
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ip,
        }
      });

      // CRÉATION DE LA SESSION (Pour que SessionsPage fonctionne)
      await prisma.session.create({
        data: {
          userId: user.id,
          token: newToken, // On stocke le token final
          isActive: true,
          userAgent,
          ip,
          deviceName: os,
          os: os,
          browser: browser,
          city: city,
          country: country
        }
      });

      // NOTIFICATION DE CONNEXION RÉUSSIE
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "LOGIN",
          title: "Connexion sécurisée",
          message: `Nouvelle session établie depuis ${city}, ${country}`,
          metadata: { ip, device: os, location: `${city}, ${country}` }
        }
      });
    } catch (dbError) {
      console.error("LOGGING_ERROR:", dbError);
      // On ne bloque pas la connexion si les logs échouent
    }
    // --- FIN DES CORRECTIONS ---

    const response = NextResponse.json({
      success: true,
      message: "PIN validé",
      user: { id: user.id, role: user.role },
      redirectTo: user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard"
    });

    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ("none" as const) : ("lax" as const),
      path: "/",
      maxAge: 60 * 60 * 24,
    };

    response.cookies.set("token", newToken, cookieOptions);
    response.cookies.set("pimpay_token", newToken, cookieOptions);

    return response;

  } catch (error) {
    console.error("VERIFY_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
