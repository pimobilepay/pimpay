export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose"; // ✅ Migration vers Jose (Standard PimPay)
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ CONFIGURATION
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Erreur de configuration serveur" }, { status: 500 });
    }

    // 2. EXTRACTION ET VALIDATION DES DONNÉES
    const body = await req.json().catch(() => ({}));
    const { fullName, email, phone, password, confirmPassword } = body;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Les mots de passe ne correspondent pas" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères" }, { status: 400 });
    }

    // 3. VÉRIFICATION D'EXISTENCE (Optimisée)
    const userExists = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { phone: phone }
        ]
      },
    });

    if (userExists) {
      return NextResponse.json({ error: "Cet email ou ce numéro de téléphone est déjà utilisé" }, { status: 400 });
    }

    // 4. PRÉPARATION SÉCURITÉ (Hashage)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // PIN par défaut : 0000 (Hashé pour la sécurité)
    const defaultPin = "0000";
    const hashedPin = await bcrypt.hash(defaultPin, salt);

    // 5. TRANSACTION ATOMIQUE PRISMA (Robuste)
    // On crée l'utilisateur et son Wallet PI simultanément
    const newUser = await prisma.$transaction(async (tx) => {
      return await tx.user.create({
        data: {
          name: fullName,
          email: email.toLowerCase(),
          phone: phone,
          password: hashedPassword,
          pin: hashedPin,
          status: "ACTIVE",
          role: "USER",
          kycStatus: "NONE",
          // Création du Wallet PI lié (Respecte ton schéma @@unique([userId, currency]))
          wallets: {
            create: {
              balance: 0,
              currency: "PI",
              type: "PI",
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });
    });

    // 6. GÉNÉRATION DU TOKEN AVEC JOSE (Asynchrone & Future-proof)
    const secretKey = new TextEncoder().encode(SECRET);
    const token = await new SignJWT({ id: newUser.id, role: newUser.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secretKey);

    // 7. RÉPONSE FINALE
    return NextResponse.json(
      {
        message: "Compte PimPay créé avec succès.",
        instruction: "Votre code PIN par défaut est 0000. Veuillez le changer dans les paramètres.",
        user: newUser,
        token,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("CRITICAL_SIGNUP_ERROR:", error);
    
    // Gestion des erreurs de base de données (ex: violation d'unicité non captée avant)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Email, téléphone ou username déjà utilisé" }, { status: 400 });
    }

    return NextResponse.json({ error: "Erreur lors de la création du compte" }, { status: 500 });
  }
}
