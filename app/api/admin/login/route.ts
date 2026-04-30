import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signSessionToken } from "@/lib/jwt";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
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

    // Génération du token avec lib/jwt
    const token = await signSessionToken({ id: admin.id, role: admin.role }, "7d");

    return NextResponse.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name }
    });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "Erreur lors de la connexion" }, { status: 500 });
  }
}
