export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] 🚀 [PIMPAY-AUTH] Début de la tentative de connexion...`);

  try {
    const body = await request.json();
    const { piUserId, username, accessToken } = body;

    // Log des données d'entrée
    console.log(`[${timestamp}] 📥 [LOG] Données reçues: piUserId=${piUserId}, username=${username}`);

    if (!piUserId) {
      console.error(`[${timestamp}] ❌ [AUTH] Erreur: piUserId manquant dans la requête.`);
      return NextResponse.json({ error: "ID Pi manquant" }, { status: 400 });
    }

    // --- ÉTAPE 1: PRISMA UPSERT ---
    console.log(`[${timestamp}] 🔄 [DB] Synchronisation utilisateur (Prisma Upsert)...`);
    let user;
    try {
      user = await prisma.user.upsert({
        where: { piUserId: piUserId },
        update: {
          username: username,
          lastLoginAt: new Date(),
        },
        create: {
          piUserId: piUserId,
          username: username,
          phone: `pi_${piUserId}`,
          status: "ACTIVE",
          role: "USER",
          kycStatus: "NONE",
          wallets: {
            create: {
              currency: "PI",
              balance: 0,
              type: "PI"
            }
          }
        },
        include: { wallets: true }
      });
      console.log(`[${timestamp}] ✅ [DB] Utilisateur ID: ${user.id} prêt.`);
    } catch (dbError: any) {
      console.error(`[${timestamp}] ❌ [DB-ERROR] Erreur Prisma:`, dbError.message);
      throw new Error(`Base de données inaccessible: ${dbError.message}`);
    }

    // --- ÉTAPE 2: JWT ---
    console.log(`[${timestamp}] 🔑 [JWT] Signature du jeton de sécurité...`);
    if (!process.env.JWT_SECRET) {
      console.error(`[${timestamp}] ❌ [CONFIG] JWT_SECRET est manquant dans le fichier .env`);
      throw new Error("Configuration JWT manquante sur le serveur");
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new jose.SignJWT({
      id: user.id,
      piUserId: user.piUserId,
      role: user.role
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);
    console.log(`[${timestamp}] ✅ [JWT] Jeton généré avec succès.`);

    // --- ÉTAPE 3: COOKIES ---
    console.log(`[${timestamp}] 🍪 [COOKIES] Injection du cookie de session...`);
    try {
      const cookieStore = cookies();
      cookieStore.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 jours
        path: "/",
      });
      console.log(`[${timestamp}] ✅ [COOKIES] Cookie 'token' défini.`);
    } catch (cookieError: any) {
      console.error(`[${timestamp}] ❌ [COOKIE-ERROR] Impossible de définir le cookie:`, cookieError.message);
    }

    // --- ÉTAPE 4: SESSION ---
    console.log(`[${timestamp}] 📑 [SESSION] Enregistrement de la trace de connexion...`);
    try {
      await prisma.session.create({
        data: {
          userId: user.id,
          token: token,
          ip: request.headers.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "PiBrowser",
          isActive: true,
          lastActiveAt: new Date(),
        }
      });
      console.log(`[${timestamp}] ✅ [SESSION] Session enregistrée en base.`);
    } catch (sessionError: any) {
      console.warn(`[${timestamp}] ⚠️ [SESSION-WARNING] Erreur mineure session:`, sessionError.message);
    }

    console.log(`[${timestamp}] ✨ [SUCCESS] Connexion Elara validée pour @${username}`);
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        piUserId: user.piUserId
      }
    });

  } catch (error: any) {
    console.error(`[${timestamp}] 💥 [CRITICAL] Erreur lors du processus de connexion:`, error.message);
    return NextResponse.json(
      { 
        error: "Le protocole de sécurité Elara a rencontré une erreur",
        details: error.message // Détails renvoyés pour le debug local
      },
      { status: 500 }
    );
  }
}
