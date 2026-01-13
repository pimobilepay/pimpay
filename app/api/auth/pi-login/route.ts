export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { piUserId, username, accessToken } = body;

    if (!piUserId) {
      return NextResponse.json({ error: "ID Pi manquant" }, { status: 400 });
    }

    // 1. Authentification/Création de l'utilisateur
    // Utilisation de upsert pour gérer la création ou mise à jour en une seule requête
    const user = await prisma.user.upsert({
      where: { piUserId: piUserId },
      update: {
        username: username,
        lastLoginAt: new Date(),
      },
      create: {
        piUserId: piUserId,
        username: username,
        // On évite les erreurs d'unicité sur le téléphone en cas de reconnexion
        phone: `pi_${piUserId}`,
        status: "ACTIVE",
        role: "USER",
        kycStatus: "NONE",
        // Initialisation automatique du portefeuille PI
        wallets: {
          create: {
            currency: "PI",
            balance: 0,
            type: "PI"
          }
        }
      },
      include: {
        wallets: true 
      }
    });

    // 2. Génération du Token JWT
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET non défini dans les variables d'environnement");
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

    // 3. Stockage du token dans les Cookies
    const cookieStore = cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: "/",
    });

    // 4. Enregistrement de la session (Traçabilité Elara)
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
    } catch (sessionError) {
      // On ne bloque pas le login si la création de session échoue
      console.error("Session creation error:", sessionError);
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
    console.error("Pimpay Login Error:", error);
    return NextResponse.json(
      { error: "Le protocole de sécurité Elara a rencontré une erreur" },
      { status: 500 }
    );
  }
}
