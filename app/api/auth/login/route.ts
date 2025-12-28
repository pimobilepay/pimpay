// app/api/auth/login/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

    const { email, password } = await req.json();

    // 1. Recherche de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }, // Nettoyage de l'email
    });

    // 2. Vérification existence et mot de passe
    if (!user || !user.password) {
      console.log(`Échec: Utilisateur ${email} non trouvé`);
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // 3. Comparaison Bcrypt
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log(`Échec: Mot de passe incorrect pour ${email}`);
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // 4. Génération du Token (Payload simple pour jose)
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Enregistrement du Cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
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
