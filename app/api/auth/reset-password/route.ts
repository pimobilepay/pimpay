export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserStatus } from "@prisma/client"; // ✅ Import de l'enum Prisma

export async function POST(req: Request) {
  try {
    // ✅ Protection contre un body JSON malformé
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide" },
        { status: 400 }
      );
    }

    const identifier = (body.email || body.username) as string | undefined;
    const code = body.code as string | undefined;
    const finalPassword = (body.newPassword || body.password) as string | undefined;

    // ✅ Validation des champs requis
    if (!identifier || !code || !finalPassword) {
      return NextResponse.json(
        { error: "Données de sécurité manquantes (Email/Code/Pass)" },
        { status: 400 }
      );
    }

    if (typeof finalPassword !== "string" || finalPassword.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      );
    }

    // ✅ FIX : Plus de suppression du "@" — on nettoie juste l'identifiant
    const cleanIdentifier = identifier.toLowerCase().trim();

    // 1. Trouver l'utilisateur par email OU username (sans corruption)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdentifier },
          { username: cleanIdentifier },
        ],
      },
    });

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // 2. Vérifier l'OTP valide pour cet utilisateur
    const validOtp = await prisma.otp.findFirst({
      where: {
        identifier: user.email,
        code: String(code), // ✅ Forcer string au cas où
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      return NextResponse.json(
        { error: "Session de sécurité expirée ou code invalide" },
        { status: 400 }
      );
    }

    // 3. Hachage sécurisé du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(finalPassword, 12);

    // 4. TRANSACTION FINALE
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          failedLoginAttempts: 0,
          status: UserStatus.ACTIVE, // ✅ Enum typé Prisma
        },
      }),
      prisma.otp.delete({
        where: { id: validOtp.id },
      }),
      prisma.securityLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_RESET_SUCCESS",
          ip: req.headers.get("x-forwarded-for") ?? "unknown", // ✅ nullish coalescing
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Mot de passe PimPay mis à jour avec succès !",
    });

  } catch (error: unknown) {
    // ✅ Log COMPLET pour voir le vrai code Prisma (P2025, P2002, etc.)
    console.error("RESET_PASSWORD_ERROR — full error:", error);

    if (error instanceof Error) {
      console.error("→ message:", error.message);
      console.error("→ stack:", error.stack);
      // Prisma errors ont aussi error.code et error.meta
      const prismaErr = error as Error & { code?: string; meta?: unknown };
      if (prismaErr.code) {
        console.error("→ Prisma code:", prismaErr.code);
        console.error("→ Prisma meta:", prismaErr.meta);
      }
    }

    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}
