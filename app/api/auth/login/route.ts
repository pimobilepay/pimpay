export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken, signTempToken, signRefreshToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";
import { UAParser } from "ua-parser-js";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logSystemEvent } from "@/lib/systemLogger";
import { guardRequest } from "@/lib/defenseGuard";

export async function POST(req: Request) {
  try {
    // [FIX V8] Rate limiting — 10 tentatives / 60s par IP sur login
    const ip = getClientIp(req);

    // [IDS] Garde de défense unifié : liste noire (riposte admin), détection
    // proxy/VPN/Tor/datacenter et application des règles. Défense active : on
    // refuse le trafic entrant suspect, sans action offensive.
    const guard = await guardRequest(req, { context: "login" });
    if (!guard.allowed) {
      return NextResponse.json(
        {
          error: guard.blockedByList
            ? "Accès refusé. Votre adresse a été bloquée pour activité suspecte."
            : "Accès refusé. La connexion via VPN, proxy ou réseau anonyme n'est pas autorisée.",
        },
        { status: guard.status }
      );
    }

    const rl = checkRateLimit(`login:${ip}`, 10, 60_000);
    if (rl.limited) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Trop de tentatives de connexion. Veuillez patienter avant de reessayer." },
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

    // 2. VÉRIFICATION MOT DE PASSE + VERROUILLAGE DE COMPTE
    // Politique configurable depuis Admin > Paramètres > Sécurité.
    // maxLoginAttempts : nombre de tentatives avant verrouillage
    // lockoutDuration  : durée du verrouillage (en minutes)
    let MAX_FAILED_ATTEMPTS = 5;
    let LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes par défaut
    try {
      const secCfg = await prisma.systemConfig.findUnique({
        where: { id: "GLOBAL_CONFIG" },
        select: { maxLoginAttempts: true, lockoutDuration: true },
      });
      if (secCfg?.maxLoginAttempts && secCfg.maxLoginAttempts > 0) {
        MAX_FAILED_ATTEMPTS = secCfg.maxLoginAttempts;
      }
      if (secCfg?.lockoutDuration && secCfg.lockoutDuration > 0) {
        LOCK_DURATION_MS = secCfg.lockoutDuration * 60 * 1000;
      }
    } catch (e) {
      console.error("Security config load error:", e);
    }

    // Libellé lisible de la durée de verrouillage (ex: "30 minutes", "2 heure(s)")
    const lockMinutes = Math.round(LOCK_DURATION_MS / 60000);
    const lockLabel = lockMinutes >= 60
      ? `${Math.round(lockMinutes / 60)} heure(s)`
      : `${lockMinutes} minute(s)`;

    // Compte inexistant : pas de fuite d'information.
    if (!user || !user.password) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // 2.1 Le compte est-il actuellement verrouille ?
    const lockedUntil = (user as any).lockedUntil ? new Date((user as any).lockedUntil) : null;
    if (lockedUntil && lockedUntil > new Date()) {
      const remainingMs = lockedUntil.getTime() - Date.now();
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      return NextResponse.json(
        {
          error: `Compte temporairement bloque suite a trop de tentatives de connexion. Reessayez dans ${remainingHours} heure(s).`,
          accountStatus: "LOCKED",
          lockedUntil: lockedUntil.toISOString(),
        },
        { status: 423 }
      );
    }

    // 2.2 Verification du mot de passe
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      // Si un verrou precedent est expire, on repart de zero.
      const previousAttempts = lockedUntil && lockedUntil <= new Date() ? 0 : (user.failedLoginAttempts || 0);
      const newAttempts = previousAttempts + 1;
      const reachedLimit = newAttempts >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: reachedLimit ? 0 : newAttempts,
          lockedUntil: reachedLimit ? new Date(Date.now() + LOCK_DURATION_MS) : null,
          // [SECURITE] Limite atteinte → on forcera le changement de mot de passe
          // a la prochaine connexion reussie (apres expiration du verrou ou deblocage admin).
          ...(reachedLimit ? { mustChangePassword: true } : {}),
        },
      });

      // --- TRAÇABILITÉ ADMIN : tentative de connexion échouée / blocage ---
      const failUserAgent = req.headers.get("user-agent") || "Appareil Inconnu";
      const failClientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || ip || "Inconnue";
      const failCountry = req.headers.get("x-vercel-ip-country") || null;
      const failCity = req.headers.get("x-vercel-ip-city") || null;

      // Journal de sécurité rattaché à l'utilisateur (visible dans son historique)
      try {
        await prisma.securityLog.create({
          data: {
            userId: user.id,
            action: reachedLimit ? "ACCOUNT_LOCKED" : "FAILED_LOGIN",
            ip: failClientIp,
            device: failUserAgent,
          },
        });
      } catch (e) {
        console.error("SecurityLog create error:", e);
      }

      // Log système consultable par l'admin (onglet Système + page dédiée)
      await logSystemEvent({
        level: reachedLimit ? "ERROR" : "WARN",
        source: "AUTH",
        action: reachedLimit ? "ACCOUNT_LOCKED" : "FAILED_LOGIN",
        message: reachedLimit
          ? `Compte verrouillé (${lockLabel}) après ${MAX_FAILED_ATTEMPTS} tentatives échouées : ${user.email || user.username}`
          : `Tentative de connexion échouée (${newAttempts}/${MAX_FAILED_ATTEMPTS}) : ${user.email || user.username}`,
        details: {
          userId: user.id,
          email: user.email,
          username: user.username,
          attempts: newAttempts,
          maxAttempts: MAX_FAILED_ATTEMPTS,
          locked: reachedLimit,
          location: failCity || failCountry ? `${failCity || ""}${failCity && failCountry ? ", " : ""}${failCountry || ""}` : null,
        },
        userId: user.id,
        ip: failClientIp,
        userAgent: failUserAgent,
      });

      // Notification interne à destination des administrateurs
      try {
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN", status: "ACTIVE" },
          select: { id: true },
        });
        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              type: reachedLimit ? "SECURITY_ALERT" : "SECURITY",
              title: reachedLimit ? "Compte utilisateur verrouille" : "Tentative de connexion echouee",
              message: reachedLimit
                ? `Le compte ${user.email || user.username} a ete verrouille (48h) apres ${MAX_FAILED_ATTEMPTS} tentatives echouees.`
                : `Tentative echouee ${newAttempts}/${MAX_FAILED_ATTEMPTS} sur ${user.email || user.username} (IP ${failClientIp}).`,
              metadata: {
                targetUserId: user.id,
                email: user.email,
                username: user.username,
                attempts: newAttempts,
                locked: reachedLimit,
                ip: failClientIp,
              },
            })),
          });
        }
      } catch (e) {
        console.error("Admin security notification error:", e);
      }

      // Notification de sécurité destinée à l'UTILISATEUR concerné
      // (visible dès sa prochaine connexion réussie)
      try {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "SECURITY",
            title: reachedLimit ? "Compte temporairement bloque" : "Tentative de connexion echouee",
            message: reachedLimit
              ? `Votre compte a ete bloque pendant 48h apres ${MAX_FAILED_ATTEMPTS} tentatives de connexion echouees. Si ce n'etait pas vous, changez votre mot de passe.`
              : `Une tentative de connexion a votre compte a echoue (${newAttempts}/${MAX_FAILED_ATTEMPTS}) depuis ${failCity || failCountry || "un lieu inconnu"} (IP ${failClientIp}). Si ce n'etait pas vous, securisez votre compte.`,
            metadata: {
              attempts: newAttempts,
              maxAttempts: MAX_FAILED_ATTEMPTS,
              locked: reachedLimit,
              ip: failClientIp,
              location: failCity || failCountry ? `${failCity || ""}${failCity && failCountry ? ", " : ""}${failCountry || ""}` : null,
              device: failUserAgent,
            },
          },
        });
      } catch (e) {
        console.error("User security notification error:", e);
      }

      if (reachedLimit) {
        return NextResponse.json(
          {
            error: "Trop de tentatives echouees. Votre compte est bloque pendant 48 heures.",
            accountStatus: "LOCKED",
            lockedUntil: new Date(Date.now() + LOCK_DURATION_MS).toISOString(),
          },
          { status: 423 }
        );
      }

      const remainingAttempts = MAX_FAILED_ATTEMPTS - newAttempts;
      return NextResponse.json(
        {
          error: `Identifiants invalides. Il vous reste ${remainingAttempts} tentative(s) avant le blocage de votre compte.`,
          remainingAttempts,
        },
        { status: 401 }
      );
    }

    // 2.3 Mot de passe correct : on remet le compteur a zero si necessaire.
    if ((user.failedLoginAttempts || 0) > 0 || lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
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

    // --- CORRECTION : MISE À JOUR DU LAST LOGIN DÈS MAINTENANT ---
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
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
        mustChangePassword: !!(user as any).mustChangePassword,
        // New: indicate which methods are available
        availableMethods: {
          pin: hasPinConfigured,
          authenticator: has2FAEnabled,
        },
      });
    }

    // 4. SI PAS DE PIN (CONNEXION DIRECTE)
    // [FIX V15] — Access token 15min + refresh token 7j (révocable via Session.isActive)
    const token = await signSessionToken({
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username
    }, "15m");

    const refreshToken = await signRefreshToken({
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
    });

    // CRÉATION DE LA SESSION DANS LA DB — le refresh token est la référence révocable
    try {
      await prisma.session.create({
        data: { 
          userId: user.id, 
          token: refreshToken, // [FIX V15] — on stocke le refreshToken (7j, révocable)
          isActive: true, 
          userAgent, 
          ip: clientIp,
          deviceName: os,
          city: city,
          country: country,
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
          metadata: { ip: clientIp, location: `${city}, ${country}`, device: os }
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
      mustChangePassword: !!(user as any).mustChangePassword,
      token: token
    });

    const isProduction = process.env.NODE_ENV === "production";
    const sameSiteVal = isProduction ? ("none" as const) : ("lax" as const);

    // [FIX V15] — Access token : 15min (court, renouvelé via /api/auth/refresh)
    const accessCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteVal,
      path: "/",
      maxAge: 60 * 15,
    };
    response.cookies.set("token", token, accessCookieOptions);
    response.cookies.set("pimpay_token", token, accessCookieOptions);

    // [FIX V15] — Refresh token : 7j, stocké en DB (révocable)
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteVal,
      path: "/api/auth/refresh",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;

  } catch (error) {
    console.error("LOGIN_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
