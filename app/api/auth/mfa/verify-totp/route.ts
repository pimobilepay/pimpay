export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { verifyTotp } from "@/lib/totp";
import { UAParser } from "ua-parser-js";

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET || "";
    const body = await req.json();
    const { code, userId: bodyUserId, tempToken } = body;

    if (!bodyUserId || !code) {
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
    }

    // Validate code format (6 digits)
    if (typeof code !== "string" || code.length !== 6 || !/^\d+$/.test(code)) {
      return NextResponse.json(
        { error: "Code invalide. Veuillez entrer un code a 6 chiffres." },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: bodyUserId },
      select: {
        id: true,
        role: true,
        email: true,
        username: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "Google Authenticator n'est pas configure pour ce compte" },
        { status: 400 }
      );
    }

    // Verify TOTP code
    const isValid = verifyTotp(user.twoFactorSecret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Code incorrect. Verifiez votre application Google Authenticator." },
        { status: 401 }
      );
    }

    // Generate final JWT token
    const secretKey = new TextEncoder().encode(SECRET);
    const newToken = await new SignJWT({
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secretKey);

    // Parse user agent for session logging
    const userAgent = req.headers.get("user-agent") || "Appareil Inconnu";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const country = req.headers.get("x-vercel-ip-country") || "CG";
    const city = req.headers.get("x-vercel-ip-city") || "Brazzaville";

    const uaParser = new UAParser(userAgent);
    const uaDevice = uaParser.getDevice();
    const uaOS = uaParser.getOS();
    const uaBrowser = uaParser.getBrowser();
    
    const os =
      uaDevice.vendor && uaDevice.model
        ? `${uaDevice.vendor} ${uaDevice.model}`
        : uaOS.name
        ? `${uaOS.name}${uaOS.version ? ` ${uaOS.version}` : ""}`
        : userAgent.includes("Android")
        ? "Android"
        : userAgent.includes("iPhone")
        ? "iPhone"
        : "Desktop";
    const browser =
      uaBrowser.name ||
      (userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Safari") ? "Safari" : "Navigateur");

    try {
      // Update user last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ip,
        },
      });

      // Create session
      await prisma.session.create({
        data: {
          userId: user.id,
          token: newToken,
          isActive: true,
          userAgent,
          ip,
          deviceName: os,
          os: os,
          browser: browser,
          city: city,
          country: country,
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "LOGIN",
          title: "Connexion securisee (2FA)",
          message: `Nouvelle session etablie depuis ${city}, ${country} avec Google Authenticator`,
          metadata: { ip, device: os, location: `${city}, ${country}`, method: "TOTP" },
        },
      });
    } catch (dbError) {
      console.error("LOGGING_ERROR:", dbError);
      // Don't block login if logging fails
    }

    // Determine redirect path based on role
    const getRedirectPath = (role: string) => {
      switch (role) {
        case "ADMIN":
          return "/admin";
        case "BANK_ADMIN":
          return "/bank";
        case "BUSINESS_ADMIN":
          return "/business";
        case "AGENT":
          return "/hub";
        default:
          return "/dashboard";
      }
    };

    const response = NextResponse.json({
      success: true,
      message: "Authentification 2FA reussie",
      user: { id: user.id, role: user.role },
      redirectTo: getRedirectPath(user.role),
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
    console.error("MFA_TOTP_VERIFY_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
