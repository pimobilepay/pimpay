export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET || "";
    const body = await req.json();
    const { pin, userId: bodyUserId } = body;

    // 1. RÉCUPÉRATION DE L'ID UTILISATEUR
    // On regarde d'abord dans le cookie, sinon dans le corps de la requête (cas du Login)
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    let userId = bodyUserId;

    // Si on a un token (utilisateur déjà connecté qui veut changer son PIN)
    if (token && !userId) {
       // On pourrait décoder le token ici pour avoir l'ID, 
       // mais si le front envoie le userId c'est plus simple.
    }

    if (!userId || !pin) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 2. RECHERCHE USER
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.pin) {
      return NextResponse.json({ error: "Utilisateur ou PIN non configuré" }, { status: 401 });
    }

    // 3. VÉRIFICATION
    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      return NextResponse.json({ error: "Code PIN incorrect" }, { status: 401 });
    }

    // 4. GÉNÉRATION DU TOKEN (Pour le login)
    const secretKey = new TextEncoder().encode(SECRET);
    const newToken = await new SignJWT({
        id: user.id,
        role: user.role,
        email: user.email,
        username: user.username
      })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secretKey);

    const response = NextResponse.json({
      success: true,
      message: "PIN validé",
      user: { id: user.id, role: user.role },
      redirectTo: user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard"
    });

    // 5. MISE À JOUR DES COOKIES
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24,
    };

    response.cookies.set("token", newToken, cookieOptions);
    response.cookies.set("pimpay_token", newToken, cookieOptions);

    return response;

  } catch (error) {
    console.error("VERIFY_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
