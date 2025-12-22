import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const { fullName, email, phone, password, confirmPassword } = await req.json();

    // 1. Validation des champs
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Les mots de passe ne correspondent pas" }, { status: 400 });
    }

    // 2. Vérification d'existence
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (exists) {
      return NextResponse.json({ error: "Email ou téléphone déjà utilisé" }, { status: 400 });
    }

    // 3. Hachage du mot de passe et du code PIN
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Génération d'un PIN par défaut (ex: "0000") 
    // ou vous pouvez en générer un aléatoire : Math.floor(1000 + Math.random() * 9000).toString()
    const defaultPin = "0000"; 
    const hashedPin = await bcrypt.hash(defaultPin, 10);

    // 4. CRÉATION DE L'UTILISATEUR + SON WALLET
    // On utilise une transaction Prisma pour s'assurer que si le wallet échoue, l'utilisateur n'est pas créé
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email,
        phone,
        password: hashedPassword,
        pin: hashedPin, // ✅ AJOUT DU PIN ICI
        status: "ACTIVE",
        wallets: {
          create: {
            balance: 0,
            currency: "PI",
            type: "PI",
          }
        }
      },
      include: {
        wallets: true
      }
    });

    // 5. GÉNÉRER TOKEN
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        message: "Utilisateur créé avec succès. Votre PIN par défaut est 0000",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        token,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("ERREUR SIGNUP:", e);
    return NextResponse.json({ error: "Erreur serveur lors de l'inscription" }, { status: 500 });
  }
}
