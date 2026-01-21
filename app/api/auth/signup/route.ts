export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { fullName, username, email, phone, password, confirmPassword } = body;

    if (!fullName || !username || !email || !phone || !password) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    // 1. VÉRIFICATION HORS TRANSACTION (Plus rapide)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
          { phone: phone }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email, Username ou Téléphone déjà utilisé" }, { status: 400 });
    }

    // 2. HASHACHE HORS TRANSACTION (C'est ce qui prend du temps !)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const hashedPin = await bcrypt.hash("0000", salt);

    // 3. TRANSACTION AVEC TIMEOUT AUGMENTÉ (20s)
    const result = await prisma.$transaction(async (tx) => {
      // Création de l'utilisateur
      const user = await tx.user.create({
        data: {
          name: fullName,
          username: username.toLowerCase(),
          email: email.toLowerCase(),
          phone: phone,
          password: hashedPassword,
          pin: hashedPin,
          role: "USER",
          status: "ACTIVE",
          kycStatus: "NONE",
          wallets: {
            create: {
              balance: 0,
              currency: "PI",
              type: "PI",
            }
          }
        }
      });

      // Génération du token
      const secretKey = new TextEncoder().encode(SECRET);
      const token = await new SignJWT({ id: user.id, role: user.role, username: user.username })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secretKey);

      // Création de la session
      await tx.session.create({
        data: {
          userId: user.id,
          token: token,
          isActive: true,
          ip: req.headers.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1",
          userAgent: req.headers.get("user-agent") || "Unknown",
        }
      });

      return { user, token };
    }, {
      maxWait: 10000, // Attendre 10s pour obtenir une connexion
      timeout: 20000  // Laisser 20s pour exécuter le tout
    });

    const response = NextResponse.json(
      {
        success: true,
        token: result.token,
        userId: result.user.id
      },
      { status: 201 }
    );

    response.cookies.set("pi_session_token", result.token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;

  } catch (error: any) {
    console.error("SIGNUP_ERROR:", error);
    return NextResponse.json(
      { error: "Le serveur est trop occupé, réessayez dans un instant." },
      { status: 500 }
    );
  }
}
