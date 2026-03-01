export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // On accepte username ou email pour ne pas bloquer
    const identifier = body.email || body.username;
    const { code, newPassword, password } = body;
    const finalPassword = newPassword || password;

    if (!identifier || !code || !finalPassword) {
      return NextResponse.json({ error: "Données de sécurité manquantes (Email/Code/Pass)" }, { status: 400 });
    }

    if (finalPassword.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caractères" }, { status: 400 });
    }

    const cleanId = identifier.toLowerCase().trim().replace('@', '');

    // 1. Trouver l'utilisateur
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanId }, { email: identifier.toLowerCase().trim() }]
      }
    });

    if (!user || !user.email) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 2. Vérifier si l'OTP est toujours valide pour cet email
    const validOtp = await prisma.otp.findFirst({
      where: {
        identifier: user.email,
        code: code,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      return NextResponse.json({ error: "Session de sécurité expirée ou code invalide" }, { status: 400 });
    }

    // 3. Hachage sécurisé du nouveau mot de passe avec bcrypt
    const hashedPassword = await bcrypt.hash(finalPassword, 12);

    // 4. TRANSACTION FINALE
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { 
          password: hashedPassword, 
          failedLoginAttempts: 0, 
          status: "ACTIVE" 
        },
      }),
      prisma.otp.delete({ where: { id: validOtp.id } }),
      prisma.securityLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_RESET_SUCCESS",
          ip: req.headers.get("x-forwarded-for") || "unknown",
        }
      })
    ]);

    return NextResponse.json({ success: true, message: "Mot de passe PimPay mis à jour !" });

  } catch (error: any) {
    console.error("RESET_PASSWORD_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
