export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken, signTempToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";
import { UAParser } from "ua-parser-js";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // [FIX #7] Rate limiting — 10 tentatives / 60s par IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(`login:${ip}`, 10, 60_000);
    if (rl.limited) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Trop de tentatives de connexion. Réessayez dans 1 minute." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rl.resetAt),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email: identifier, password, loginType = "user" } = body;
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

    // 2.5 VÉRIFICATION DU STATUT DU COMPTE
    if (user.status === "SUSPENDED" || user.status === "BANNED") {
      return NextResponse.json({ 
        error: "Compte suspendu",
        accountStatus: "SUSPENDED",
        reason: (user as any).statusReason || "Votre compte a ete suspendu. Contactez le support pour plus d'informations."
      }, { status: 403 });
    }

    if (user.status === "MAINTENANCE") {
      const maintenanceUntil = (user as any).maintenanceUntil;
      // Verifier si la maintenance est terminee
      if (maintenanceUntil && new Date(maintenanceUntil) <= new Date()) {
        // Maintenance terminee, reactiver le compte automatiquement
        await prisma.user.update({
          where: { id: user.id },
          data: { status: "ACTIVE", statusReason: null, maintenanceUntil: null }
        });
      } else {
        return NextResponse.json({ 
          error: "Compte en maintenance",
          accountStatus: "MAINTENANCE",
          maintenanceUntil: maintenanceUntil,
          reason: (user as any).statusReason || "Votre compte est temporairement en maintenance."
        }, { status: 403 });
      }
    }

    if (user.status === "FROZEN") {
      return NextResponse.json({ 
        error: "Compte gele",
        accountStatus: "FROZEN",
        reason: (user as any).statusReason || "Votre compte a ete gele. Contactez le support."
      }, { status: 403 });
    }

    // 3. VALIDATION DU ROLE SELON LE TYPE DE CONNEXION
    // L'ADMIN peut se connecter depuis n'importe quel onglet
    const isAdmin = user.role === "ADMIN";
    
    if (!isAdmin) {
      // Verification stricte du role selon l'onglet de connexion
      if (loginType === "bank" && user.role !== "BANK_ADMIN") {
        return NextResponse.json({ 
          error: "Acces refuse. Ce portail est reserve aux administrateurs de la Banque Centrale." 
        }, { status: 403 });
      }
      
      if (loginType === "business" && user.role !== "BUSINESS_ADMIN") {
        return NextResponse.json({ 
          error: "Acces refuse. Ce portail est reserve aux administrateurs d'entreprises." 
        }, { status: 403 });
      }
      
      if (loginType === "user" && (user.role === "BANK_ADMIN" || user.role === "BUSINESS_ADMIN")) {
        return NextResponse.json({ 
          error: "Veuillez utiliser le portail correspondant a votre compte (Banque ou Business)." 
        }, { status: 403 });
      }
    }

    // --- RÉCUPÉRATION DES INFOS DE CONNEXION ---
    const userAgent = req.headers.get("user-agent") || "Appareil Inconnu";
    // ip est déjà déclarée plus haut via getClientIp(req) — [FIX #7]
    const country = req.headers.get("x-vercel-ip-country") || "CG";
    const city = req.headers.get("x-vercel-ip-city") || "Oyo";

    // Parse user agent for better device identification
    const uaParser = new UAParser(userAgent);
    const uaDevice = uaParser.getDevice();
    const uaOS = uaParser.getOS();
    const uaBrowser = uaParser.getBrowser();
    const os = uaDevice.vendor && uaDevice.model
      ? `${uaDevice.vendor} ${uaDevice.model}`
      : uaOS.name
        ? `${uaOS.name}${uaOS.version ? ` ${uaOS.version}` : ""}`
        : userAgent.includes("Android") ? "Android" : userAgent.includes("iPhone") ? "iPhone" : "Desktop";

    // --- CORRECTION : MISE À JOUR DU LAST LOGIN DÈS MAINTENANT ---
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      }
    });

    // 3. VÉRIFICATION SI MFA EST REQUIS (PIN ou 2FA)
    // Detecter le PIN par defaut "000000" - ce n'est pas un vrai PIN configure
    const isDefaultPin = user.pin ? await bcrypt.compare("000000", user.pin) : false;
    const hasPinConfigured = !!user.pin && !isDefaultPin;
    const has2FAEnabled = user.twoFactorEnabled && !!user.twoFactorSecret;
    const requireMFA = hasPinConfigured || has2FAEnabled;
    
    // Détection de la migration PIN 4 → 6 chiffres
    // pinVersion: 1 = ancien PIN 4 chiffres, 2 = nouveau PIN 6 chiffres
    // Si l'utilisateur a un PIN mais pinVersion = 1, il doit migrer
    const needsPinUpdate = hasPinConfigured && (user.pinVersion === 1 || user.pinVersion === null);

    if (requireMFA) {
      const tempToken = await signTempToken({
        userId: user.id,
        role: user.role,
        purpose: "mfa_verification"
      }, "5m");

      return NextResponse.json({
        success: true,
        requireMFA: true,
        requirePin: hasPinConfigured && !has2FAEnabled, // Only require PIN if no 2FA
        tempToken: tempToken,
        userId: user.id,
        role: user.role,
        email: user.email,
        twoFactorEnabled: has2FAEnabled,
        needsPinUpdate: needsPinUpdate && !has2FAEnabled, // Don't require PIN update if 2FA is enabled
        // New: indicate which methods are available
        availableMethods: {
          pin: hasPinConfigured,
          authenticator: has2FAEnabled,
        },
      });
    }

    // 4. SI PAS DE PIN (CONNEXION DIRECTE)
    const token = await signSessionToken({
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username
    }, "7d");

    // CRÉATION DE LA SESSION DANS LA DB
    try {
      await prisma.session.create({
        data: { 
          userId: user.id, 
          token, 
          isActive: true, 
          userAgent, 
          ip,
          deviceName: os,
          city: city,
          country: country,
          // Extraction sommaire du navigateur
          browser: uaBrowser.name || (userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Safari") ? "Safari" : "Navigateur"),
          os: os
        }
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "LOGIN", // Changé en LOGIN pour ton filtre de page notif
          title: `Nouvelle connexion`,
          message: `Connecté depuis ${city}, ${country} (${os})`,
          metadata: { ip, location: `${city}, ${country}`, device: os }
        }
      });
    } catch (e) { 
      console.error("Session/Notif Error:", e); 
    }

    // Determiner la destination selon le role
    const getRedirectPath = (role: string) => {
      switch (role) {
        case "ADMIN": return "/admin";
        case "BANK_ADMIN": return "/bank";
        case "BUSINESS_ADMIN": return "/business";
        default: return "/dashboard";
      }
    };

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
      redirectTo: getRedirectPath(user.role),
      token: token
    });

    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      // #12 FIX: strict au lieu de 'none' — évite les attaques CSRF cross-site
      // Si Pi Browser nécessite cross-site, ajouter un token CSRF anti-forgery
      sameSite: ("strict" as const),
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
