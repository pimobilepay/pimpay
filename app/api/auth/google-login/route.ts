export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

/**
 * POST /api/auth/google-login
 *
 * Recoit le code d'autorisation Google (popup OAuth code flow), l'echange
 * contre des tokens, recupere le profil utilisateur, puis synchronise
 * l'utilisateur et son compte (model Account) dans Prisma.
 * Cree le meme JWT de session PimPay que la connexion Pi Browser.
 */
export async function POST(request: Request) {
  try {
    const { code, redirectUri } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Code d'autorisation Google requis" },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("[PimPay] Credentials Google non configures");
      return NextResponse.json({ error: "Config Google manquante" }, { status: 500 });
    }

    // 1) Echange du code contre des tokens Google.
    // redirectUri "postmessage" correspond au flux popup de Google Identity Services.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || "postmessage",
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[PimPay] Echec echange token Google:", tokenData);
      return NextResponse.json(
        { error: tokenData.error_description || "Echec authentification Google" },
        { status: 401 }
      );
    }

    // 2) Recuperation du profil utilisateur Google.
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!profileRes.ok) {
      return NextResponse.json(
        { error: "Impossible de recuperer le profil Google" },
        { status: 401 }
      );
    }

    const profile = await profileRes.json();
    const googleId: string = profile.sub;
    const email: string | null = profile.email || null;
    const emailVerified: boolean = profile.email_verified ?? false;
    const fullName: string | null = profile.name || null;
    const firstName: string | null = profile.given_name || null;
    const lastName: string | null = profile.family_name || null;
    const avatar: string | null = profile.picture || null;

    if (!googleId) {
      return NextResponse.json({ error: "Profil Google invalide" }, { status: 400 });
    }

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

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // 3) Resolution de l'utilisateur :
    //    a. via un Account Google existant
    //    b. sinon via l'email
    //    c. sinon creation d'un nouvel utilisateur
    let user:
      | (Awaited<ReturnType<typeof prisma.user.findUnique>> & Record<string, any>)
      | null = null;

    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: googleId,
        },
      },
      select: { userId: true },
    });

    if (existingAccount) {
      user = await prisma.user.update({
        where: { id: existingAccount.userId },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ip,
          ...(avatar && { avatar }),
        },
        select: userSelect,
      });
    } else if (email) {
      // Un compte avec cet email existe peut-etre deja (ex: inscription classique).
      user = await prisma.user.findUnique({
        where: { email },
        select: userSelect,
      });
    }

    // Generation d'un username unique base sur l'email/nom.
    const isP2002OnUsername = (e: any) =>
      e?.code === "P2002" &&
      (Array.isArray(e?.meta?.target)
        ? e.meta.target.includes("username")
        : typeof e?.meta?.target === "string" && e.meta.target.includes("username"));

    if (!user) {
      // Nouvel utilisateur Google.
      const baseUsername =
        (email ? email.split("@")[0] : fullName || "user")
          .replace(/[^a-zA-Z0-9_]/g, "")
          .slice(0, 20) || "user";

      const baseCreateData = {
        email,
        firstName,
        lastName,
        name: fullName,
        avatar,
        emailVerified: emailVerified ? new Date() : null,
        role: "USER" as const,
        status: "ACTIVE" as const,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
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

      try {
        user = await tryCreate(baseUsername);
      } catch (e1: any) {
        if (!isP2002OnUsername(e1)) throw e1;
        const rand = Math.random().toString(36).slice(2, 6).padEnd(4, "x");
        user = await tryCreate(`${baseUsername}_${rand}`);
      }
    } else {
      // Utilisateur existant retrouve par email : on met a jour la session.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ip,
          ...(avatar && { avatar }),
          ...(emailVerified && { emailVerified: new Date() }),
        },
        select: userSelect,
      });
    }

    // 4) Upsert du compte Google (model Account) lie a l'utilisateur.
    const accountData = {
      access_token: tokenData.access_token as string,
      refresh_token: (tokenData.refresh_token as string) || null,
      expires_at: tokenData.expires_in
        ? Math.floor(Date.now() / 1000) + Number(tokenData.expires_in)
        : null,
      token_type: (tokenData.token_type as string) || null,
      scope: (tokenData.scope as string) || null,
      id_token: (tokenData.id_token as string) || null,
    };

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: googleId,
        },
      },
      create: {
        userId: user!.id,
        type: "oauth",
        provider: "google",
        providerAccountId: googleId,
        ...accountData,
      },
      update: accountData,
    });

    // 5) Creation du JWT PimPay (identique au flux Pi).
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      console.error("[PimPay] JWT_SECRET non configure");
      return NextResponse.json({ error: "Config JWT manquante" }, { status: 500 });
    }

    const secretKey = new TextEncoder().encode(SECRET);
    const token = await new SignJWT({
      id: user!.id,
      role: user!.role,
      username: user!.username,
      piUserId: user!.piUserId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secretKey);

    // Creation de la session en DB (non-bloquant).
    const userAgent = request.headers.get("user-agent") || "Google Login";
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
          deviceName: "Google Login",
          browser: "Web",
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
          title: "Connexion Google",
          message: `Connecte depuis ${city || "inconnu"}, ${country} via Google`,
          metadata: { ip, device: "Google Login" },
        },
      })
      .catch((e) => console.error("[PimPay] Notification creation error:", e));

    prisma.systemLog
      .create({
        data: {
          level: "INFO",
          source: "GOOGLE_LOGIN",
          action: "LOGIN_SUCCESS",
          message: `Connexion Google reussie pour ${user!.username}`,
          details: { userId: user!.id, username: user!.username, email },
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
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      sameSite: isProduction ? ("none" as const) : ("lax" as const),
      secure: isProduction,
      httpOnly: true,
    };

    response.cookies.set("pimpay_token", token, cookieOptions);
    response.cookies.set("token", token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error("[PimPay] Google Login Error:", error);

    if (error?.code === "P2002") {
      const target = error?.meta?.target;
      const field = Array.isArray(target) ? target.join(", ") : String(target || "champ unique");
      return NextResponse.json(
        {
          error: "Conflit d'unicite lors de la synchronisation du compte Google",
          field,
          code: "P2002",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
