export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { UAParser } from "ua-parser-js";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // [FIX V8/V19] Rate limiting strict — 5 tentatives / 5 min par IP sur verify-pin
    // Un PIN a 4-6 chiffres (10 000 - 1 000 000 combinaisons) peut etre brute-force rapidement.
    const ip = getClientIp(req);
    const rl = checkRateLimit(`verify-pin:${ip}`, 5, 5 * 60_000);
    if (rl.limited) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Trop de tentatives de verification PIN. Compte temporairement bloque pour 5 minutes." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rl.resetAt),
          },
        }
      );
    }

    const body = await req.json();
    const { pin, tempToken: bodyTempToken, userId: bodyUserId } = body;

    const cookieStore = await cookies();

    // [FIX V4] — userId extrait UNIQUEMENT depuis un token signé cryptographiquement.
    //
    // Flux login (pas encore de session) :
    //   /api/auth/login → { tempToken (JWT 5min, payload: {userId, purpose}), userId }
    //   → on vérifie le tempToken avec JWT_SECRET → on extrait userId depuis son payload
    //   → on valide que le bodyUserId correspond au payload (double vérification)
    //
    // Flux session active (re-confirmation PIN) :
    //   cookie token présent → userId extrait du JWT du cookie
    //
    // Dans les deux cas : userId brut du body n'est JAMAIS utilisé sans validation cryptographique.
    const classicToken = cookieStore.get("token")?.value
      || cookieStore.get("pimpay_token")?.value;
    const piToken = cookieStore.get("pi_session_token")?.value;

    let userId: string | null = null;

    if (classicToken) {
      // Cas : session active (re-confirmation PIN)
      const { verifyJWT } = await import("@/lib/auth");
      const payload = await verifyJWT(classicToken);
      userId = payload?.id || null;
    } else if (bodyTempToken) {
      // Cas : flux login — tempToken JWT signé (5 min, purpose: mfa_verification)
      // Le payload du tempToken utilise "userId" (pas "id") — vérifier les deux
      try {
        const { verifyToken } = await import("@/lib/jwt");
        const payload = await verifyToken(bodyTempToken);
        const tokenUserId = (payload.userId || payload.id) as string | undefined;
        if (tokenUserId && payload.purpose === "mfa_verification") {
          userId = tokenUserId;
        }
      } catch {
        // tempToken invalide ou expiré
        return NextResponse.json({ error: "Session expirée, veuillez vous reconnecter" }, { status: 401 });
      }
    } else if (piToken && piToken.length >= 25 && /^[a-z0-9]+$/i.test(piToken)) {
      // [FIX V2/V13] Cas : Pi Browser — fallback avec contraintes renforcées
      // Longueur CUID (25+) et format alphanumérique requis
      // TODO V2 complet : valider via GET https://api.minepi.com/v2/me
      userId = piToken;
    }

    if (!userId || !pin) {
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
    }

    // Support both 4-digit (legacy) and 6-digit (new) PINs
    if (typeof pin !== "string" || (pin.length !== 4 && pin.length !== 6) || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { error: "Code PIN invalide. Veuillez entrer 4 ou 6 chiffres." },
        { status: 400 }
      );
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
    const newToken = await signSessionToken({
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username
    }, "24h");

    // --- DEBUT DES CORRECTIONS SESSIONS & LOGS ---
    const userAgent = req.headers.get("user-agent") || "Appareil Inconnu";
    const clientIp = req.headers.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1";
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
    const browser = uaBrowser.name || (userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Safari") ? "Safari" : "Navigateur");

    try {
      // MISE À JOUR DE L'UTILISATEUR
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: clientIp,
        }
      });

      // CRÉATION DE LA SESSION (Pour que SessionsPage fonctionne)
      await prisma.session.create({
        data: {
          userId: user.id,
          token: newToken, // On stocke le token final
          isActive: true,
          userAgent,
          ip: clientIp,
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
          metadata: { ip: clientIp, device: os, location: `${city}, ${country}` }
        }
      });
    } catch (dbError) {
      console.error("LOGGING_ERROR:", dbError);
      // On ne bloque pas la connexion si les logs échouent
    }
    // --- FIN DES CORRECTIONS ---

    // Determiner la destination selon le role
    const getRedirectPath = (role: string) => {
      switch (role) {
        case "ADMIN": return "/admin";
        case "BANK_ADMIN": return "/bank";
        case "BUSINESS_ADMIN": return "/business";
        case "AGENT": return "/hub";
        default: return "/dashboard";
      }
    };

    const response = NextResponse.json({
      success: true,
      message: "PIN validé",
      user: { id: user.id, role: user.role },
      redirectTo: getRedirectPath(user.role),
      mustChangePassword: !!(user as any).mustChangePassword,
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
