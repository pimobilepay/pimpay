export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

// Helper pour enregistrer les logs dans SystemLog
async function logToSystem(
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL",
  action: string,
  message: string,
  details?: any,
  request?: Request
) {
  try {
    await prisma.systemLog.create({
      data: {
        level,
        source: "PI_LOGIN",
        action,
        message,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
        ip: request?.headers.get("x-forwarded-for")?.split(",")[0] || null,
        userAgent: request?.headers.get("user-agent") || null,
        requestId: `pi-login-${Date.now()}`,
      },
    });
  } catch (e) {
    console.error("[LOG_TO_SYSTEM_ERROR]:", e);
  }
}

/**
 * POST /api/auth/pi-login
 * 
 * Recoit le token d'authentification Pi SDK et synchronise l'utilisateur
 * dans la base de donnees Prisma. Cree un JWT pour la session PimPay.
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = `pi-login-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // Log de debut de requete - toujours execute
  console.log(`[PimPay][${requestId}] Debut requete pi-login`);
  
  try {
    // Log initial dans SystemLog
    await logToSystem("DEBUG", "REQUEST_START", "Nouvelle requete pi-login", {
      method: request.method,
      url: request.url,
      contentType: request.headers.get("content-type"),
      userAgent: request.headers.get("user-agent")?.substring(0, 100),
      requestId,
    }, request);
    
    // 1. Parse request body
    let body: any;
    try {
      const rawBody = await request.text();
      console.log(`[PimPay][${requestId}] Raw body length: ${rawBody.length}`);
      
      if (!rawBody || rawBody.trim() === "") {
        await logToSystem("ERROR", "EMPTY_BODY", "Corps de requete vide", { requestId }, request);
        return NextResponse.json({ error: "Corps de requete vide" }, { status: 400 });
      }
      
      body = JSON.parse(rawBody);
      console.log(`[PimPay][${requestId}] Body parsed, keys: ${Object.keys(body).join(", ")}`);
    } catch (parseError: any) {
      console.error(`[PimPay][${requestId}] Parse error:`, parseError.message);
      await logToSystem("ERROR", "PARSE_BODY", "Erreur parsing JSON body", { error: parseError.message, requestId }, request);
      return NextResponse.json({ error: "Corps de requete invalide" }, { status: 400 });
    }
    
    const { accessToken, piUserId, username } = body;
    console.log(`[PimPay][${requestId}] Extracted: piUserId=${!!piUserId}, accessToken=${!!accessToken}, username=${username}`);

    // 2. Valider les donnees requises
    await logToSystem("DEBUG", "VALIDATE_INPUT", "Validation des donnees recues", {
      hasPiUserId: !!piUserId,
      hasAccessToken: !!accessToken,
      hasUsername: !!username,
      piUserIdType: typeof piUserId,
      accessTokenType: typeof accessToken,
    }, request);

    if (!piUserId || !accessToken) {
      await logToSystem("WARN", "MISSING_FIELDS", "Champs requis manquants", { piUserId: !!piUserId, accessToken: !!accessToken }, request);
      return NextResponse.json(
        { error: "UID et accessToken requis" },
        { status: 400 }
      );
    }

    // 3. Verification du token aupres de Pi Platform API
    let verifiedUser: any = null;
    try {
      await logToSystem("DEBUG", "PI_API_CALL", "Appel API Pi Network", { endpoint: "api.minepi.com/v2/me" }, request);
      
      const piRes = await fetch("https://api.minepi.com/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (piRes.ok) {
        verifiedUser = await piRes.json();
        await logToSystem("INFO", "PI_API_SUCCESS", "Utilisateur Pi verifie", { uid: verifiedUser?.uid, username: verifiedUser?.username }, request);
      } else {
        const piError = await piRes.text();
        await logToSystem("WARN", "PI_API_FAILED", "Verification Pi echouee", { status: piRes.status, error: piError }, request);
      }
    } catch (err: any) {
      await logToSystem("WARN", "PI_API_ERROR", "Erreur appel API Pi", { error: err.message }, request);
      console.warn("[PimPay] Verification Pi API echouee, fallback local:", err);
    }

    // On utilise le uid verifie si disponible, sinon le uid envoye par le client
    const finalPiUserId = verifiedUser?.uid || piUserId;
    const finalUsername = verifiedUser?.username || username;

    // 4. Upsert de l'utilisateur dans Prisma
    await logToSystem("DEBUG", "DB_UPSERT_START", "Debut upsert utilisateur", { piUserId: finalPiUserId, username: finalUsername }, request);
    
    let user: any;
    try {
      user = await prisma.user.upsert({
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
      
      await logToSystem("INFO", "DB_UPSERT_SUCCESS", "Utilisateur cree/mis a jour", { userId: user.id, username: user.username }, request);
    } catch (dbError: any) {
      await logToSystem("ERROR", "DB_UPSERT_ERROR", "Erreur upsert utilisateur", { 
        error: dbError.message, 
        code: dbError.code,
        meta: dbError.meta 
      }, request);
      throw dbError;
    }

    // 5. Creation du JWT PimPay
    await logToSystem("DEBUG", "JWT_CREATE_START", "Debut creation JWT", { userId: user.id }, request);
    
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      await logToSystem("ERROR", "JWT_SECRET_MISSING", "JWT_SECRET non configure", {}, request);
      return NextResponse.json({ error: "Config JWT manquante" }, { status: 500 });
    }

    let token: string;
    try {
      const secretKey = new TextEncoder().encode(SECRET);
      token = await new SignJWT({
        id: user.id,
        role: user.role,
        username: user.username,
        piUserId: user.piUserId,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secretKey);
      
      await logToSystem("INFO", "JWT_CREATE_SUCCESS", "JWT cree avec succes", { tokenLength: token.length }, request);
    } catch (jwtError: any) {
      await logToSystem("ERROR", "JWT_CREATE_ERROR", "Erreur creation JWT", { error: jwtError.message }, request);
      throw jwtError;
    }

    // 6. Creation de la session en DB
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
      
      await logToSystem("INFO", "SESSION_CREATED", "Session et notification creees", { userId: user.id, city, country }, request);
    } catch (sessionError: any) {
      await logToSystem("WARN", "SESSION_CREATE_ERROR", "Erreur creation session/notification", { error: sessionError.message }, request);
      // Continue meme si la session echoue
    }

    // 7. Preparer la reponse
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

    // 8. Cookies de session - compatibles Pi Browser HTTPS
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

    const duration = Date.now() - startTime;
    await logToSystem("INFO", "LOGIN_SUCCESS", "Connexion Pi reussie", { 
      userId: user.id, 
      username: user.username,
      duration: `${duration}ms`
    }, request);

    return response;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Log l'erreur dans SystemLog pour la page admin
    await logToSystem("ERROR", "LOGIN_FAILED", "Erreur connexion Pi", {
      error: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 500),
      duration: `${duration}ms`
    }, request);
    
    console.error("[PimPay] Pi Login Error:", error);
    
    let errorMessage = "Erreur de connexion. Veuillez reessayer.";
    
    if (error?.code === "P2002") {
      errorMessage = "Conflit de donnees utilisateur. Veuillez contacter le support.";
    } else if (error?.message?.includes("prisma") || error?.message?.includes("database")) {
      errorMessage = "Erreur serveur temporaire. Veuillez reessayer.";
    } else if (error?.message?.includes("fetch") || error?.message?.includes("network")) {
      errorMessage = "Erreur de connexion au serveur Pi. Veuillez reessayer.";
    } else if (error?.message?.includes("JWT") || error?.message?.includes("jwt")) {
      errorMessage = "Erreur de configuration serveur.";
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
