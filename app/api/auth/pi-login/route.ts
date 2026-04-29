export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

/**
 * SECURITY FIX [CRITIQUE] — pi-login
 *
 * - Durée JWT réduite de 30 jours → 7 jours (cohérent avec les autres routes).
 * - error.stack n'est plus inclus dans les réponses d'erreur HTTP.
 * - Les erreurs internes ne leakent plus de détails de stack vers le client.
 */

export async function POST(request: Request) {
  try {
    const { accessToken, piUserId, username, phone } = await request.json();

    if (!piUserId || !accessToken) {
      return NextResponse.json(
        { error: "UID et accessToken requis" },
        { status: 400 }
      );
    }

    let verifiedUser: Record<string, unknown> | null = null;
    try {
      const piRes = await fetch("https://api.minepi.com/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (piRes.ok) {
        verifiedUser = await piRes.json();
      }
    } catch (err) {
      console.warn("[PimPay] Vérification Pi API échouée, fallback local:", err);
    }

    const finalPiUserId = (verifiedUser?.uid as string) || piUserId;
    const finalUsername = (verifiedUser?.username as string) || username;
    const finalPhone =
      (verifiedUser?.credentials as Record<string, string>)?.phone_number ||
      phone ||
      null;

    const userSelect = {
      id: true,
      username: true,
      role: true,
      piUserId: true,
      firstName: true,
      lastName: true,
      avatar: true,
      phone: true,
      wallets: {
        select: { currency: true, balance: true, type: true },
      },
    } as const;

    let user = await prisma.user.findUnique({
      where: { piUserId: finalPiUserId },
      select: userSelect,
    });

    if (user) {
      user = await prisma.user.update({
        where: { piUserId: finalPiUserId },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp:
            request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
          ...(finalPhone && { phone: finalPhone }),
        },
        select: userSelect,
      });
    } else {
      const baseCreateData = {
        piUserId: finalPiUserId,
        phone: finalPhone,
        role: "USER" as const,
        status: "ACTIVE" as const,
        wallets: {
          create: [
            { currency: "PI", balance: 0, type: "PI" as const },
            { currency: "XAF", balance: 0, type: "FIAT" as const },
          ],
        },
      };

      const tryCreate = async (usernameToUse: string) =>
        prisma.user.create({
          data: { ...baseCreateData, username: usernameToUse },
          select: userSelect,
        });

      const isP2002OnUsername = (e: unknown) => {
        const err = e as { code?: string; meta?: { target?: string | string[] } };
        return (
          err?.code === "P2002" &&
          (Array.isArray(err?.meta?.target)
            ? err.meta.target.includes("username")
            : typeof err?.meta?.target === "string" &&
              err.meta.target.includes("username"))
        );
      };

      try {
        user = await tryCreate(finalUsername);
      } catch (e1: unknown) {
        if (!isP2002OnUsername(e1)) throw e1;
        const suffix1 =
          String(finalPiUserId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6) || "pi";
        try {
          user = await tryCreate(`${finalUsername}_${suffix1}`);
        } catch (e2: unknown) {
          if (!isP2002OnUsername(e2)) throw e2;
          const rand = Math.random().toString(36).slice(2, 6).padEnd(4, "x");
          user = await tryCreate(`${finalUsername}_${rand}`);
        }
      }
    }

    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      console.error("[PimPay] JWT_SECRET non configuré");
      return NextResponse.json({ error: "Config JWT manquante" }, { status: 500 });
    }

    const secretKey = new TextEncoder().encode(SECRET);

    // FIX [MOYEN]: Durée réduite de 30d → 7d
    const token = await new SignJWT({
      id: user!.id,
      role: user!.role,
      username: user!.username,
      piUserId: user!.piUserId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secretKey);

    const userAgent = request.headers.get("user-agent") || "Pi Browser";
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const country = request.headers.get("x-vercel-ip-country") || "CG";
    const city = request.headers.get("x-vercel-ip-city") || "";

    prisma.session
      .create({
        data: {
          userId: user!.id,
          token,
          isActive: true,
          userAgent,
          ip,
          deviceName: "Pi Browser",
          browser: "Pi Browser",
          os: userAgent.includes("Android")
            ? "Android"
            : userAgent.includes("iPhone")
            ? "iOS"
            : "Desktop",
          city,
          country,
        },
      })
      .catch((e) => console.error("[PimPay] Session creation error:", e));

    prisma.notification
      .create({
        data: {
          userId: user!.id,
          type: "LOGIN",
          title: "Connexion Pi Browser",
          message: `Connecté depuis ${city || "inconnu"}, ${country} via Pi Browser`,
          metadata: { ip, device: "Pi Browser" },
        },
      })
      .catch((e) => console.error("[PimPay] Notification error:", e));

    prisma.systemLog
      .create({
        data: {
          level: "INFO",
          source: "PI_LOGIN",
          action: "LOGIN_SUCCESS",
          message: `Connexion Pi réussie pour ${user!.username}`,
          details: {
            userId: user!.id,
            username: user!.username,
            phone: finalPhone,
          },
          ip,
          userAgent,
        },
      })
      .catch((e) => console.error("[PimPay] SystemLog error:", e));

    const response = NextResponse.json({
      success: true,
      user: {
        id: user!.id,
        username: user!.username,
        role: user!.role,
        firstName: user!.firstName,
        lastName: user!.lastName,
        avatar: user!.avatar,
        phone: user!.phone,
        wallets: user!.wallets,
      },
    });

    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      sameSite: isProduction ? ("none" as const) : ("lax" as const),
      secure: isProduction,
      httpOnly: true,
    };

    response.cookies.set("pimpay_token", token, cookieOptions);
    response.cookies.set("token", token, cookieOptions);

    return response;
  } catch (error: unknown) {
    const err = error as {
      code?: string;
      message?: string;
      meta?: { target?: string | string[] };
    };

    if (err?.code === "P2002") {
      const target = err?.meta?.target;
      const field = Array.isArray(target)
        ? target.join(", ")
        : String(target || "champ unique");

      prisma.systemLog
        .create({
          data: {
            level: "WARN",
            source: "PI_LOGIN",
            action: "LOGIN_CONFLICT",
            message: `Conflit d'unicité Prisma sur ${field}`,
            details: { code: err.code, target },
            ip:
              request.headers.get("x-forwarded-for")?.split(",")[0] || null,
            userAgent: request.headers.get("user-agent") || null,
          },
        })
        .catch(() => {});

      return NextResponse.json(
        {
          error: "Conflit d'unicité lors de la synchronisation du compte Pi",
          field,
          code: "P2002",
        },
        { status: 409 }
      );
    }

    console.error("[PimPay] Pi Login Error:", err?.message);

    // FIX [CRITIQUE]: on ne renvoie PAS error.stack dans la réponse
    prisma.systemLog
      .create({
        data: {
          level: "ERROR",
          source: "PI_LOGIN",
          action: "LOGIN_FAILED",
          message: `Erreur connexion Pi: ${err?.message}`,
          details: { code: err?.code },
          ip:
            request.headers.get("x-forwarded-for")?.split(",")[0] || null,
          userAgent: request.headers.get("user-agent") || null,
        },
      })
      .catch(() => {});

    return NextResponse.json(
      { error: "Erreur d'authentification" },
      { status: 500 }
    );
  }
}
