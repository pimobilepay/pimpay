export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

// ✅ REMPLACE PAR TON UID PI RÉEL (trouve-le dans tes logs console : piUserId=...)
const ADMIN_UIDS = ["292ecc29-718f-437b-b4c9-ea8404539254"]; 

export async function POST(request: Request) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] 🚀 [PIMPAY-AUTH] Tentative de connexion...`);

  try {
    const body = await request.json();
    const { piUserId, username, accessToken } = body; 

    if (!piUserId) {
      return NextResponse.json({ error: "ID Pi manquant" }, { status: 400 });
    }

    // --- ÉTAPE 1: LOGIQUE DE RÔLE ---
    // On vérifie si l'utilisateur qui se connecte doit être ADMIN
    const isAdmin = ADMIN_UIDS.includes(piUserId);
    const assignedRole = isAdmin ? "ADMIN" : "USER";

    console.log(`[${timestamp}] 🔄 [DB] Synchronisation utilisateur: ${username} (Rôle assigné: ${assignedRole})`);

    let user;
    try {
      user = await prisma.user.upsert({
        where: { piUserId: piUserId },
        update: {
          username: username,
          lastLoginAt: new Date(),
          role: assignedRole, // ✅ On met à jour le rôle à chaque connexion
        },
        create: {
          piUserId: piUserId,
          username: username,
          phone: `pi_${piUserId}`,
          status: "ACTIVE",
          role: assignedRole, // ✅ Création avec le bon rôle
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
      console.log(`[${timestamp}] ✅ [DB] Utilisateur ID: ${user.id} prêt avec rôle: ${user.role}`);
    } catch (dbError: any) {
      console.error(`[${timestamp}] ❌ [DB-ERROR] Erreur Prisma:`, dbError.message);
      throw new Error(`Base de données inaccessible: ${dbError.message}`);
    }

    // --- ÉTAPE 2: GÉNÉRATION DU TOKEN JWT ---
    if (!process.env.JWT_SECRET) {
      throw new Error("Configuration JWT manquante (JWT_SECRET)");
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    
    // ✅ On inclut bien user.role pour que le middleware sache où rediriger
    const token = await new jose.SignJWT({
      id: user.id,
      piUserId: user.piUserId,
      role: user.role 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    // --- ÉTAPE 3: COOKIES ---
    const cookieStore = cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    // --- ÉTAPE 4: ENREGISTREMENT SESSION ---
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
    } catch (e) {
      console.warn(`[${timestamp}] ⚠️ Erreur session ignorée`);
    }

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
    console.error(`[${timestamp}] 💥 [CRITICAL]`, error.message);
    return NextResponse.json(
      { error: "Erreur Elara", details: error.message },
      { status: 500 }
    );
  }
}
