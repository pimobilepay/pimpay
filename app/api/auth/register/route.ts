import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateWalletAddress } from "@/lib/wallet-utils";
import bcrypt from "bcryptjs";

// Schéma de validation enrichi
const registerSchema = z.object({
  name: z.string().min(2, "Le nom est trop court"),
  email: z.string().email("Format email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Le mot de passe doit faire 6 caractères minimum"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validation des données
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: validation.error.errors[0].message
      }, { status: 400 });
    }

    const { email, password, name, phone } = validation.data;

    // 2. Vérifier si l'utilisateur existe déjà (Email ou Téléphone)
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    });

    if (existing) {
      return NextResponse.json({ 
        error: "L'email ou le numéro de téléphone est déjà utilisé" 
      }, { status: 400 });
    }

    // 3. Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Création Atomique (User + Wallet + Adresse Ledger)
    // On utilise une transaction implicite via les relations Prisma
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        walletAddress: generateWalletAddress(), // ✅ Attribution adresse Web3
        role: "USER",
        status: "ACTIVE",
        wallets: {
          create: {
            balance: 0,
            currency: "PI",
            type: "PI",
          }
        },
      },
      include: {
        wallets: true
      }
    });

    // 5. Journalisation de sécurité (Optionnel selon ton schéma)
    await prisma.securityLog.create({
      data: {
        userId: newUser.id,
        action: "ACCOUNT_CREATED",
        ip: req.headers.get("x-forwarded-for") || "unknown",
      }
    });

    return NextResponse.json({ 
      success: true,
      message: "Utilisateur créé avec succès",
      data: {
        id: newUser.id,
        address: newUser.walletAddress,
        balance: newUser.wallets[0].balance
      }
    }, { status: 201 });

  } catch (error) {
    console.error("REGISTRATION_CORE_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création" }, { status: 500 });
  }
}
