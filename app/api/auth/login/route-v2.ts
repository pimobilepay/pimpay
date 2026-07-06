/**
 * app/api/auth/login/route.ts - UPDATED
 * [FIX V26] Secure logging without sensitive data exposure
 */

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken, signTempToken, signRefreshToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";
import { UAParser } from "ua-parser-js";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { guardRequest } from "@/lib/defenseGuard";
import { logAuthEvent, logSuspiciousActivity } from "@/lib/secureLogger";
import { validateCsrfMiddleware } from "@/lib/csrf";

export async function POST(req: Request) {
  try {
    // [FIX V25] Validate CSRF token
    if (!validateCsrfMiddleware(req)) {
      return NextResponse.json(
        { error: "CSRF token invalide" },
        { status: 403 }
      );
    }

    const ip = getClientIp(req);

    // [FIX V27] IDS Defense Guard
    const guard = await guardRequest(req as any, { context: "login" });
    if (!guard.allowed) {
      await logSuspiciousActivity(
        'LOGIN_IDS_BLOCK',
        undefined,
        ip,
        guard.reason || 'IDS defense triggered',
        { blocked_by_list: guard.blockedByList }
      );

      return NextResponse.json(
        {
          error: guard.blockedByList
            ? "Accès refusé. Votre adresse a été bloquée pour activité suspecte."
            : "Accès refusé. La connexion via VPN, proxy ou réseau anonyme n'est pas autorisée.",
        },
        { status: guard.status }
      );
    }

    // Rate limiting
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

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { username: identifier.toLowerCase().trim() }
        ]
      },
    });

    // Get security config
    let MAX_FAILED_ATTEMPTS = 5;
    let LOCK_DURATION_MS = 30 * 60 * 1000;
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

    const lockMinutes = Math.round(LOCK_DURATION_MS / 60000);
    const lockLabel = lockMinutes >= 60
      ? `${Math.round(lockMinutes / 60)} heure(s)`
      : `${lockMinutes} minute(s)`;

    // Account not found - no info leakage
    if (!user || !user.password) {
      // [FIX V26] Log suspicious activity without exposing user
      await logSuspiciousActivity(
        'LOGIN_INVALID_CREDENTIALS',
        undefined,
        ip,
        'Invalid email/username or no password set',
        { identifier_length: identifier.length }
      );
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // Check account lock
    const lockedUntil = (user as any).lockedUntil ? new Date((user as any).lockedUntil) : null;
    if (lockedUntil && lockedUntil > new Date()) {
      const remainingMs = lockedUntil.getTime() - Date.now();
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      
      await logSuspiciousActivity(
        'LOGIN_ACCOUNT_LOCKED',
        user.id,
        ip,
        'Account locked due to failed login attempts',
        { locked_until: lockedUntil.toISOString() }
      );

      return NextResponse.json(
        {
          error: `Compte temporairement bloque suite a trop de tentatives de connexion. Reessayez dans ${remainingHours} heure(s).`,
          accountStatus: "LOCKED",
          lockedUntil: lockedUntil.toISOString(),
        },
        { status: 423 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      const previousAttempts = lockedUntil && lockedUntil <= new Date() ? 0 : (user.failedLoginAttempts || 0);
      const newAttempts = previousAttempts + 1;
      const reachedLimit = newAttempts >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: reachedLimit ? 0 : newAttempts,
          lockedUntil: reachedLimit ? new Date(Date.now() + LOCK_DURATION_MS) : null,
          ...(reachedLimit ? { mustChangePassword: true } : {}),
        },
      });

      // [FIX V26] Secure logging
      await logAuthEvent(
        'LOGIN',
        user.id,
        user.email || user.username || 'unknown',
        ip,
        req.headers.get("user-agent") || "Unknown",
        'FAILED'
      );

      // Notify admins
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
                ? `Compte ${user.email || user.username} bloque apres ${MAX_FAILED_ATTEMPTS} tentatives.`
                : `Tentative echouee ${newAttempts}/${MAX_FAILED_ATTEMPTS} sur ${user.email || user.username}.`,
              metadata: {
                targetUserId: user.id,
                attempts: newAttempts,
                locked: reachedLimit,
              },
            })),
          });
        }
      } catch (e) {
        console.error("Admin notification error:", e);
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

    // Password correct - reset failed attempts
    if ((user.failedLoginAttempts || 0) > 0 || lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // Check account status
    if (user.status === "SUSPENDED" || user.status === "BANNED") {
      await logAuthEvent(
        'LOGIN',
        user.id,
        user.email || user.username || 'unknown',
        ip,
        req.headers.get("user-agent") || "Unknown",
        'FAILED'
      );
      return NextResponse.json({ 
        error: "Compte suspendu",
        accountStatus: "SUSPENDED",
        reason: (user as any).statusReason || "Votre compte a ete suspendu. Contactez le support pour plus d'informations."
      }, { status: 403 });
    }

    // Update last login
    const userAgent = req.headers.get("user-agent") || "Appareil Inconnu";
    const clientIp = req.headers.get("x-forwarded-for")?.split(',')[0] || ip || "127.0.0.1";
    const country = req.headers.get("x-vercel-ip-country") || "CG";
    const city = req.headers.get("x-vercel-ip-city") || "Oyo";

    const uaParser = new UAParser(userAgent);
    const uaDevice = uaParser.getDevice();
    const uaOS = uaParser.getOS();
    const uaBrowser = uaParser.getBrowser();
    const os = uaDevice.vendor && uaDevice.model
      ? `${uaDevice.vendor} ${uaDevice.model}`
      : uaOS.name
        ? `${uaOS.name}${uaOS.version ? ` ${uaOS.version}` : ""}`
        : "Desktop";

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
      }
    });

    // Check MFA
    const isDefaultPin = user.pin ? await bcrypt.compare("000000", user.pin) : false;
    const hasPinConfigured = !!user.pin && !isDefaultPin;
    const has2FAEnabled = user.twoFactorEnabled && !!user.twoFactorSecret;
    const requireMFA = hasPinConfigured || has2FAEnabled;
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
        requirePin: hasPinConfigured && !has2FAEnabled,
        tempToken: tempToken,
        userId: user.id,
        role: user.role,
        email: user.email,
        twoFactorEnabled: has2FAEnabled,
        needsPinUpdate: needsPinUpdate && !has2FAEnabled,
        mustChangePassword: !!(user as any).mustChangePassword,
        availableMethods: {
          pin: hasPinConfigured,
          authenticator: has2FAEnabled,
        },
      });
    }

    // Generate tokens
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

    // Create session
    try {
      await prisma.session.create({
        data: { 
          userId: user.id, 
          token: refreshToken,
          isActive: true, 
          userAgent, 
          ip: clientIp,
          deviceName: os,
          city: city,
          country: country,
          browser: uaBrowser.name || "Browser",
          os: os
        }
      });

      // [FIX V26] Secure login notification
      await logAuthEvent(
        'LOGIN',
        user.id,
        user.email || user.username || 'unknown',
        clientIp,
        userAgent,
        'SUCCESS'
      );

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "LOGIN",
          title: `Nouvelle connexion`,
          message: `Connecté depuis ${city}, ${country} (${os})`,
          metadata: { location: `${city}, ${country}`, device: os }
        }
      }).catch(() => {});
    } catch (e) { 
      console.error("Session/Notif Error:", e); 
    }

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

    const accessCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteVal,
      path: "/",
      maxAge: 60 * 15,
    };
    response.cookies.set("token", token, accessCookieOptions);
    response.cookies.set("pimpay_token", token, accessCookieOptions);

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
