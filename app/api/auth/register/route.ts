import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs"; // ← IMPORTANT : bcryptjs

// POST /api/auth/register
export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe déjà
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Cet utilisateur existe déjà." },
        { status: 400 }
      );
    }

    // Hash du mot de passe avec bcryptjs
    const hashed = await bcrypt.hash(password, 10);

    // Création de l’utilisateur
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashed,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
