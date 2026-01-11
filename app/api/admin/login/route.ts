import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose"; // On utilise jose ici

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not defined");
      return NextResponse.json({ error: "Configuration serveur incomplète" }, { status: 500 });
    }

    const { email, password } = await req.json();

    const admin = await prisma.user.findUnique({
      where: { email },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Utilisateur non autorisé" }, { status: 401 });
    }

    if (!admin.password || !(await bcrypt.compare(password, admin.password))) {
      return NextResponse.json({ error: "Mot de passe invalide" }, { status: 401 });
    }

    // --- Config avec JOSE ---
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({ id: admin.id, role: admin.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);
    // ------------------------

    return NextResponse.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Erreur lors de la connexion" }, { status: 500 });
  }
}
