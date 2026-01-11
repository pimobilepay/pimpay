import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose"; // Utilisation de jose à la place de jsonwebtoken

// Empêche l'analyse statique qui fait planter le build
export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- VÉRIFICATION ASYNCHRONE AVEC JOSE ---
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    // On récupère l'ID depuis le payload de jose
    const userId = payload.id as string;

    const body = await req.json();
    const { firstName, lastName, username, name, email, phone, country, birthDate } = body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        username,
        name,
        email,
        phone,
        country,
        birthDate: birthDate ? new Date(birthDate) : undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        birthDate: true,
        createdAt: true,
        role: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("PUT_USER_ERROR:", err);
    // Gestion spécifique pour jose (token expiré ou invalide)
    if (err.code === 'ERR_JWT_EXPIRED' || err.code === 'ERR_JWS_INVALID') {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
