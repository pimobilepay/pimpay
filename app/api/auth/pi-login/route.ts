export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

/**
 * POST /api/auth/pi-login
 * 
 * Recoit le token d'authentification Pi SDK et synchronise l'utilisateur
 * dans la base de donnees Prisma. Cree un JWT pour la session PimPay.
 */
export async function POST(request: Request) {
  try {
    const { accessToken, piUserId, username } = await request.json();

    if (!piUserId || !accessToken) {
      return NextResponse.json(
        { error: "UID et accessToken requis" },
        { status: 400 }
      );
    }

    // Verification du token aupres de Pi Platform API
    let verifiedUser: any = null;
    try {
      const piRes = await fetch("https://api.minepi.com/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (piRes.ok) {
        verifiedUser = await piRes.json();
      }
    } catch (err) {
      console.warn("[PimPay] Verification Pi API echouee, fallback local:", err);
    }

    // On utilise le uid verifie si disponible, sinon le uid envoye par le client
    const finalPiUserId = verifiedUser?.uid || piUserId;
    const finalUsername = verifiedUser?.username || username;

    // Upsert de l'utilisateur dans Prisma
    const user = await prisma.user.upsert({
      where: { piUserId: finalPiUserId },
      update: {
        username: finalUsername,
        lastLoginAt: new Date(),
        lastLoginIp: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      },
      create: {
        piUserId: finalPiUserId,
        username: finalUsername,
        role: "USER",
        status: "ACTIVE",
        wallets: {
          create: [
            { currency: "PI", balance: 0, type: "PI" },
            { currency: "XAF", balance: 0, type: "FIAT" },
          ],
        },
      },
      select: {
        id: true,
        username: true,
        role: true,
        piUserId: true,
        firstName: true,
        lastName: true,
        avatar: true,
        wallets: {
          select: { currency: true, balance: true, type: true },
        },
      },
    });

    // Creation du JWT PimPay
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Config JWT manquante" }, { status: 500 });
    }

    const secretKey = new TextEncoder().encode(SECRET);
    const token = await new SignJWT({
      id: user.id,
      role: user.role,
      username: user.username,
      piUserId: user.piUserId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secretKey);

    // Creation de la session en DB
    const userAgent = request.headers.get("user-agent") || "Pi Browser";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const country = request.headers.get("x-vercel-ip-country") || "CG";
    const city = request.headers.get("x-vercel-ip-city") || "";

    try {
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          isActive: true,
          userAgent,
          ip,
          deviceName: "Pi Browser",
          browser: "Pi Browser",
          os: userAgent.includes("Android") ? "Android" : userAgent.includes("iPhone") ? "iOS" : "Desktop",
          city,
          country,
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "LOGIN",
          title: "Connexion Pi Browser",
          message: `Connecte depuis ${city || "inconnu"}, ${country} via Pi Browser`,
          metadata: { ip, device: "Pi Browser" },
        },
      });
    } catch (e) {
      console.error("[PimPay] Session/Notif creation error:", e);
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        wallets: user.wallets,
      },
    });

    // Cookies de session - compatibles Pi Browser HTTPS
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      sameSite: isProduction ? ("none" as const) : ("lax" as const),
      secure: isProduction,
      httpOnly: true,
    };

    response.cookies.set("pimpay_token", token, cookieOptions);
    response.cookies.set("token", token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error("[PimPay] Pi Login Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
