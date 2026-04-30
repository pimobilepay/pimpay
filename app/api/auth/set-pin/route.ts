export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getAuthUserIdFromBearer } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserIdFromBearer(req);
    if (!userId) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { pin } = body;

    if (!pin || typeof pin !== 'string' || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "Le PIN doit contenir 6 chiffres" }, { status: 400 });
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

  } catch (error: unknown) {
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === 'P2025') {
        return NextResponse.json({ error: "Utilisateur introuvable en base de données" }, { status: 404 });
    }
    console.error("SET_PIN_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du PIN" }, { status: 500 });
  }
}
