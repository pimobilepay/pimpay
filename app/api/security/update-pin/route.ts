export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const { newPin } = await req.json();

    // Validation du PIN (6 chiffres)
    if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      return NextResponse.json({ error: "Le PIN doit contenir exactement 6 chiffres" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    
    let userId: string | null = null;

    // 1. Pi Network session (pi_session_token contient directement le userId)
    if (piToken && piToken.length > 20) {
      userId = piToken;
    } 
    // 2. Token JWT classique via verifyJWT
    else if (classicToken) {
      const payload = await verifyJWT(classicToken);
      if (!payload) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
      userId = payload.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Hachage sécurisé du nouveau PIN
    const salt = await bcrypt.genSalt(12);
    const hashedPin = await bcrypt.hash(newPin, salt);

    // Mise à jour en base
    await prisma.user.update({
      where: { id: userId },
      data: { 
        pin: hashedPin,
        pinVersion: 2,
        pinUpdatedAt: new Date(),
      },
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
