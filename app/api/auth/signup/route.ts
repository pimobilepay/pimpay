export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    // 1. VÉRIFICATION CONFIGURATION
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      console.error("ERREUR: JWT_SECRET manquant");
      return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });
    }

    // 2. RÉCUPÉRATION DES DONNÉES
    const body = await req.json().catch(() => ({}));
    const { 
      fullName, 
      username, 
      email, 
      phone, 
      country, // Nouveau champ requis
      password, 
      confirmPassword 
    } = body;

    // Validation stricte
    if (!fullName || !username || !email || !phone || !country || !password) {
      return NextResponse.json({ error: "Veuillez remplir tous les champs obligatoires" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Les mots de passe ne correspondent pas" }, { status: 400 });
    }

    // 3. VÉRIFICATION D'EXISTENCE UNIQUE
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
      let conflict = "utilisateur";
      if (existingUser.email === email.toLowerCase()) conflict = "email";
      if (existingUser.username === username.toLowerCase()) conflict = "username";
      if (existingUser.phone === phone) conflict = "numéro de téléphone";
      
      return NextResponse.json({ error: `Ce ${conflict} est déjà utilisé.` }, { status: 400 });
    }

    // 4. SÉCURISATION
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // PIN par défaut 0000 hashé selon ton exigence
    const hashedPin = await bcrypt.hash("0000", salt);

    // 5. CRÉATION ATOMIQUE (User + Wallet + Session)
    const result = await prisma.$transaction(async (tx) => {
      // Création de l'utilisateur
      const user = await tx.user.create({
        data: {
          name: fullName,
          username: username.toLowerCase(),
          email: email.toLowerCase(),
          phone: phone,
          country: country, // Enregistré dans le champ country du schéma
          password: hashedPassword,
          pin: hashedPin,
          status: "ACTIVE",
          role: "USER",
          kycStatus: "NONE",
          // Initialisation du Wallet PI
          wallets: {
            create: {
              balance: 0,
              currency: "PI",
              type: "PI",
            }
          }
        }
      });

      // Génération du Token JWT
      const secretKey = new TextEncoder().encode(SECRET);
      const token = await new SignJWT({ id: user.id, role: user.role, username: user.username })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secretKey);

      // Création de la session dans la DB
      const session = await tx.session.create({
        data: {
          userId: user.id,
          token: token,
          ip: req.headers.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1",
          userAgent: req.headers.get("user-agent") || "Unknown",
          isActive: true,
        }
      });

      return { user, token };
    });

    // 6. CONFIGURATION DU COOKIE DE SESSION
    const response = NextResponse.json(
      {
        message: "Bienvenue sur PimPay !",
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role
        }
      },
      { status: 201 }
    );

    response.cookies.set("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: "/",
    });

    return response;

  } catch (error: any) {
    console.error("SIGNUP_CRITICAL_ERROR:", error);
    return NextResponse.json(
      { error: "Le protocole Elara n'a pas pu finaliser l'inscription" },
      { status: 500 }
    );
  }
}
