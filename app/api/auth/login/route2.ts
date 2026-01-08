export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req: Request) {
  try {
    if (!JWT_SECRET) {
      console.error("ERREUR: JWT_SECRET manquant");
      return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 });
    }

    // "identifier" peut être soit l'email, soit le username
    const { email: identifier, password } = await req.json(); 
    const cleanIdentifier = identifier.toLowerCase().trim();

    // 1. Recherche de l'utilisateur (Email OU Username)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier },
          { username: cleanIdentifier }
        ]
      },
    });

    // 2. Vérification existence et mot de passe
    if (!user || !user.password) {
      console.log(`Échec: Identifiant ${cleanIdentifier} non trouvé`);
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // 3. Comparaison Bcrypt
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log(`Échec: Mot de passe incorrect pour ${cleanIdentifier}`);
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // 4. Génération du Token JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. PERSISTANCE DE LA SESSION (Pour corriger le 401 de wallet-info)
    try {
      await prisma.session.create({
        data: {
          userId: user.id,
          token: token,
          isActive: true,
          userAgent: req.headers.get("user-agent"),
          ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch (sessionError) {
      console.error("SESSION_CREATION_ERROR:", sessionError);
    }

    // 6. Logique de redirection selon le rôle
    // Admin -> /admin/dashboard | User -> /dashboard
    const redirectUrl = user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

    // 7. Enregistrement du Cookie et Réponse avec l'URL de redirection
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      redirectTo: redirectUrl // On envoie l'info au frontend
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    return response;

  } catch (error: any) {
    console.error("LOGIN_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de la connexion" }, { status: 500 });
  }
}
