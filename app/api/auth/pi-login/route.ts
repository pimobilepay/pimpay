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

    // 1. Authentification/Création de l'utilisateur (Synchronisé avec ton schéma Prisma)
    const user = await prisma.user.upsert({
      where: { piUserId: piUserId },
      update: {
        username: username,
        lastLoginAt: new Date(),
      },
      create: {
        piUserId: piUserId,
        username: username,
        // On utilise l'ID Pi pour garantir l'unicité du téléphone si non fourni
        phone: `pi_${piUserId}`, 
        status: "ACTIVE",
        role: "USER",
        kycStatus: "NONE",
        // Initialisation du portefeuille PI dès la création
        wallets: {
          create: {
            currency: "PI",
            balance: 0,
            type: "PI"
          }
        }
      },
      include: {
        wallets: true // On récupère les wallets pour la session
      }
    });

    // 2. Génération du Token JWT pour Pimpay
    // On utilise jose pour signer un token compatible avec ton middleware
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new jose.SignJWT({ 
      id: user.id, 
      piUserId: user.piUserId,
      role: user.role 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d") // Session de 30 jours
      .sign(secret);

    // 3. Stockage du token dans les Cookies (Sécurisé)
    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: "/",
    });

    // 4. Création d'une session dans la table Session de Prisma (pour ta page /sessions)
    await prisma.session.create({
      data: {
        userId: user.id,
        token: token,
        ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: request.headers.get("user-agent"),
        isActive: true,
        lastActiveAt: new Date(),
      }
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        piUserId: user.piUserId
      } 
    });

  } catch (error: any) {
    console.error("Pimpay Login Error:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'authentification" },
      { status: 500 }
    );
  }
}
