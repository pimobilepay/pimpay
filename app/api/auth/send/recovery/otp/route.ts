export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomInt } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = body.email || body.username || body.identifier;

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
    }

    const cleanId = identifier.toLowerCase().trim().replace('@', '');

    // 1. CHERCHER PAR USERNAME OU EMAIL
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanId },
          { email: identifier.toLowerCase().trim() }
        ]
      }
    });

    if (!user || !user.email) {
      console.log(`[PIMPAY] Échec : ${cleanId} n'existe pas ou n'a pas d'email.`);
      return NextResponse.json({ error: "Utilisateur ou email introuvable" }, { status: 404 });
    }

    // 2. GÉNÉRER L'OTP POUR L'EMAIL TROUVÉ
    const otpCode = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 3. ENREGISTRER L'OTP (on utilise l'email de l'user comme identifiant)
    await prisma.otp.create({
      data: {
        identifier: user.email,
        code: otpCode,
        type: "PASSWORD_RESET",
        expiresAt: expiresAt,
      },
    });

    console.log("******************************************");
    console.log(`🚀 CODE OTP POUR ${user.username} (${user.email}) : ${otpCode}`);
    console.log("******************************************");

    return NextResponse.json({ 
      success: true, 
      message: "Code généré avec succès",
      targetEmail: user.email // On informe le frontend de l'email utilisé
    });

  } catch (error: any) {
    console.error("ERREUR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
