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

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();

    if (!pin) {
      return NextResponse.json({ error: "Code PIN requis" }, { status: 400 });
    }

    // 1. Essayer d'abord via cookie (session DB)
    const cookieHeader = req.headers.get("cookie");
    const cookieToken = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    // 2. Fallback sur Authorization header
    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    const token = cookieToken || bearerToken;

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 3. Trouver l'utilisateur via session DB ou JWT
    let userId: string | null = null;

    // Essayer la session DB d'abord
    const dbSession = await prisma.session.findUnique({
      where: { token },
      select: { userId: true, isActive: true },
    });

    if (dbSession && dbSession.isActive) {
      userId = dbSession.userId;
    } else {
      // Fallback JWT decode
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pin: true },
    });

    if (!user || !user.pin) {
      return NextResponse.json({ error: "Utilisateur non trouvé ou PIN non configuré" }, { status: 404 });
    }

    // 4. Comparaison sécurisée du PIN
    const isMatch = await bcrypt.compare(pin, user.pin);

    if (isMatch) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Ancien code PIN incorrect" }, { status: 400 });
    }

  } catch (error) {
    console.error("Erreur API Verify PIN:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
