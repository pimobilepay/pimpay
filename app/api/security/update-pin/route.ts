export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import * as jose from "jose";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
};

export async function PUT(req: Request) {
  try {
    const { newPin } = await req.json();

    // 1. Validation du PIN
    if (!newPin || newPin.length !== 4) {
      return NextResponse.json({ error: "Format PIN invalide" }, { status: 400 });
    }

    // 2. Essayer d'abord via cookie (session DB)
    const cookieHeader = req.headers.get("cookie");
    const cookieToken = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    // 3. Fallback sur Authorization header
    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    const token = cookieToken || bearerToken;

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 4. Trouver l'utilisateur via session DB ou JWT
    let userId: string | null = null;

    const dbSession = await prisma.session.findUnique({
      where: { token },
      select: { userId: true, isActive: true },
    });

    if (dbSession && dbSession.isActive) {
      userId = dbSession.userId;
    } else {
      const secret = getJwtSecret();
      if (secret) {
        try {
          const { payload } = await jose.jwtVerify(token, secret);
          userId = payload.id as string;
        } catch {
          return NextResponse.json({ error: "Session expirée" }, { status: 401 });
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 5. Hachage sécurisé du nouveau PIN
    const salt = await bcrypt.genSalt(12);
    const hashedPin = await bcrypt.hash(newPin, salt);

    // 6. Mise à jour en base
    await prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Code PIN PimPay mis à jour avec succès" 
    }, { status: 200 });

  } catch (error) {
    console.error("Erreur API Update-PIN:", error);
    return NextResponse.json({ 
      error: "Erreur lors de la mise à jour en base de données" 
    }, { status: 500 });
  }
}
