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
    const { accessToken, piUserId, username, phone } = await request.json();

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

    // On utilise les donnees verifiees si disponibles, sinon celles envoyees par le client
    const finalPiUserId = verifiedUser?.uid || piUserId;
    const finalUsername = verifiedUser?.username || username;
    // Pi Network peut retourner le phone dans credentials ou dans user
    const finalPhone = verifiedUser?.credentials?.phone_number || phone || null;

    // Champs selectionnes apres chaque lecture/ecriture du User
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

    // 1) On tente de retrouver un utilisateur existant par son piUserId.
    //    Si trouve -> update. Sinon -> create avec gestion des collisions de username.
    let user = await prisma.user.findUnique({
      where: { piUserId: finalPiUserId },
      select: userSelect,
    });

    if (user) {
      // Utilisateur existant : on met a jour les champs de session et, si fourni, le phone.
      user = await prisma.user.update({
        where: { piUserId: finalPiUserId },
        data: {
          // On conserve le username existant en base; on ne l'ecrase pas avec celui de Pi
          // pour eviter une collision avec un autre compte ayant deja ce username.
          lastLoginAt: new Date(),
          lastLoginIp: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
          ...(finalPhone && { phone: finalPhone }),
        },
        select: userSelect,
      });
    } else {
      // Nouvel utilisateur : on tente de creer avec le username fourni par Pi.
      // Si ce username est deja pris par un autre compte, on genere un username unique.
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

      const tryCreate = async (usernameToUse: string) => {
        return prisma.user.create({
          data: { ...baseCreateData, username: usernameToUse },
          select: userSelect,
        });
      };

      const isP2002OnUsername = (e: any) =>
        e?.code === "P2002" &&
        (Array.isArray(e?.meta?.target)
          ? e.meta.target.includes("username")
          : typeof e?.meta?.target === "string" && e.meta.target.includes("username"));

      try {
        user = await tryCreate(finalUsername);
      } catch (e1: any) {
        if (!isP2002OnUsername(e1)) {
          throw e1;
        }
        // Retry 1 : suffixe deterministe a partir du piUserId
        const suffix1 = String(finalPiUserId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6) || "pi";
        const candidate2 = `${finalUsername}_${suffix1}`;
        try {
          user = await tryCreate(candidate2);
        } catch (e2: any) {
          if (!isP2002OnUsername(e2)) {
            throw e2;
          }
          // Retry 2 : suffixe aleatoire 4 caracteres
          const rand = Math.random().toString(36).slice(2, 6).padEnd(4, "x");
          const candidate3 = `${finalUsername}_${rand}`;
          user = await tryCreate(candidate3);
        }
      }
    }

    // Creation du JWT PimPay
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      console.error("[PimPay] JWT_SECRET non configure");
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

    // Creation de la session en DB (non-bloquant)
    const userAgent = request.headers.get("user-agent") || "Pi Browser";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const country = request.headers.get("x-vercel-ip-country") || "CG";
    const city = request.headers.get("x-vercel-ip-city") || "";

    // Executer en arriere-plan sans bloquer la reponse
    prisma.session.create({
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
    }).catch((e) => console.error("[PimPay] Session creation error:", e));

    prisma.notification.create({
      data: {
        userId: user.id,
        type: "LOGIN",
        title: "Connexion Pi Browser",
        message: `Connecte depuis ${city || "inconnu"}, ${country} via Pi Browser`,
        metadata: { ip, device: "Pi Browser" },
      },
    }).catch((e) => console.error("[PimPay] Notification creation error:", e));

    // Log dans SystemLog (non-bloquant)
    prisma.systemLog.create({
      data: {
        level: "INFO",
        source: "PI_LOGIN",
        action: "LOGIN_SUCCESS",
        message: `Connexion Pi reussie pour ${user.username}`,
        details: { userId: user.id, username: user.username, phone: finalPhone },
        ip,
        userAgent,
      },
    }).catch((e) => console.error("[PimPay] SystemLog error:", e));

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        phone: user.phone,
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

    // Gestion explicite d'une violation d'unicite residuelle -> 409 au lieu d'un 500 opaque
    if (error?.code === "P2002") {
      const target = error?.meta?.target;
      const field = Array.isArray(target) ? target.join(", ") : String(target || "champ unique");

      // Log l'erreur (non-bloquant)
      prisma.systemLog.create({
        data: {
          level: "WARN",
          source: "PI_LOGIN",
          action: "LOGIN_CONFLICT",
          message: `Conflit d'unicite Prisma sur ${field}`,
          details: { error: error.message, code: error.code, target },
          ip: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
          userAgent: request.headers.get("user-agent") || null,
        },
      }).catch(() => {});

      return NextResponse.json(
        {
          error: "Conflit d'unicite lors de la synchronisation du compte Pi",
          field,
          code: "P2002",
        },
        { status: 409 }
      );
    }

    // Log l'erreur (non-bloquant)
    prisma.systemLog.create({
      data: {
        level: "ERROR",
        source: "PI_LOGIN",
        action: "LOGIN_FAILED",
        message: `Erreur connexion Pi: ${error.message}`,
        details: { error: error.message, code: error.code },
        ip: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
        userAgent: request.headers.get("user-agent") || null,
      },
    }).catch(() => {});

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
