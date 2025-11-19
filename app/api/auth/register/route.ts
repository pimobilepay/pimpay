import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

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

    // Vérifier si email existe déjà
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé." },
        { status: 400 }
      );
    }

    // Hash du mot de passe
    const hashed = await bcrypt.hash(password, 10);

    // Insertion dans la base Prisma
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

