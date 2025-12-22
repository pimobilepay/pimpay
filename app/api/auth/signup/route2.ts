import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const { fullName, email, phone, password, confirmPassword } = await req.json();

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Les mots de passe ne correspondent pas" }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (exists) {
      return NextResponse.json({ error: "Email ou téléphone déjà utilisé" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email,
        phone,
        password: hashedPassword,
      },
    });

    // ✅ GÉNÉRER TOKEN
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
