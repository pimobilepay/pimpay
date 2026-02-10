export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // On accepte 'username' ou 'email' venant du frontend
    const identifier = body.username || body.email;
    const code = body.code;

    if (!identifier || !code) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const cleanId = identifier.toLowerCase().trim().replace('@', '');

    // 1. Retrouver l'utilisateur pour avoir son email réel
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanId },
          { email: identifier.toLowerCase().trim() }
        ]
      }
    });

    if (!user || !user.email) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // 2. Vérifier l'OTP associé à cet EMAIL
    const validOtp = await prisma.otp.findFirst({
      where: {
        identifier: user.email, // C'est ici que l'email continue le voyage
        code: code,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      return NextResponse.json({ error: "Cryptogramme incorrect ou expiré" }, { status: 400 });
    }

    // 3. Réponse positive pour passer à la page de nouveau mot de passe
    return NextResponse.json({ 
      success: true, 
      message: "Vérification réussie",
      data: {
        email: user.email,
        token: code // On renvoie le code comme preuve pour l'étape finale
      }
    });

  } catch (error: any) {
    console.error("VERIFY_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
