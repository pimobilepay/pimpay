export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose"; // ✅ Migration Jose
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ CONFIGURATION (Build-safe)
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      console.error("JWT_SECRET is missing");
      return NextResponse.json({ error: "Erreur configuration serveur" }, { status: 500 });
    }

    // 2. AUTHENTICATION
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const token = auth.split(" ")[1];
    
    // 3. VÉRIFICATION ASYNCHRONE AVEC JOSE
    let userId: string;
    try {
      const secretKey = new TextEncoder().encode(SECRET);
      const { payload } = await jwtVerify(token, secretKey);
      userId = payload.id as string;

      if (!userId) throw new Error("ID manquant");
    } catch (err) {
      return NextResponse.json({ error: "Session invalide ou expirée" }, { status: 401 });
    }

    // 4. RÉCUPÉRATION ET VALIDATION DU PIN
    const body = await req.json().catch(() => ({}));
    const { pin } = body;

    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "Le PIN doit contenir exactement 4 chiffres" }, { status: 400 });
    }

    // 5. SÉCURISATION DU PIN (Hashage)
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    // 6. MISE À JOUR PRISMA
    await prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin },
    });

    return NextResponse.json({ 
      success: true,
      message: "Code PIN configuré avec succès" 
    });

  } catch (error: any) {
    console.error("SET_PIN_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de la configuration du PIN" }, { status: 500 });
  }
}
