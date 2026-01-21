export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Erreur configuration serveur" }, { status: 500 });
    }

    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const token = auth.split(" ")[1];

    let userId: string;
    try {
      const secretKey = new TextEncoder().encode(SECRET);
      const { payload } = await jwtVerify(token, secretKey);

      // Gestion de tous les alias d'ID possibles dans le JWT
      // @ts-ignore
      userId = payload.id || payload.sub || payload.userId || payload.user?.id;

      if (!userId) {
        console.error("Payload JWT sans ID:", payload);
        return NextResponse.json({ error: "Utilisateur non identifié dans le token" }, { status: 401 });
      }
    } catch (err) {
      return NextResponse.json({ error: "Session invalide ou expirée" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { pin } = body;

    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "Le PIN doit contenir 4 chiffres" }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin },
    });

    return NextResponse.json({
      success: true,
      message: "Code PIN configuré avec succès",
      userId: updatedUser.id
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "Utilisateur introuvable en base de données" }, { status: 404 });
    }
    console.error("SET_PIN_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du PIN" }, { status: 500 });
  }
}
